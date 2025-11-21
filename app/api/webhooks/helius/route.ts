/**
 * Helius Webhook Handler
 * Receives real-time transaction notifications from Helius
 * 
 * Configure webhook in Helius Dashboard:
 * https://dashboard.helius.dev/
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { CoreAIModel } from '@/app/lib/ai/core-model';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Webhook secret for authentication (set in Helius dashboard)
const WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;

// DEX Program IDs we're monitoring
const DEX_PROGRAM_IDS = new Set([
  'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc', // Orca Whirlpools
  '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM
  'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK', // Raydium CLMM
  'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', // Meteora DLMM
  'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S', // Lifinity
  'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter v6
]);

interface HeliusWebhookPayload {
  accountData?: Array<{
    account: string;
    nativeBalanceChange?: number;
    tokenBalanceChanges?: Array<{
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      tokenAccount: string;
    }>;
  }>;
  description?: string;
  events?: Array<{
    source: string;
    type: string;
    nativeTransfers?: Array<{
      amount: number;
      fromUserAccount: string;
      toUserAccount: string;
    }>;
    tokenTransfers?: Array<{
      fromTokenAccount: string;
      toTokenAccount: string;
      fromUserAccount: string;
      toUserAccount: string;
      tokenAmount: number;
      mint: string;
    }>;
  }>;
  fee?: number;
  feePayer?: string;
  instructions?: Array<{
    programId: string;
    programName?: string;
    accounts?: string[];
    data?: string;
    innerInstructions?: Array<{
      programId: string;
      accounts: string[];
      data: string;
    }>;
  }>;
  nativeTransfers?: Array<{
    amount: number;
    fromUserAccount: string;
    toUserAccount: string;
  }>;
  signature: string;
  slot: number;
  source: string;
  timestamp: number;
  tokenTransfers?: Array<{
    fromTokenAccount: string;
    toTokenAccount: string;
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: number;
    mint: string;
  }>;
  type: string;
}

interface ProcessedTransactionResult {
  signature: string;
  type: string;
  slot: number;
  timestamp: number;
  dexPrograms: string[];
  actions: Array<{ type: string; program: string }>;
  swap?: {
    inputMint: string;
    outputMint: string;
    inputAmount: number;
    outputAmount: number;
    fromAccount: string;
    toAccount: string;
  };
  poolCreation?: {
    accounts: string[];
    potentialPoolAddress?: string;
  };
  // AI Analysis Results
  aiPoolAnalysis?: string;
  aiArbitrageAnalysis?: string;
  aiPatternAnalysis?: string;
  aiRiskAssessment?: string;
  aiLiquidityAnalysis?: string;
}

/**
 * POST /api/webhooks/helius
 * Receives webhook payloads from Helius
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const payload: HeliusWebhookPayload[] = await request.json();

    if (!Array.isArray(payload)) {
      return NextResponse.json(
        { error: 'Invalid payload format' },
        { status: 400 }
      );
    }

    const results = [];

    for (const transaction of payload) {
      try {
        const result = await processTransaction(transaction);
        if (result) {
          results.push(result);
        }
      } catch (error) {
        console.error('[Helius Webhook] Error processing transaction:', error);
        // Continue processing other transactions
      }
    }

    // Return 200 OK immediately (Helius expects quick response)
    return NextResponse.json({
      success: true,
      processed: results.length,
      total: payload.length,
    });
  } catch (error) {
    console.error('[Helius Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process a single transaction from Helius webhook
 */
