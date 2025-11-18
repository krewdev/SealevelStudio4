import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PoolScanner } from '@/app/lib/pools/scanner';
import { PredictiveAnalytics } from '@/app/lib/pools/predictive-analytics';
import { DEFAULT_SCANNER_CONFIG } from '@/app/lib/pools/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const poolIds = searchParams.get('pools')?.split(',') || [];
  const timeHorizon = parseInt(searchParams.get('timeHorizon') || '60', 10);
  
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const scanner = new PoolScanner();
    const state = await scanner.scan(connection);
    
    const predictiveAnalytics = new PredictiveAnalytics();
    
    // If specific pools requested, filter to those
    let poolsToPredict = state.pools;
    if (poolIds.length > 0) {
      poolsToPredict = state.pools.filter(p => poolIds.includes(p.id));
    }

    // Limit to top 50 pools by volume for performance
    poolsToPredict = poolsToPredict
      .sort((a, b) => b.volume24h - a.volume24h)
      .slice(0, 50);

    // Add historical data points (simplified - would use actual historical data)
    for (const pool of poolsToPredict) {
      // Add current state as history point
      predictiveAnalytics.addHistoryPoint(pool.id, {
        timestamp: new Date(),
        price: pool.price,
        volume: pool.volume24h,
        liquidity: Number(pool.reserves.tokenA + pool.reserves.tokenB) / 1e9,
      });
    }

    // Batch predict
    const predictions = await predictiveAnalytics.batchPredict(poolsToPredict, timeHorizon);
    
    // Detect anomalies
    const anomalies = poolsToPredict.flatMap(pool => {
      const detected = predictiveAnalytics.detectAnomalies(pool);
      return detected.map(anomaly => ({
        poolId: pool.id,
        tokenPair: `${pool.tokenA.symbol}/${pool.tokenB.symbol}`,
        ...anomaly,
      }));
    });

    return NextResponse.json({
      success: true,
      predictions,
      anomalies,
      timeHorizon,
      totalPools: poolsToPredict.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Prediction error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate predictions',
        success: false,
      },
      { status: 500 }
    );
  }
}

