/**
 * On-Chain Pool Scanning API
 * Aggregates pools from all DEXs on-chain
 * GET /api/pools/scan - Scan and return all pools
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PoolScanner } from '@/app/lib/pools/scanner';
import { DEFAULT_SCANNER_CONFIG } from '@/app/lib/pools/types';

export const dynamic = 'force-dynamic';

/**
 * Scan for pools on-chain
 * GET /api/pools/scan?network=mainnet&dexes=orca,raydium,meteora
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const network = searchParams.get('network') || 'mainnet';
    const dexesParam = searchParams.get('dexes');
    const dexes = dexesParam ? dexesParam.split(',') : undefined;
    const includeOpportunities = searchParams.get('opportunities') === 'true';
    const minLiquidity = searchParams.get('minLiquidity') 
      ? parseFloat(searchParams.get('minLiquidity')!) 
      : undefined;

    // Get RPC endpoint - prefer Helius if API key is available
    let rpcUrl: string;
    if (network === 'mainnet') {
      if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
        // Use Helius RPC for mainnet (better rate limits)
        const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
        // Extract API key if it's a full URL
        let heliusKey = apiKey;
        if (apiKey.includes('helius-rpc.com')) {
          const match = apiKey.match(/[?&]api-key=([^&]+)/);
          heliusKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
        }
        rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
      } else {
        rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com';
      }
    } else {
      if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
        const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
        let heliusKey = apiKey;
        if (apiKey.includes('helius-rpc.com')) {
          const match = apiKey.match(/[?&]api-key=([^&]+)/);
          heliusKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
        }
        rpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusKey}`;
      } else {
        rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
      }
    }

    console.log(`[Pool Scan API] Using RPC: ${rpcUrl.replace(/api-key=[^&]+/, 'api-key=***')}`);
    const connection = new Connection(rpcUrl, 'confirmed');

    // Create scanner with config and pass RPC URL
    const scanner = new PoolScanner({ rpcUrl } as any);
    const config = {
      ...DEFAULT_SCANNER_CONFIG,
      ...(dexes && { enabledDexes: dexes as any }),
    };

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
      const { Connection } = await import('@solana/web3.js');
      
      // Create connection for arbitrage detector
      const rpcUrl = process.env.NEXT_PUBLIC_HELIUS_FAST_RPC || 
                     (process.env.NEXT_PUBLIC_HELIUS_API_KEY 
                       ? `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
                       : process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com');
      const connection = new Connection(rpcUrl, 'confirmed');
      
      // Use default scanner config
      const config = DEFAULT_SCANNER_CONFIG;
      
      const detector = new ArbitrageDetector(pools, config, connection);
      opportunities = await detector.detectOpportunities();
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
      pools,
      poolsByDex,
      opportunities,
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
    const { tokenA, tokenB, network = 'mainnet' } = body;

    if (!tokenA || !tokenB) {
      return NextResponse.json(
        { error: 'Missing required fields: tokenA, tokenB' },
        { status: 400 }
      );
    }

    // Get RPC endpoint - prefer Helius Fast RPC or standard Helius if API key is available
    let rpcUrl: string;
    if (network === 'mainnet') {
      // Check for Helius Fast RPC endpoint first
      if (process.env.NEXT_PUBLIC_HELIUS_FAST_RPC) {
        rpcUrl = process.env.NEXT_PUBLIC_HELIUS_FAST_RPC;
        // Add API key if not already in URL
        if (!rpcUrl.includes('api-key') && process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
          const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
          let heliusKey = apiKey;
          if (apiKey.includes('helius-rpc.com')) {
            const match = apiKey.match(/[?&]api-key=([^&]+)/);
            heliusKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
          }
          const separator = rpcUrl.includes('?') ? '&' : '?';
          rpcUrl = `${rpcUrl}${separator}api-key=${heliusKey}`;
        }
      } else if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
        const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
        let heliusKey = apiKey;
        if (apiKey.includes('helius-rpc.com')) {
          const match = apiKey.match(/[?&]api-key=([^&]+)/);
          heliusKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
        }
        rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
      } else {
        rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com';
      }
    } else {
      if (process.env.NEXT_PUBLIC_HELIUS_FAST_RPC) {
        rpcUrl = process.env.NEXT_PUBLIC_HELIUS_FAST_RPC;
        if (!rpcUrl.includes('api-key') && process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
          const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
          let heliusKey = apiKey;
          let hostnameIsHelius = false;
          try {
            const urlObj = new URL(apiKey);
            // Check for exact hostname match (optionally allow devnet prefix)
            hostnameIsHelius = urlObj.hostname === 'helius-rpc.com' || urlObj.hostname === 'devnet.helius-rpc.com';
          } catch (e) {
            // Not a URL, ignore
          }
          if (hostnameIsHelius) {
            const match = apiKey.match(/[?&]api-key=([^&]+)/);
            heliusKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
          }
          const separator = rpcUrl.includes('?') ? '&' : '?';
          rpcUrl = `${rpcUrl}${separator}api-key=${heliusKey}`;
        }
      } else if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
        const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
        let heliusKey = apiKey;
        if (apiKey.includes('helius-rpc.com')) {
          const match = apiKey.match(/[?&]api-key=([^&]+)/);
          heliusKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
        }
        rpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusKey}`;
      } else {
        rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';
      }
    }

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
      pools: matchingPools,
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

