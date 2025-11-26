/**
 * Arbitrage Scanning Results Schema
 * Structured output schema for AI models to return arbitrage scanning results
 * Compatible with Zod validation and JSON Schema
 */

import { z } from 'zod';

// ============================================
// Core Transaction Types
// ============================================

export const TokenAmountSchema = z.object({
  mint: z.string().describe('Token mint address'),
  symbol: z.string().optional().describe('Token symbol (e.g., SOL, USDC)'),
  amount: z.number().describe('Token amount'),
  decimals: z.number().default(9).describe('Token decimals'),
  valueUSD: z.number().optional().describe('USD value of the token amount'),
});

export const NFTAssetSchema = z.object({
  mint: z.string().describe('NFT mint address'),
  name: z.string().optional().describe('NFT name'),
  collection: z.string().optional().describe('Collection name'),
  imageUrl: z.string().optional().describe('NFT image URL'),
  valueSOL: z.number().optional().describe('Estimated value in SOL'),
  valueUSD: z.number().optional().describe('Estimated value in USD'),
});

export const TransactionSchema = z.object({
  signature: z.string().describe('Transaction signature/hash'),
  chain: z.enum(['solana', 'ton']).describe('Blockchain network'),
  timestamp: z.string().datetime().describe('Transaction timestamp (ISO 8601)'),
  status: z.enum(['pending', 'confirmed', 'failed', 'dropped']).describe('Transaction status'),
  type: z.enum(['swap', 'deposit', 'withdrawal', 'transfer', 'arbitrage', 'other']).describe('Transaction type'),
  from: z.string().optional().describe('Sender address'),
  to: z.string().optional().describe('Receiver address'),
  amount: z.number().optional().describe('Transaction amount'),
  token: z.string().optional().describe('Token mint/symbol'),
  fee: z.number().optional().describe('Transaction fee'),
  feeToken: z.string().default('SOL').describe('Fee token (usually SOL)'),
  metadata: z.record(z.any()).optional().describe('Additional transaction metadata'),
});

// ============================================
// Arbitrage Opportunity Types
// ============================================

export const ArbitragePathStepSchema = z.object({
  dex: z.string().describe('DEX name (e.g., Raydium, Orca)'),
  poolAddress: z.string().describe('Pool address'),
  inputToken: z.string().describe('Input token mint/symbol'),
  outputToken: z.string().describe('Output token mint/symbol'),
  inputAmount: z.number().describe('Input amount'),
  outputAmount: z.number().describe('Output amount'),
  fee: z.number().optional().describe('Swap fee percentage'),
});

export const ProbableTradeSchema = z.object({
  id: z.string().describe('Unique opportunity ID'),
  type: z.enum(['simple', 'multi_hop', 'wrap_unwrap', 'cross_protocol', 'flash_loan', 'mev']).describe('Arbitrage type'),
  path: z.array(ArbitragePathStepSchema).describe('Arbitrage path steps'),
  inputToken: z.string().describe('Starting token'),
  outputToken: z.string().describe('Ending token'),
  inputAmount: z.number().describe('Input amount'),
  estimatedOutput: z.number().describe('Estimated output amount'),
  estimatedProfit: z.number().describe('Estimated profit in SOL'),
  profitPercent: z.number().describe('Profit as percentage'),
  estimatedGasFee: z.number().describe('Estimated gas fee in SOL'),
  netProfit: z.number().describe('Net profit after fees'),
  confidence: z.number().min(0).max(1).describe('Confidence score (0-1)'),
  expiresAt: z.string().datetime().optional().describe('When opportunity expires (ISO 8601)'),
  riskLevel: z.enum(['low', 'medium', 'high']).describe('Risk level'),
  chain: z.enum(['solana', 'ton', 'cross_chain']).describe('Blockchain(s) involved'),
  detectedAt: z.string().datetime().describe('When opportunity was detected (ISO 8601)'),
});

