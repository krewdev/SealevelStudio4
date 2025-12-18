import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getWalletContribution } from '@/app/lib/seal-token/presale';
import { DEFAULT_PRESALE_CONFIG } from '@/app/lib/seal-token/presale';

export const dynamic = 'force-dynamic';

/**
 * Check if a wallet participated in SEAL presale
 * GET /api/attestation/presale/check?wallet=...
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');
    const network = searchParams.get('network') || 'devnet';

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address required', success: false },
        { status: 400 }
      );
    }

    // Validate address format
    let wallet: PublicKey;
    try {
      wallet = new PublicKey(walletAddress);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Solana address format', success: false },
        { status: 400 }
      );
    }

    // Get RPC URL - default to devnet for demo
    const rpcUrl = network === 'mainnet'
      ? (process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com')
      : (process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com');

    const connection = new Connection(rpcUrl, 'confirmed');

    // Check presale participation
    // In a real implementation, you'd check on-chain state or a database
    // For now, we'll check if the wallet has SEAL tokens or made contributions
    
    // Option 1: Check if wallet has SEAL tokens (indicates participation)
    const sealMintAddress = process.env.NEXT_PUBLIC_SEAL_MINT_ADDRESS;
    let hasSealTokens = false;
    let solContributed = 0;

    if (sealMintAddress) {
      try {
        const { getAssociatedTokenAddress } = await import('@solana/spl-token');
        const sealMint = new PublicKey(sealMintAddress);
        const tokenAccount = await getAssociatedTokenAddress(sealMint, wallet);
        
        try {
          const { getAccount } = await import('@solana/spl-token');
          const account = await getAccount(connection, tokenAccount);
          hasSealTokens = account.amount > BigInt(0);
          
          // Estimate contribution based on token amount (rough estimate)
          // This is a simplified calculation - in production, track actual contributions
          const pricePerSeal = DEFAULT_PRESALE_CONFIG.pricePerSeal;
          const sealAmount = Number(account.amount) / Math.pow(10, 9); // Assuming 9 decimals
          solContributed = sealAmount * pricePerSeal;
        } catch {
          // Token account doesn't exist or has no balance
          hasSealTokens = false;
        }
      } catch (error) {
        console.warn('Error checking SEAL token balance:', error);
      }
    }

    // Option 2: Check treasury wallet for incoming transactions
    // This would require indexing transactions, which is more complex
    // For MVP, we'll use token balance as a proxy

    const eligible = solContributed >= 0.1; // Minimum 0.1 SOL contribution
    const solContributedLamports = Math.floor(solContributed * LAMPORTS_PER_SOL);

    return NextResponse.json({
      success: true,
      wallet: walletAddress,
      participated: hasSealTokens || eligible,
      eligible,
      hasSealTokens,
      solContributed,
      solContributedLamports,
      minimumContribution: 0.1, // 0.1 SOL minimum
      message: hasSealTokens 
        ? 'Wallet has SEAL tokens - presale participation confirmed'
        : eligible
        ? 'Wallet eligible for presale attestation'
        : 'Wallet has not participated in presale or contribution is below minimum',
    });
  } catch (error) {
    console.error('Presale check error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check presale participation',
        success: false,
      },
      { status: 500 }
    );
  }
}