async function processTransaction(tx: HeliusWebhookPayload): Promise<ProcessedTransactionResult | null> {
  const { signature, type, instructions = [], tokenTransfers = [] } = tx;

  // Check if transaction involves any DEX programs
  const dexInstructions = instructions.filter(inst => 
    inst.programId && DEX_PROGRAM_IDS.has(inst.programId)
  );

  if (dexInstructions.length === 0) {
    return null; // Not a DEX transaction, skip
  }

  const result: any = {
    signature,
    type,
    slot: tx.slot,
    timestamp: tx.timestamp,
    dexPrograms: [],
    actions: [],
  };

  // Process each DEX instruction
  for (const inst of dexInstructions) {
    const programId = inst.programId;
    const programName = getProgramName(programId);
    
    result.dexPrograms.push(programName);

    // Detect action type based on instruction
    const action = detectAction(inst, programName);
    if (action) {
      result.actions.push(action);
    }
  }

  // Extract swap information if this is a swap
  if (type === 'SWAP' || result.actions.some((a: any) => a.type === 'swap')) {
    result.swap = extractSwapInfo(tx, tokenTransfers);
  }

  // Extract pool creation info
  if (result.actions.some((a: any) => a.type === 'pool_creation')) {
    result.poolCreation = extractPoolCreationInfo(tx);
  }

  // Log for debugging
  console.log('[Helius Webhook] DEX Transaction:', {
    signature,
    type,
    dexPrograms: result.dexPrograms,
    actions: result.actions,
  });

  // Initialize AI model if enabled
  let coreModel: CoreAIModel | null = null;
  if (process.env.LOCAL_AI_ENABLED === 'true') {
    try {
      coreModel = new CoreAIModel({
        enabled: true,
        endpoint: process.env.LOCAL_AI_ENDPOINT || 'http://localhost:11434',
        model: process.env.LOCAL_AI_MODEL || 'llama2',
        apiType: (process.env.LOCAL_AI_TYPE as any) || 'ollama',
        isPrimary: true,
        weight: 1.5,
      });
    } catch (error) {
      console.error('[Helius Webhook] Failed to initialize AI model:', error);
    }
  }

  // Trigger actions based on transaction type with AI analysis
  if (result.actions.some((a: any) => a.type === 'pool_creation')) {
    // New pool created - AI pool analysis
    console.log('[Helius Webhook] Pool creation detected, analyzing with AI...');
    
    if (coreModel && result.poolCreation) {
      try {
        const poolAnalysisPrompt = `Analyze this new liquidity pool creation on Solana:

Transaction: ${result.signature}
DEX: ${result.dexPrograms.join(', ')}
Slot: ${result.slot}
Timestamp: ${new Date(result.timestamp * 1000).toISOString()}
Potential Pool Address: ${result.poolCreation.potentialPoolAddress || 'Unknown'}

Provide analysis on:
1. Pool characteristics and expected behavior
2. Liquidity potential and trading volume predictions
3. Risk assessment (rug pull risk, low liquidity risk, etc.)
4. Whether this pool should be monitored for arbitrage
5. Recommended monitoring strategy

Format as: Risk Level (Low/Medium/High), Liquidity Potential, Monitoring Recommendation.`;

        const poolAnalysis = await coreModel.query(poolAnalysisPrompt);
        console.log('[Helius Webhook] AI Pool Analysis:', poolAnalysis);
        result.aiPoolAnalysis = poolAnalysis;
      } catch (error) {
        console.error('[Helius Webhook] AI pool analysis failed:', error);
      }
    }
    
    // TODO: Call pool scanner to refresh cache
    // await refreshPoolCache();
  }
  
  if (result.actions.some((a: any) => a.type === 'swap')) {
    // Swap detected - AI-powered arbitrage analysis and pattern detection
    console.log('[Helius Webhook] Swap detected, analyzing with AI...');
    
    if (coreModel && result.swap) {
      try {
        // 1. Arbitrage Opportunity Analysis
        const arbitragePrompt = `Analyze this DEX swap transaction for arbitrage opportunities:

Transaction: ${result.signature}
Type: ${result.type}
DEX: ${result.dexPrograms.join(', ')}
Input Token: ${result.swap.inputMint}
Output Token: ${result.swap.outputMint}
Input Amount: ${result.swap.inputAmount}
Output Amount: ${result.swap.outputAmount}
Swap Ratio: ${result.swap.outputAmount / result.swap.inputAmount}

Questions:
1. Does this swap create a price imbalance that could be arbitraged?
2. What is the estimated profit potential (considering fees and slippage)?
3. What are the execution risks?
4. Should we monitor this opportunity?

Provide brief analysis with profit estimate and risk level.`;

        const arbitrageAnalysis = await coreModel.query(arbitragePrompt);
        console.log('[Helius Webhook] AI Arbitrage Analysis:', arbitrageAnalysis);
        result.aiArbitrageAnalysis = arbitrageAnalysis;

        // 2. Transaction Pattern Detection
        const patternPrompt = `Analyze this swap transaction for patterns and anomalies:

Transaction: ${result.signature}
DEX: ${result.dexPrograms.join(', ')}
Input Amount: ${result.swap.inputAmount}
Output Amount: ${result.swap.outputAmount}
From Account: ${result.swap.fromAccount}
To Account: ${result.swap.toAccount}

Detect:
1. Unusual transaction patterns (whale movements, bot activity, etc.)
2. Market manipulation indicators
3. Flash loan patterns
4. Sandwich attack indicators
5. Normal vs suspicious activity classification

Provide pattern analysis with confidence level.`;

        const patternAnalysis = await coreModel.query(patternPrompt);
        console.log('[Helius Webhook] AI Pattern Detection:', patternAnalysis);
        result.aiPatternAnalysis = patternAnalysis;

        // 3. Risk Assessment
        const riskPrompt = `Perform comprehensive risk assessment for this swap transaction:

Transaction: ${result.signature}
DEX: ${result.dexPrograms.join(', ')}
Swap Details: ${result.swap.inputMint} → ${result.swap.outputMint}
Amount: ${result.swap.inputAmount}

Assess:
1. Execution risk (slippage, front-running, MEV)
2. Liquidity risk (pool depth, price impact)
3. Smart contract risk (DEX security, known vulnerabilities)
4. Market risk (volatility, token stability)
5. Overall risk score (1-10) with reasoning

Provide risk assessment with actionable recommendations.`;

        const riskAnalysis = await coreModel.query(riskPrompt);
        console.log('[Helius Webhook] AI Risk Assessment:', riskAnalysis);
        result.aiRiskAssessment = riskAnalysis;
      } catch (error) {
        console.error('[Helius Webhook] AI analysis failed:', error);
      }
    }
  }
  
  if (result.actions.some((a: any) => a.type === 'liquidity_add' || a.type === 'liquidity_remove')) {
    // Liquidity change - AI analysis
    console.log('[Helius Webhook] Liquidity change detected, analyzing with AI...');
    
    if (coreModel) {
      try {
        const liquidityPrompt = `Analyze this liquidity change transaction:

Transaction: ${result.signature}
Type: ${result.actions.find((a: any) => a.type === 'liquidity_add' || a.type === 'liquidity_remove')?.type}
DEX: ${result.dexPrograms.join(', ')}

Assess:
1. Impact on pool price and arbitrage opportunities
2. Liquidity health after this change
3. Whether this creates or closes arbitrage opportunities
4. Recommended action (monitor, ignore, execute)

Provide brief analysis.`;

        const liquidityAnalysis = await coreModel.query(liquidityPrompt);
        console.log('[Helius Webhook] AI Liquidity Analysis:', liquidityAnalysis);
        result.aiLiquidityAnalysis = liquidityAnalysis;
      } catch (error) {
        console.error('[Helius Webhook] AI liquidity analysis failed:', error);
      }
    }
    
    // TODO: Update pool state in cache
    // await updatePoolState(result);
  }

  return result;
}

