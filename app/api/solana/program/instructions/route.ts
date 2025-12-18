// API route to get program instructions/transactions
// GET /api/solana/program/instructions?programId=<address>&limit=<number>&before=<signature>&until=<signature>

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateSolanaAddress } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

/**
 * Get recent instructions/transactions for a program
 * 
 * Query params:
 * - programId: Program address (required)
 * - limit: Maximum number of transactions (default: 10, max: 1000)
 * - before: Transaction signature to fetch before (optional)
 * - until: Transaction signature to fetch until (optional)
 * - commitment: 'finalized' | 'confirmed' | 'processed' (default: 'confirmed')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programIdParam = searchParams.get('programId');
    const limitParam = searchParams.get('limit');
    const before = searchParams.get('before');
    const until = searchParams.get('until');
    const commitment = (searchParams.get('commitment') || 'confirmed') as 'finalized' | 'confirmed' | 'processed';

    // Validate program ID
    if (!programIdParam) {
      return NextResponse.json(
        { error: 'programId is required' },
        { status: 400 }
      );
    }

    const programIdValidation = validateSolanaAddress(programIdParam);
    if (!programIdValidation.valid) {
      return NextResponse.json(
        { error: programIdValidation.error || 'Invalid program ID format' },
        { status: 400 }
      );
    }

    const programId = new PublicKey(programIdParam);

    // Parse limit
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 1000) : 10;
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be a positive number <= 1000' },
        { status: 400 }
      );
    }

    // Get RPC connection - use devnet for demo
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_RPC_URL || 
                   (process.env.NEXT_PUBLIC_HELIUS_API_KEY 
                     ? `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
                     : 'https://api.devnet.solana.com');
    
    const connection = new Connection(rpcUrl, commitment);

    // Get signatures
    const signatures = await connection.getSignaturesForAddress(programId, {
      limit,
      before: before || undefined,
      until: until || undefined,
    });

    // Get transaction details (limited to first 10 for performance)
    const transactionDetails = await Promise.all(
      signatures.slice(0, 10).map(async (sigInfo) => {
        try {
          const tx = await connection.getTransaction(sigInfo.signature, {
            maxSupportedTransactionVersion: 0,
            commitment: commitment === 'processed' ? 'confirmed' : commitment,
          });

          if (!tx) return null;

          return {
            signature: sigInfo.signature,
            slot: sigInfo.slot,
            blockTime: sigInfo.blockTime,
            err: sigInfo.err,
            memo: (tx.transaction.message as any).memo ? Buffer.from((tx.transaction.message as any).memo).toString('utf8') : null,
            instructions: tx.transaction.message.compiledInstructions?.map(ix => ({
              programIdIndex: ix.programIdIndex,
              accounts: ix.accountKeyIndexes,
              data: Buffer.from(ix.data).toString('base64'),
            })) || [],
          };
        } catch (error) {
          console.error(`Error fetching transaction ${sigInfo.signature}:`, error);
          return {
            signature: sigInfo.signature,
            slot: sigInfo.slot,
            blockTime: sigInfo.blockTime,
            err: sigInfo.err,
            error: error instanceof Error ? error.message : 'Failed to fetch transaction',
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      programId: programId.toString(),
      total: signatures.length,
      signatures: signatures.map(sig => ({
        signature: sig.signature,
        slot: sig.slot,
        blockTime: sig.blockTime,
        err: sig.err,
        confirmationStatus: sig.confirmationStatus,
      })),
      transactions: transactionDetails.filter(tx => tx !== null),
    });
  } catch (error) {
    console.error('Error fetching program instructions:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch program instructions',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

