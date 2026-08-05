/**
 * On-Chain Pool Scanning API
 * Aggregates pools from all DEXs on-chain
 * GET /api/pools/scan - Scan and return all pools
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PoolScanner } from '@/app/lib/pools/scanner';
import { DEFAULT_SCANNER_CONFIG } from '@/app/lib/pools/types';
import { getSolanaRpcUrl, redactRpc } from '@/app/lib/quicknode/rpc';

export const dynamic = 'force-dynamic';

function jsonSafe(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(jsonSafe);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = jsonSafe(v);
    }
    return out;
  }
  return value;
}

/**
 * Scan for pools on-chain
 * GET /api/pools/scan?network=mainnet&dexes=orca,raydium,meteora
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const network = searchParams.get('network') || 'devnet';
    const dexesParam = searchParams.get('dexes');
    const dexes = dexesParam ? dexesParam.split(',') : undefined;
    const includeOpportunities = searchParams.get('opportunities') === 'true';
    const minLiquidity = searchParams.get('minLiquidity') 
      ? parseFloat(searchParams.get('minLiquidity')!) 
      : undefined;

    const rpcUrl = getSolanaRpcUrl(network);

    console.log(`[Pool Scan API] Using RPC: ${redactRpc(rpcUrl)}`);
    const connection = new Connection(rpcUrl, 'confirmed');

    const config = {
      ...DEFAULT_SCANNER_CONFIG,
      ...(dexes && { enabledDEXs: dexes as any }),
    };
    const scanner = new PoolScanner({ ...config, rpcUrl });

    // Scan for pools
    const startTime = Date.now();
    console.log(`[Pool Scan API] Starting scan on ${network}...`);
    console.log(`[Pool Scan API] Enabled DEXes: ${config.enabledDEXs.join(', ')}`);
    
    let scanResult;
    try {
      scanResult = await scanner.scan(connection);
    } catch (error) {
      console.error('[Pool Scan API] Scan error:', error);
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Scan failed',
          stats: {
            totalPools: 0,
            poolsByDex: {},
            totalLiquidity: 0,
            scanDuration: Date.now() - startTime,
            network,
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }
    
    const scanDuration = Date.now() - startTime;
    console.log(`[Pool Scan API] Scan completed in ${scanDuration}ms, found ${scanResult.pools.length} pools`);
    
    if (scanResult.errors && scanResult.errors.length > 0) {
      console.warn('[Pool Scan API] Scan errors:', scanResult.errors);
    }

    // Filter by minimum liquidity if specified
    let pools = scanResult.pools;
    if (minLiquidity) {
      pools = pools.filter(pool => {
        // Calculate liquidity from reserves (convert bigint to number for calculation)
        const reserveA = Number(pool.reserves.tokenA) / Math.pow(10, pool.tokenA.decimals);
        const reserveB = Number(pool.reserves.tokenB) / Math.pow(10, pool.tokenB.decimals);
        const liquidity = reserveA * pool.price + reserveB * (1 / pool.price);
        return liquidity >= minLiquidity;
      });
    }

    // Get opportunities if requested
    let opportunities = undefined;
    if (includeOpportunities) {
      const { ArbitrageDetector } = await import('@/app/lib/pools/arbitrage');
      const { DEFAULT_SCANNER_CONFIG } = await import('@/app/lib/pools/types');

      const connection = new Connection(getSolanaRpcUrl(network), 'confirmed');
      
      // Use default scanner config
      const config = DEFAULT_SCANNER_CONFIG;
      
      const detector = new ArbitrageDetector(pools, config, connection);
      const detected = await detector.detectOpportunities();
      const { verifyOpportunitiesWithJupiter } = await import('@/app/lib/arbitrage/quote-verify');
      const sliced = detected.slice(0, 75);
      try {
        opportunities = await verifyOpportunitiesWithJupiter(sliced, 12);
      } catch (verifyErr) {
        console.warn('[Pool Scan API] quote verify skipped', verifyErr);
        opportunities = sliced;
      }
    }

    // Group pools by DEX
    const poolsByDex: Record<string, typeof pools> = {};
    for (const pool of pools) {
      if (!poolsByDex[pool.dex]) {
        poolsByDex[pool.dex] = [];
      }
      poolsByDex[pool.dex].push(pool);
    }

    // Calculate statistics
    const stats = {
      totalPools: pools.length,
      poolsByDex: Object.fromEntries(
        Object.entries(poolsByDex).map(([dex, dexPools]) => [dex, dexPools.length])
      ),
      totalLiquidity: pools.reduce((sum, pool) => {
        // Calculate liquidity from reserves (convert bigint to number for calculation)
        const reserveA = Number(pool.reserves.tokenA) / Math.pow(10, pool.tokenA.decimals);
        const reserveB = Number(pool.reserves.tokenB) / Math.pow(10, pool.tokenB.decimals);
        const liquidity = reserveA * pool.price + reserveB * (1 / pool.price);
        return sum + liquidity;
      }, 0),
      scanDuration,
      network,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      stats,
      pools: jsonSafe(pools),
      poolsByDex: jsonSafe(poolsByDex),
      opportunities: jsonSafe(opportunities),
      errors: scanResult.errors,
    });
  } catch (error) {
    console.error('Pool scanning error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Get pools for specific token pair
 * GET /api/pools/scan?tokenA=...&tokenB=...
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tokenA, tokenB, network = 'devnet' } = body;

    if (!tokenA || !tokenB) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenA, tokenB' },
        { status: 400 }
      );
    }

    const rpcUrl = getSolanaRpcUrl(network);
    const connection = new Connection(rpcUrl, 'confirmed');

    // Scan for pools - pass RPC URL to scanner
    const scanner = new PoolScanner({ rpcUrl } as any);
    const scanResult = await scanner.scan(connection);

    // Filter pools for specific token pair
    const matchingPools = scanResult.pools.filter(pool => {
      const poolTokens = [pool.tokenA.mint.toLowerCase(), pool.tokenB.mint.toLowerCase()];
      const searchTokens = [tokenA.toLowerCase(), tokenB.toLowerCase()];
      return (
        (poolTokens.includes(searchTokens[0]) && poolTokens.includes(searchTokens[1]))
      );
    });

    return NextResponse.json({
      success: true,
      tokenA,
      tokenB,
      pools: jsonSafe(matchingPools),
      count: matchingPools.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Pool search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