// ============================================
// Trade Execution Types
// ============================================

export const ExecutedTradeSchema = z.object({
  id: z.string().describe('Trade execution ID'),
  opportunityId: z.string().optional().describe('Original opportunity ID if from scanning'),
  signature: z.string().describe('Transaction signature'),
  chain: z.enum(['solana', 'ton']).describe('Blockchain network'),
  type: z.enum(['simple', 'multi_hop', 'wrap_unwrap', 'cross_protocol', 'flash_loan', 'mev']).describe('Trade type'),
  path: z.array(ArbitragePathStepSchema).describe('Execution path'),
  inputToken: z.string().describe('Input token'),
  outputToken: z.string().describe('Output token'),
  inputAmount: z.number().describe('Actual input amount'),
  outputAmount: z.number().describe('Actual output amount'),
  profit: z.number().describe('Actual profit in SOL'),
  profitPercent: z.number().describe('Actual profit percentage'),
  gasFee: z.number().describe('Actual gas fee paid in SOL'),
  netProfit: z.number().describe('Net profit after fees'),
  slippage: z.number().optional().describe('Actual slippage percentage'),
  executedAt: z.string().datetime().describe('Execution timestamp (ISO 8601)'),
  status: z.enum(['confirmed', 'pending', 'failed']).describe('Execution status'),
  tokensReceived: z.array(TokenAmountSchema).optional().describe('Tokens received from trade'),
});

export const FailedTradeSchema = z.object({
  id: z.string().describe('Failed trade ID'),
  opportunityId: z.string().optional().describe('Original opportunity ID'),
  signature: z.string().optional().describe('Transaction signature (if attempted)'),
  chain: z.enum(['solana', 'ton']).describe('Blockchain network'),
  type: z.enum(['simple', 'multi_hop', 'wrap_unwrap', 'cross_protocol', 'flash_loan', 'mev']).describe('Trade type'),
  reason: z.enum([
    'insufficient_balance',
    'slippage_exceeded',
    'transaction_failed',
    'opportunity_expired',
    'gas_estimation_failed',
    'network_error',
    'pool_liquidity_changed',
    'frontrun_detected',
    'other'
  ]).describe('Failure reason'),
  errorMessage: z.string().optional().describe('Detailed error message'),
  attemptedAt: z.string().datetime().describe('When trade was attempted (ISO 8601)'),
  estimatedProfit: z.number().optional().describe('Estimated profit that was missed'),
  gasFeeLost: z.number().optional().describe('Gas fee lost on failed attempt'),
});

export const MissedTradeSchema = z.object({
  id: z.string().describe('Missed opportunity ID'),
  opportunityId: z.string().describe('Original opportunity ID'),
  type: z.enum(['simple', 'multi_hop', 'wrap_unwrap', 'cross_protocol', 'flash_loan', 'mev']).describe('Trade type'),
  reason: z.enum([
    'below_threshold',
    'insufficient_balance',
    'manual_skip',
    'risk_too_high',
    'system_busy',
    'expired',
    'other'
  ]).describe('Why trade was missed'),
  estimatedProfit: z.number().describe('Estimated profit that was missed'),
  detectedAt: z.string().datetime().describe('When opportunity was detected (ISO 8601)'),
  expiredAt: z.string().datetime().optional().describe('When opportunity expired (ISO 8601)'),
});

// ============================================
// Financial Summary Types
// ============================================

export const FinancialSummarySchema = z.object({
  solMade: z.number().describe('Total SOL profit made'),
  solDeposited: z.number().describe('Total SOL deposited'),
  solWithdrawn: z.number().optional().describe('Total SOL withdrawn'),
  gasFeesPaid: z.number().describe('Total gas fees paid in SOL'),
  netSolProfit: z.number().describe('Net SOL profit (profit - fees)'),
  specialTokensMade: z.array(TokenAmountSchema).describe('Special/rare tokens acquired'),
  nftsAcquired: z.array(NFTAssetSchema).describe('NFTs acquired during operations'),
  totalValueUSD: z.number().optional().describe('Total portfolio value in USD'),
});

