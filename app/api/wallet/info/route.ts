import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export const dynamic = 'force-dynamic';

/**
 * Get wallet information and balance
 * GET /api/wallet/info?address=...
 * or
 * GET /api/wallet/info (uses wallet from session cookie)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    
    // Get wallet from session if no address provided
    const walletId = address || request.cookies.get('wallet_session')?.value;
    
    if (!walletId && !address) {
      return NextResponse.json(
        { error: 'Wallet address or session required', success: false },
        { status: 400 }
      );
    }

    const walletAddress = address || walletId;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Invalid wallet address', success: false },
        { status: 400 }
      );
    }

    // Validate address format
    try {
      new PublicKey(walletAddress);
    } catch {
      return NextResponse.json(
        { error: 'Invalid Solana address format', success: false },
        { status: 400 }
      );
    }

    // Get network from query or default to devnet
    const network = searchParams.get('network') || 'devnet';
    const rpcUrl = network === 'mainnet'
      ? (process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com')
      : (process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com');

    const connection = new Connection(rpcUrl, 'confirmed');

    // Get balance
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    // Get transaction count (optional, can be slow)
    let txCount = 0;
    try {
      const signature = await connection.getLatestBlockhash();
      // For now, we'll skip getting full transaction count as it can be slow
      // In production, you might want to cache this
    } catch (e) {
      console.warn('Could not get transaction count:', e);
    }

    return NextResponse.json({
      success: true,
      wallet: {
        address: walletAddress,
        balance: solBalance,
        balanceLamports: balance,
        network,
        transactionCount: txCount,
      },
    });
  } catch (error) {
    console.error('Wallet info error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get wallet info',
        success: false,
      },
      { status: 500 }
    );
  }
}


