import { NextRequest, NextResponse } from 'next/server';
import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { decryptWalletKey } from '@/app/lib/wallet-recovery/encryption';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/app/lib/security/rate-limit-middleware';

export const dynamic = 'force-dynamic';

/**
 * Sign a transaction with a custodial wallet
 * POST /api/wallet/sign
 * Body: { 
 *   transaction: string (base64 encoded transaction),
 *   walletId?: string (optional, uses session cookie if not provided)
 * }
 * 
 * Returns: { 
 *   success: boolean,
 *   signedTransaction: string (base64 encoded signed transaction)
 * }
 * 
 * SECURITY: 
 * - Only signs transactions for wallets owned by the current session
 * - Private key never leaves the server
 * - Transaction must be valid Solana transaction
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = withRateLimit(request, RATE_LIMIT_CONFIGS.wallet);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const body = await request.json();
    const { transaction: transactionBase64, walletId: providedWalletId } = body;

    if (!transactionBase64) {
      return NextResponse.json(
        { error: 'Transaction data required', success: false },
        { status: 400 }
      );
    }

    // Get wallet ID from request or session cookie
    const walletId = providedWalletId || request.cookies.get('wallet_session')?.value;

    if (!walletId) {
      return NextResponse.json(
        { error: 'Wallet ID or session required', success: false },
        { status: 400 }
      );
    }

    // Get encrypted key from cookie
    const encryptedKeyCookie = request.cookies.get(`wallet_${walletId}`);
    if (!encryptedKeyCookie) {
      return NextResponse.json(
        { error: 'Wallet not found in session. Please create a new wallet.', success: false },
        { status: 404 }
      );
    }

    // Decrypt the private key
    let keypair: Keypair;
    try {
      const decryptedKey = decryptWalletKey(encryptedKeyCookie.value);
      keypair = Keypair.fromSecretKey(decryptedKey);
    } catch (error) {
      console.error('Failed to decrypt wallet key:', error);
      return NextResponse.json(
        { error: 'Failed to decrypt wallet key', success: false },
        { status: 500 }
      );
    }

    // Deserialize transaction
    let transaction: Transaction | VersionedTransaction;
    try {
      const transactionBuffer = Buffer.from(transactionBase64, 'base64');
      
      // Try to deserialize as VersionedTransaction first (most common)
      try {
        transaction = VersionedTransaction.deserialize(transactionBuffer);
      } catch {
        // Fall back to legacy Transaction
        transaction = Transaction.from(transactionBuffer);
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid transaction format', success: false },
        { status: 400 }
      );
    }

    // Sign the transaction
    try {
      if (transaction instanceof VersionedTransaction) {
        transaction.sign([keypair]);
      } else {
        transaction.sign(keypair);
      }
    } catch (error) {
      console.error('Failed to sign transaction:', error);
      return NextResponse.json(
        { error: 'Failed to sign transaction', success: false },
        { status: 500 }
      );
    }

    // Serialize and return signed transaction
    const signedTransactionBase64 = transaction.serialize({ requireAllSignatures: false }).toString('base64');

    return NextResponse.json({
      success: true,
      signedTransaction: signedTransactionBase64,
      walletAddress: keypair.publicKey.toBase58(),
    });
  } catch (error) {
    console.error('Wallet sign error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to sign transaction',
        success: false,
      },
      { status: 500 }
    );
  }
}