// ============================================
// TON Chain Specific
// ============================================

export const TONTransactionSchema = TransactionSchema.extend({
  chain: z.literal('ton'),
  tonAmount: z.number().optional().describe('Amount in TON'),
  jettonMint: z.string().optional().describe('Jetton mint address (if applicable)'),
  messageHash: z.string().optional().describe('TON message hash'),
});

// ============================================
// Main Arbitrage Results Schema
// ============================================

export const ArbitrageScanningResultsSchema = z.object({
  // Scan metadata
  scanId: z.string().describe('Unique scan session ID'),
  scanStartTime: z.string().datetime().describe('Scan start timestamp (ISO 8601)'),
  scanEndTime: z.string().datetime().describe('Scan end timestamp (ISO 8601)'),
  scanDuration: z.number().optional().describe('Scan duration in seconds'),
  
  // Arbitrage opportunities found
  probableTrades: z.array(ProbableTradeSchema).describe('Arbitrage opportunities detected'),
  
  // Trade execution results
  tradesExecuted: z.array(ExecutedTradeSchema).describe('Successfully executed trades'),
  tradesFailed: z.array(FailedTradeSchema).describe('Failed trade attempts'),
  tradesMissed: z.array(MissedTradeSchema).describe('Missed opportunities'),
  
  // Financial summary
  financialSummary: FinancialSummarySchema.describe('Overall financial results'),
  
  // Deposits and transactions
  solanaDeposits: z.array(TransactionSchema).optional().describe('SOL deposits to Solana'),
  tonTransactions: z.array(TONTransactionSchema).optional().describe('TON chain transactions'),
  
  // Additional metadata
  chainsScanned: z.array(z.enum(['solana', 'ton'])).describe('Chains that were scanned'),
  poolsScanned: z.number().optional().describe('Number of pools scanned'),
  opportunitiesFound: z.number().optional().describe('Total opportunities found'),
  executionRate: z.number().optional().describe('Execution success rate (0-1)'),
  
  // Continuation flag
  shouldRepeat: z.boolean().default(false).describe('Whether to continue scanning'),
  repeatReason: z.string().optional().describe('Reason for repeating scan (if shouldRepeat is true)'),
  
  // Error handling
  errors: z.array(z.object({
    type: z.string(),
    message: z.string(),
    timestamp: z.string().datetime(),
  })).optional().describe('Errors encountered during scanning'),
});

// ============================================
// TypeScript Types (inferred from Zod schemas)
// ============================================

export type TokenAmount = z.infer<typeof TokenAmountSchema>;
export type NFTAsset = z.infer<typeof NFTAssetSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type ArbitragePathStep = z.infer<typeof ArbitragePathStepSchema>;
export type ProbableTrade = z.infer<typeof ProbableTradeSchema>;
export type ExecutedTrade = z.infer<typeof ExecutedTradeSchema>;
export type FailedTrade = z.infer<typeof FailedTradeSchema>;
export type MissedTrade = z.infer<typeof MissedTradeSchema>;
export type FinancialSummary = z.infer<typeof FinancialSummarySchema>;
export type TONTransaction = z.infer<typeof TONTransactionSchema>;
export type ArbitrageScanningResults = z.infer<typeof ArbitrageScanningResultsSchema>;

// ============================================
// JSON Schema Export (for AI model structured output)
// ============================================

/**
 * JSON Schema for AI model structured output
 * Use this with OpenAI function calling, Anthropic structured outputs, or LM Studio
 */
