import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PoolScanner } from '@/app/lib/pools/scanner';
import { ArbitrageDetector } from '@/app/lib/pools/arbitrage';
import { patternMatcher } from '@/app/lib/pools/pattern-matcher';
import { DEFAULT_SCANNER_CONFIG } from '@/app/lib/pools/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const poolId = searchParams.get('poolId');
  
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const scanner = new PoolScanner();
    const state = await scanner.scan(connection);
    
    // If specific pool requested
    if (poolId) {
      const pool = state.pools.find(p => p.id === poolId);
      if (!pool) {
        return NextResponse.json(
          { error: 'Pool not found', success: false },
          { status: 404 }
        );
      }

      // Find opportunities for this pool
      const detector = new ArbitrageDetector([pool], state.config, connection);
      const opportunities = await detector.detectOpportunities();

      if (opportunities.length === 0) {
        return NextResponse.json({
          success: true,
          poolId,
          matches: [],
          stats: patternMatcher.getStats(),
        });
      }

      // Find pattern matches
      const matches = patternMatcher.findMatches(opportunities[0], pool);

      return NextResponse.json({
        success: true,
        poolId,
        currentOpportunity: opportunities[0],
        matches,
        stats: patternMatcher.getStats(),
      });
    }

    // Get all pattern statistics
    const stats = patternMatcher.getStats();

    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pattern matching error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to match patterns',
        success: false,
      },
      { status: 500 }
    );
  }
}

