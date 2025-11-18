import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PoolScanner } from '@/app/lib/pools/scanner';
import { GraphArbitrageDetector } from '@/app/lib/pools/graph-detector';
import { DEFAULT_SCANNER_CONFIG } from '@/app/lib/pools/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const startToken = searchParams.get('startToken') || 'So11111111111111111111111111111111111111112'; // SOL
  const maxHops = parseInt(searchParams.get('maxHops') || '5', 10);
  const minProfit = parseFloat(searchParams.get('minProfit') || '0.1', 10);
  
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const scanner = new PoolScanner();
    const state = await scanner.scan(connection);
    
    const graphDetector = new GraphArbitrageDetector(state.pools, connection);
    
    // Find graph opportunities
    const opportunities = await graphDetector.findGraphOpportunities(
      startToken,
      maxHops,
      minProfit
    );

    // Find LSD opportunities
    const lsdOpportunities = await graphDetector.findLSDOpportunities();

    // Get graph statistics
    const stats = graphDetector.getGraphStats();

    return NextResponse.json({
      success: true,
      opportunities: [...opportunities, ...lsdOpportunities],
      graphStats: stats,
      totalPools: state.pools.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Graph detection error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to detect graph opportunities',
        success: false,
      },
      { status: 500 }
    );
  }
}