export const ArbitrageResultsJSONSchema = {
  type: 'object',
  properties: {
    scanId: { type: 'string', description: 'Unique scan session ID' },
    scanStartTime: { type: 'string', format: 'date-time', description: 'Scan start timestamp (ISO 8601)' },
    scanEndTime: { type: 'string', format: 'date-time', description: 'Scan end timestamp (ISO 8601)' },
    scanDuration: { type: 'number', description: 'Scan duration in seconds' },
    probableTrades: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['simple', 'multi_hop', 'wrap_unwrap', 'cross_protocol', 'flash_loan', 'mev'] },
          path: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                dex: { type: 'string' },
                poolAddress: { type: 'string' },
                inputToken: { type: 'string' },
                outputToken: { type: 'string' },
                inputAmount: { type: 'number' },
                outputAmount: { type: 'number' },
                fee: { type: 'number' },
              },
              required: ['dex', 'poolAddress', 'inputToken', 'outputToken', 'inputAmount', 'outputAmount'],
            },
          },
          inputToken: { type: 'string' },
          outputToken: { type: 'string' },
          inputAmount: { type: 'number' },
          estimatedOutput: { type: 'number' },
          estimatedProfit: { type: 'number' },
          profitPercent: { type: 'number' },
          estimatedGasFee: { type: 'number' },
          netProfit: { type: 'number' },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          expiresAt: { type: 'string', format: 'date-time' },
          riskLevel: { type: 'string', enum: ['low', 'medium', 'high'] },
          chain: { type: 'string', enum: ['solana', 'ton', 'cross_chain'] },
          detectedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'type', 'path', 'inputToken', 'outputToken', 'inputAmount', 'estimatedOutput', 'estimatedProfit', 'profitPercent', 'estimatedGasFee', 'netProfit', 'confidence', 'riskLevel', 'chain', 'detectedAt'],
      },
    },
    tradesExecuted: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          opportunityId: { type: 'string' },
          signature: { type: 'string' },
          chain: { type: 'string', enum: ['solana', 'ton'] },
          type: { type: 'string', enum: ['simple', 'multi_hop', 'wrap_unwrap', 'cross_protocol', 'flash_loan', 'mev'] },
          path: { type: 'array' },
          inputToken: { type: 'string' },
          outputToken: { type: 'string' },
          inputAmount: { type: 'number' },
          outputAmount: { type: 'number' },
          profit: { type: 'number' },
          profitPercent: { type: 'number' },
          gasFee: { type: 'number' },
          netProfit: { type: 'number' },
          slippage: { type: 'number' },
          executedAt: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['confirmed', 'pending', 'failed'] },
          tokensReceived: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                mint: { type: 'string' },
                symbol: { type: 'string' },
                amount: { type: 'number' },
                decimals: { type: 'number' },
                valueUSD: { type: 'number' },
              },
            },
          },
        },
        required: ['id', 'signature', 'chain', 'type', 'path', 'inputToken', 'outputToken', 'inputAmount', 'outputAmount', 'profit', 'profitPercent', 'gasFee', 'netProfit', 'executedAt', 'status'],
      },
    },
    tradesFailed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          opportunityId: { type: 'string' },
          signature: { type: 'string' },
          chain: { type: 'string', enum: ['solana', 'ton'] },
          type: { type: 'string' },
          reason: {
            type: 'string',
            enum: [
              'insufficient_balance',
              'slippage_exceeded',
              'transaction_failed',
              'opportunity_expired',
              'gas_estimation_failed',
              'network_error',
              'pool_liquidity_changed',
              'frontrun_detected',
              'other',
            ],
          },
          errorMessage: { type: 'string' },
          attemptedAt: { type: 'string', format: 'date-time' },
          estimatedProfit: { type: 'number' },
          gasFeeLost: { type: 'number' },
        },
        required: ['id', 'chain', 'type', 'reason', 'attemptedAt'],
      },
    },
    tradesMissed: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          opportunityId: { type: 'string' },
          type: { type: 'string' },
          reason: {
            type: 'string',
            enum: ['below_threshold', 'insufficient_balance', 'manual_skip', 'risk_too_high', 'system_busy', 'expired', 'other'],
          },
          estimatedProfit: { type: 'number' },
          detectedAt: { type: 'string', format: 'date-time' },
          expiredAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'opportunityId', 'type', 'reason', 'estimatedProfit', 'detectedAt'],
      },
    },
    financialSummary: {
      type: 'object',
      properties: {
        solMade: { type: 'number', description: 'Total SOL profit made' },
        solDeposited: { type: 'number', description: 'Total SOL deposited' },
        solWithdrawn: { type: 'number', description: 'Total SOL withdrawn' },
        gasFeesPaid: { type: 'number', description: 'Total gas fees paid in SOL' },
        netSolProfit: { type: 'number', description: 'Net SOL profit (profit - fees)' },
        specialTokensMade: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              mint: { type: 'string' },
              symbol: { type: 'string' },
              amount: { type: 'number' },
              decimals: { type: 'number' },
              valueUSD: { type: 'number' },
            },
          },
        },
        nftsAcquired: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              mint: { type: 'string' },
              name: { type: 'string' },
              collection: { type: 'string' },
              imageUrl: { type: 'string' },
              valueSOL: { type: 'number' },
              valueUSD: { type: 'number' },
            },
          },
        },
        totalValueUSD: { type: 'number' },
      },
      required: ['solMade', 'solDeposited', 'gasFeesPaid', 'netSolProfit', 'specialTokensMade', 'nftsAcquired'],
    },
    solanaDeposits: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          signature: { type: 'string' },
          chain: { type: 'string', enum: ['solana'] },
          timestamp: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['pending', 'confirmed', 'failed', 'dropped'] },
          type: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          amount: { type: 'number' },
          fee: { type: 'number' },
        },
      },
    },
    tonTransactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          signature: { type: 'string' },
          chain: { type: 'string', enum: ['ton'] },
          timestamp: { type: 'string', format: 'date-time' },
          status: { type: 'string' },
          type: { type: 'string' },
          tonAmount: { type: 'number' },
          jettonMint: { type: 'string' },
          messageHash: { type: 'string' },
          fee: { type: 'number' },
        },
      },
    },
    chainsScanned: {
      type: 'array',
      items: { type: 'string', enum: ['solana', 'ton'] },
    },
    poolsScanned: { type: 'number' },
    opportunitiesFound: { type: 'number' },
    executionRate: { type: 'number', minimum: 0, maximum: 1 },
    shouldRepeat: { type: 'boolean', default: false, description: 'Whether to continue scanning' },
    repeatReason: { type: 'string', description: 'Reason for repeating scan (if shouldRepeat is true)' },
    errors: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  required: [
    'scanId',
    'scanStartTime',
    'scanEndTime',
    'probableTrades',
    'tradesExecuted',
    'tradesFailed',
    'tradesMissed',
    'financialSummary',
    'chainsScanned',
    'shouldRepeat',
  ],
};

// ============================================
// Helper Functions
// ============================================

/**
 * Validate arbitrage results against schema
 */
export function validateArbitrageResults(data: unknown): ArbitrageScanningResults {
  return ArbitrageScanningResultsSchema.parse(data);
}

/**
 * Create a prompt for AI models to use this schema
 */
export function getArbitrageResultsPrompt(): string {
  return `You are an arbitrage scanning AI. Analyze arbitrage opportunities and return results in the following structured format:

${JSON.stringify(ArbitrageResultsJSONSchema, null, 2)}

Key requirements:
1. Include all detected arbitrage opportunities in probableTrades
2. Track all executed trades with actual profit/loss
3. Record failed trades with failure reasons
4. Note missed opportunities and why they were missed
5. Calculate total SOL made, gas fees paid, and net profit
6. List any special tokens or NFTs acquired
7. Include all Solana deposits and TON chain transactions
8. Set shouldRepeat to true if you recommend continuing the scan
9. Provide repeatReason if shouldRepeat is true

Return ONLY valid JSON matching this schema.`;
}

