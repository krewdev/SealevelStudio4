import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PoolScanner } from '@/app/lib/pools/scanner';
import { enhancedCache } from '@/app/lib/pools/enhanced-cache';
import { DEFAULT_SCANNER_CONFIG } from '@/app/lib/pools/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const poolIds = searchParams.get('pools')?.split(',') || [];
  
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const scanner = new PoolScanner();
    
    // Check cache first
    if (poolIds.length > 0) {
      const cachedPools: any[] = [];
      let allCached = true;

      for (const poolId of poolIds) {
        const cached = enhancedCache.getPool(poolId);
        if (cached) {
          cachedPools.push(cached);
        } else {
          allCached = false;
          break;
        }
      }

      if (allCached && cachedPools.length === poolIds.length) {
        return NextResponse.json({
          success: true,
          pools: cachedPools,
          cached: true,
          timestamp: new Date().toISOString(),
        });
      }
    }

    // Scan pools
    const state = await scanner.scan(connection);

    // Filter to requested pools if specified
    let pools = state.pools;
    if (poolIds.length > 0) {
      pools = state.pools.filter(p => poolIds.includes(p.id));
    }

    // Cache pools
    for (const pool of pools) {
      // Calculate volatility for smart TTL
      const volatility = pool.recentTrades.length > 1
        ? calculateVolatility(pool)
        : 0;
      
      enhancedCache.setPool(pool.id, pool, volatility);
    }

    return NextResponse.json({
      success: true,
      pools,
      cached: false,
      totalPools: state.pools.length,
      cacheStats: enhancedCache.getStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pool monitoring error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to monitor pools',
        success: false,
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate volatility
function calculateVolatility(pool: any): number {
  if (pool.recentTrades.length < 2) return 0;
  
  const prices = pool.recentTrades.map((t: any) => t.price);
  const mean = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum: number, price: number) => 
    sum + Math.pow(price - mean, 2), 0) / prices.length;
  return Math.sqrt(variance) / mean;
}

