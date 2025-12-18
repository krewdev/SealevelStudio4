import { NextRequest, NextResponse } from 'next/server';
import { Connection, Transaction, VersionedTransaction, PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

/**
 * Helius Jito Transaction Sender
 * Sends low-latency transactions to Jito Block Engine via Helius API
 * Includes staking/tip for transaction inclusion priority
 */

interface JitoSendRequest {
  transaction: string; // Base64 encoded transaction
  tipAmount?: number; // Tip amount in lamports (default: 10,000)
  tipAccount?: string; // Jito tip account (optional, uses default if not provided)
  tipAccounts?: string[]; // List of Jito tip accounts to choose from
  skipPreflight?: boolean; // Skip preflight checks (default: false)
  maxRetries?: number; // Maximum retry attempts (default: 3)
}

interface JitoSendResponse {
  success: boolean;
  signature?: string;
  bundleId?: string;
  slot?: number;
  error?: string;
}

// Default Jito tip accounts (official accounts for staking)
// These are the known Jito tip accounts - user can provide their own list
const DEFAULT_JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZ8Nonsp8qrdNiy',
  '4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE',
  'D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ',
  '9bnz4RShgq1hAnLnZbP8kbgBg1kEmcJBYQq3gQbmnSta',
  '5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn',
  '2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD',
  '2q5pghRs6arqVjRvT5gfgWfWcHWmw1ZuCzphgd5KfWGJ',
  'wyvPkWjVZz1M8fHQnMMCDTQDbkManefNNhweYk5WkcF',
  '3KCKozbAaF75qEU33jtzozcJ29yJuaLJTy2jFdzUY8bT',
  '4vieeGHPYPG2MmyPRcYjdiDmmhN3ww7hsFNap8pVN3Ey',
  '4TQLFNWK8AovT1gFvda5jfw2oJeRMKEmw7aH6MGBJ3or', // Mainnet tip account 1
  // Add more default tip accounts here
];

// Default tip amount (10,000 lamports = 0.00001 SOL)
const DEFAULT_TIP_AMOUNT = 10_000;

/**
 * Select a tip account from the list (round-robin or random selection)
 */
function selectTipAccount(tipAccounts: string[]): PublicKey {
  if (tipAccounts.length === 0) {
    // Fallback to default
    return new PublicKey(DEFAULT_JITO_TIP_ACCOUNTS[0]);
  }
  
  // Use round-robin selection based on current time
  const index = Math.floor(Date.now() / 1000) % tipAccounts.length;
  return new PublicKey(tipAccounts[index]);
}

