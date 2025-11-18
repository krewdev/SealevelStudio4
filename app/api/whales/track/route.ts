import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { WhaleTracker } from '@/app/lib/whales/tracker';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  const limit = parseInt(searchParams.get('limit') || '10', 10);
  
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const tracker = new WhaleTracker(connection);
    
    // If specific address requested
    if (address) {
      const whale = await tracker.trackWhale(address);
      if (!whale) {
        return NextResponse.json(
          { error: 'Address not found or not a whale', success: false },
          { status: 404 }
        );
      }

      // Predict next action
      const prediction = await tracker.predictWhaleAction(address);

      return NextResponse.json({
        success: true,
        whale,
        prediction,
      });
    }

    // Get top whales
    const topWhales = tracker.getTopWhales(limit);
    
    // Predict actions for top whales
    const predictions = await Promise.all(
      topWhales.map(whale => tracker.predictWhaleAction(whale.address))
    );

    return NextResponse.json({
      success: true,
      whales: topWhales,
      predictions: predictions.filter(p => p !== null),
      total: topWhales.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Whale tracking error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to track whales',
        success: false,
      },
      { status: 500 }
    );
  }
}