/**
 * Get human-readable program name
 */
function getProgramName(programId: string): string {
  const names: Record<string, string> = {
    'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc': 'Orca Whirlpools',
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM',
    'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK': 'Raydium CLMM',
    'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo': 'Meteora DLMM',
    'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S': 'Lifinity',
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4': 'Jupiter v6',
  };
  return names[programId] || programId;
}

/**
 * Detect action type from instruction
 */
function detectAction(inst: any, programName: string): any | null {
  // Try to detect from instruction name if available
  if (inst.programName) {
    const name = inst.programName.toLowerCase();
    
    if (name.includes('initialize') || name.includes('init')) {
      return { type: 'pool_creation', program: programName };
    }
    if (name.includes('swap')) {
      return { type: 'swap', program: programName };
    }
    if (name.includes('deposit') || name.includes('addliquidity')) {
      return { type: 'liquidity_add', program: programName };
    }
    if (name.includes('withdraw') || name.includes('removeliquidity')) {
      return { type: 'liquidity_remove', program: programName };
    }
  }

  // Fallback: check accounts to infer action
  if (inst.accounts && inst.accounts.length > 0) {
    // Pool creation typically involves more accounts
    if (inst.accounts.length > 5) {
      return { type: 'pool_creation', program: programName };
    }
  }

  return null;
}

/**
 * Extract swap information from transaction
 */
function extractSwapInfo(tx: HeliusWebhookPayload, tokenTransfers: any[]) {
  if (tokenTransfers.length < 2) {
    return null;
  }

  // Find input and output tokens
  const transfers = tokenTransfers.filter(t => t.tokenAmount > 0);
  if (transfers.length < 2) {
    return null;
  }

  // First transfer is usually input, last is output
  const input = transfers[0];
  const output = transfers[transfers.length - 1];

  return {
    inputMint: input.mint,
    outputMint: output.mint,
    inputAmount: input.tokenAmount,
    outputAmount: output.tokenAmount,
    fromAccount: input.fromUserAccount,
    toAccount: output.toUserAccount,
  };
}

/**
 * Extract pool creation information
 */
function extractPoolCreationInfo(tx: HeliusWebhookPayload) {
  // Pool creation typically involves multiple accounts
  // The pool account is usually one of the accounts in the instruction
  const instructions = tx.instructions || [];
  const poolAccounts: string[] = [];

  for (const inst of instructions) {
    if (inst.accounts) {
      poolAccounts.push(...inst.accounts);
    }
  }

  return {
    accounts: poolAccounts,
    // Pool address is typically the first or second account
    potentialPoolAddress: poolAccounts[0] || poolAccounts[1],
  };
}

/**
 * GET /api/webhooks/helius
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/webhooks/helius',
    method: 'POST',
    description: 'Helius webhook receiver for DEX transaction monitoring',
    monitoredPrograms: Array.from(DEX_PROGRAM_IDS).map(id => ({
      programId: id,
      name: getProgramName(id),
    })),
  });
}