export async function POST(request: NextRequest) {
  try {
    const body: JitoSendRequest = await request.json();
    const { transaction, tipAmount, tipAccount, tipAccounts, skipPreflight = false, maxRetries = 3 } = body;

    if (!transaction) {
      return NextResponse.json(
        { success: false, error: 'Transaction is required' },
        { status: 400 }
      );
    }

    // Get Helius API key
    const heliusApiKey = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    if (!heliusApiKey) {
      return NextResponse.json(
        { success: false, error: 'Helius API key not configured' },
        { status: 500 }
      );
    }

    // Parse transaction
    let parsedTx: Transaction | VersionedTransaction;
    try {
      const txBuffer = Buffer.from(transaction, 'base64');
      // Try to parse as VersionedTransaction first
      try {
        parsedTx = VersionedTransaction.deserialize(txBuffer);
      } catch {
        // Fallback to legacy Transaction
        parsedTx = Transaction.from(txBuffer);
      }
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: `Invalid transaction format: ${error.message}` },
        { status: 400 }
      );
    }

    // Get tip account - use provided account, or select from list, or use default
    let tipPubkey: PublicKey;
    if (tipAccount) {
      tipPubkey = new PublicKey(tipAccount);
    } else if (tipAccounts && tipAccounts.length > 0) {
      tipPubkey = selectTipAccount(tipAccounts);
    } else {
      // Use default tip accounts
      tipPubkey = selectTipAccount(DEFAULT_JITO_TIP_ACCOUNTS);
    }

    // Add tip instruction if tip amount is provided
    const finalTipAmount = tipAmount || DEFAULT_TIP_AMOUNT;
    if (finalTipAmount > 0 && parsedTx instanceof Transaction) {
      // Get fee payer from transaction
      const feePayer = parsedTx.feePayer;
      if (feePayer) {
        const tipInstruction = SystemProgram.transfer({
          fromPubkey: feePayer,
          toPubkey: tipPubkey,
          lamports: finalTipAmount,
        });
        parsedTx.add(tipInstruction);
      }
    }

    // Use Helius fast sender endpoint for low-latency transaction submission
    // This endpoint is optimized for sending transactions to Jito and validators
    const heliusFastRpcUrl = process.env.NEXT_PUBLIC_HELIUS_FAST_RPC || `https://ewr-sender.helius-rpc.com/fast?api-key=${heliusApiKey}`;
    const heliusRpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
    
    // Use standard RPC for getting blockhash (more reliable)
    const connection = new Connection(heliusRpcUrl, 'confirmed');
    
    // Create fast connection for sending transactions
    const fastConnection = new Connection(heliusFastRpcUrl, 'confirmed');

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    
    // Set blockhash on transaction
    if (parsedTx instanceof Transaction) {
      parsedTx.recentBlockhash = blockhash;
      if (!parsedTx.feePayer) {
        return NextResponse.json(
          { success: false, error: 'Transaction must have a fee payer' },
          { status: 400 }
        );
      }
    } else {
      // VersionedTransaction - blockhash is set during construction
      // We'll need to rebuild if blockhash is stale
    }

    // Serialize transaction
    const serializedTx = parsedTx instanceof Transaction
      ? parsedTx.serialize({ requireAllSignatures: false, verifySignatures: false })
      : Buffer.from(parsedTx.serialize());

    // Send to Jito via Helius
    // Helius provides a direct endpoint for Jito bundle submission
    const heliusJitoUrl = `https://api.helius.xyz/v0/transactions/?api-key=${heliusApiKey}`;
    
    // For Jito bundles, we need to send to Jito Block Engine
    // Helius can proxy this, but we'll use direct Jito endpoint for better control
    const jitoBlockEngineUrl = 'https://mainnet.block-engine.jito.wtf/api/v1/bundles';
    
    // Create bundle payload (Jito expects base64 encoded transactions in an array)
    const bundlePayload = {
      jsonrpc: '2.0',
      id: 1,
      method: 'sendBundle',
      params: [[serializedTx.toString('base64')]],
    };

    // Send to Jito Block Engine
    let bundleResponse;
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < maxRetries) {
      try {
        bundleResponse = await fetch(jitoBlockEngineUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bundlePayload),
        });

        if (bundleResponse.ok) {
          break;
        }

        const errorText = await bundleResponse.text();
        lastError = new Error(`Jito API error (${bundleResponse.status}): ${errorText}`);
        
        // Don't retry on 4xx errors (client errors)
        if (bundleResponse.status >= 400 && bundleResponse.status < 500) {
          break;
        }

        attempts++;
        if (attempts < maxRetries) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      } catch (error: any) {
        lastError = error;
        attempts++;
        if (attempts < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
        }
      }
    }

    if (!bundleResponse || !bundleResponse.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: lastError?.message || 'Failed to send bundle to Jito after retries' 
        },
        { status: 500 }
      );
    }

    const bundleData = await bundleResponse.json();
    const bundleId = bundleData.result?.bundleId || bundleData.result;

    // Also send transaction via Helius fast sender endpoint for redundancy
    // This ensures the transaction is submitted even if Jito bundle fails
    // The fast sender endpoint (ewr-sender.helius-rpc.com/fast) provides low-latency submission
    let signature: string | undefined;
    try {
      // Use Helius fast sender endpoint for low-latency submission to Jito/validators
      const sendResponse = await fastConnection.sendRawTransaction(serializedTx, {
        skipPreflight,
        maxRetries: 1, // Only one retry since we're using Jito
      });
      signature = sendResponse;
    } catch (error: any) {
      console.warn('Failed to send transaction via standard RPC:', error.message);
      // Continue even if standard send fails - Jito bundle might succeed
    }

    // Wait for confirmation (optional, can be done client-side)
    let slot: number | undefined;
    if (signature) {
      try {
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        // Get slot from transaction status
        const status = await connection.getSignatureStatus(signature);
        slot = status.value?.slot || undefined;
      } catch (error) {
        // Confirmation timeout is okay - transaction might still be processing
        console.warn('Transaction confirmation timeout:', error);
      }
    }

    return NextResponse.json({
      success: true,
      signature,
      bundleId,
      slot,
      tipAmount: finalTipAmount,
      tipAccount: tipPubkey.toString(),
    } as JitoSendResponse);

  } catch (error: any) {
    console.error('Error in Jito send endpoint:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check bundle status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bundleId = searchParams.get('bundleId');
    const signature = searchParams.get('signature');

    if (!bundleId && !signature) {
      return NextResponse.json(
        { success: false, error: 'bundleId or signature is required' },
        { status: 400 }
      );
    }

    // Get Helius API key
    const heliusApiKey = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    if (!heliusApiKey) {
      return NextResponse.json(
        { success: false, error: 'Helius API key not configured' },
        { status: 500 }
      );
    }

    const heliusRpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`;
    const connection = new Connection(heliusRpcUrl, 'confirmed');

    // Check bundle status via Jito
    if (bundleId) {
      const jitoStatusUrl = `https://mainnet.block-engine.jito.wtf/api/v1/bundles/${bundleId}`;
      try {
        const statusResponse = await fetch(jitoStatusUrl);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          return NextResponse.json({
            success: true,
            bundleId,
            status: statusData.result?.confirmationStatus || 'pending',
            slot: statusData.result?.slot,
          });
        }
      } catch (error: any) {
        console.warn('Failed to check Jito bundle status:', error);
      }
    }

    // Check transaction status via Helius
    if (signature) {
      try {
        const txStatus = await connection.getSignatureStatus(signature);
        return NextResponse.json({
          success: true,
          signature,
          status: txStatus?.value?.confirmationStatus || 'pending',
          slot: txStatus?.value?.slot,
          err: txStatus?.value?.err,
        });
      } catch (error: any) {
        return NextResponse.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { success: false, error: 'Unable to check status' },
      { status: 500 }
    );

  } catch (error: any) {
    console.error('Error checking bundle/transaction status:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

