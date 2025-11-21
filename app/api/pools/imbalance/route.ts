import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PoolScanner } from '@/app/lib/pools/scanner';
import { ArbitrageDetector } from '@/app/lib/pools/arbitrage';
import { RiskAnalyzer } from '@/app/lib/pools/risk-analyzer';
import { PredictiveAnalytics } from '@/app/lib/pools/predictive-analytics';
import { patternMatcher } from '@/app/lib/pools/pattern-matcher';
import { GraphArbitrageDetector } from '@/app/lib/pools/graph-detector';
import { DEFAULT_SCANNER_CONFIG } from '@/app/lib/pools/types';

export const dynamic = 'force-dynamic';

export interface ImbalanceSignal {
  type: 'price_deviation' | 'liquidity_imbalance' | 'volume_spike' | 
        'oracle_drift' | 'lsd_depeg' | 'large_swap' | 'new_pool';
  severity: 'low' | 'medium' | 'high' | 'critical';
  poolId: string;
  dex: string;
  tokenPair: string;
  currentPrice: number;
  expectedPrice: number;
  deviation: number; // percentage
  timestamp: Date;
  opportunity?: {
    profit: number;
    confidence: number;
    action: string;
    executionProbability?: number;
    riskScore?: number;
    recommendation?: 'execute' | 'caution' | 'skip';
    predictedPrice?: number;
    predictionConfidence?: number;
    historicalMatches?: number;
  };
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const signalTypes = searchParams.get('types')?.split(',') || [];
  const minSeverity = searchParams.get('severity') || 'low';
  const enhanced = searchParams.get('enhanced') === 'true';
  
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const scanner = new PoolScanner();
    const state = await scanner.scan(connection);
    
    const signals: ImbalanceSignal[] = [];
    const riskAnalyzer = new RiskAnalyzer();
    const predictiveAnalytics = enhanced ? new PredictiveAnalytics() : null;
    const graphDetector = enhanced ? new GraphArbitrageDetector(state.pools, connection) : null;
    
    // 1. Price Deviation Detection (with risk analysis)
    if (!signalTypes.length || signalTypes.includes('price_deviation')) {
      const detector = new ArbitrageDetector(state.pools, state.config, connection);
      const opportunities = await detector.detectOpportunities();
      
      for (const opp of opportunities) {
        if (opp.profitPercent >= 0.5) {
          // Validate path.steps exists and has elements before doing any heavy work
          if (!opp.path?.steps || opp.path.steps.length === 0) {
            continue; // Skip this opportunity if path.steps is invalid
          }

          // Risk analysis
          const riskAnalysis = riskAnalyzer.analyzeOpportunity(opp, state.pools);
          
          // Predictive analytics
          let predictedPrice: number | undefined;
          let predictionConfidence: number | undefined;
          if (predictiveAnalytics) {
            const pool = state.pools.find(p => p.id === opp.path.steps[0].pool.id);
            if (pool) {
              const prediction = await predictiveAnalytics.predictPrice(pool, 60);
              predictedPrice = prediction.predictedPrice;
              predictionConfidence = prediction.confidence;
            }
          }

          // Pattern matching
          let historicalMatches = 0;
          const patternPool = state.pools.find(p => p.id === opp.path.steps[0].pool.id);
          if (patternPool) {
            const matches = patternMatcher.findMatches(opp, patternPool);
            historicalMatches = matches.length;
          }

          signals.push({
            type: 'price_deviation',
            severity: opp.profitPercent > 5 ? 'critical' : 
                     opp.profitPercent > 2 ? 'high' : 
                     opp.profitPercent > 1 ? 'medium' : 'low',
            poolId: opp.path.steps[0].pool.id,
            dex: opp.path.steps[0].pool.dex,
            tokenPair: `${opp.path.startToken.symbol}/${opp.path.endToken.symbol}`,
            currentPrice: opp.path.steps[0].pool.price,
            expectedPrice: opp.path.steps[opp.path.steps.length - 1].pool.price,
            deviation: opp.profitPercent,
            timestamp: new Date(),
            opportunity: {
              profit: opp.profit,
              confidence: opp.confidence,
              action: 'arbitrage',
              executionProbability: riskAnalysis.executionProbability,
              riskScore: riskAnalysis.riskScore,
              recommendation: riskAnalysis.recommendation,
              predictedPrice,
              predictionConfidence,
              historicalMatches,
            },
          });
        }
      }
    }
    
    // 2. Liquidity Imbalance Detection
    if (!signalTypes.length || signalTypes.includes('liquidity_imbalance')) {
      state.pools.forEach(pool => {
        const reserveRatio = Number(pool.reserves.tokenA) / Number(pool.reserves.tokenB);
        const expectedRatio = pool.price;
        const imbalance = Math.abs(reserveRatio - expectedRatio) / expectedRatio;
        
        if (imbalance > 0.1) {
          signals.push({
            type: 'liquidity_imbalance',
            severity: imbalance > 0.5 ? 'high' : imbalance > 0.3 ? 'medium' : 'low',
            poolId: pool.id,
            dex: pool.dex,
            tokenPair: `${pool.tokenA.symbol}/${pool.tokenB.symbol}`,
            currentPrice: pool.price,
            expectedPrice: pool.price,
            deviation: imbalance * 100,
            timestamp: new Date(),
          });
        }
      });
    }
    
    // 3. Volume Spike Detection
    if (!signalTypes.length || signalTypes.includes('volume_spike')) {
      state.pools.forEach(pool => {
        if (pool.recentTrades.length > 0) {
          const recentVolume = pool.recentTrades
            .filter(t => Date.now() - t.timestamp.getTime() < 60000)
            .reduce((sum, t) => sum + Number(t.amountIn), 0);
          
          const avgVolume = pool.volume24h / (24 * 60);
          const spike = recentVolume / avgVolume;
          
          if (spike > 5) {
            signals.push({
              type: 'volume_spike',
              severity: spike > 20 ? 'critical' : spike > 10 ? 'high' : 'medium',
              poolId: pool.id,
              dex: pool.dex,
              tokenPair: `${pool.tokenA.symbol}/${pool.tokenB.symbol}`,
              currentPrice: pool.price,
              expectedPrice: pool.price,
              deviation: (spike - 1) * 100,
              timestamp: new Date(),
            });
          }
        }
      });
    }

    // 4. Graph-based opportunities (if enhanced)
    if (enhanced && graphDetector) {
      const graphOpportunities = await graphDetector.findGraphOpportunities(
        'So11111111111111111111111111111111111111112', // SOL
        5,
        0.1
      );

      for (const opp of graphOpportunities) {
        // Validate path.steps exists and has elements before accessing
        if (!opp.path?.steps || opp.path.steps.length === 0) {
          continue; // Skip this opportunity if path.steps is invalid
        }

        signals.push({
          type: 'price_deviation',
          severity: opp.profitPercent > 2 ? 'high' : 'medium',
          poolId: opp.path.steps[0].pool.id,
          dex: opp.path.steps[0].pool.dex,
          tokenPair: `${opp.path.startToken.symbol}/${opp.path.endToken.symbol}`,
          currentPrice: opp.path.steps[0].pool.price,
          expectedPrice: opp.path.steps[opp.path.steps.length - 1].pool.price,
          deviation: opp.profitPercent,
          timestamp: new Date(),
          opportunity: {
            profit: opp.profit,
            confidence: opp.confidence,
            action: 'graph_arbitrage',
          },
        });
      }
    }
    
    // Filter by severity
    const severityLevels = { low: 0, medium: 1, high: 2, critical: 3 };
    const filteredSignals = signals.filter(s => 
      severityLevels[s.severity] >= severityLevels[minSeverity as keyof typeof severityLevels]
    );
    
    // Sort by opportunity profit (if available)
    filteredSignals.sort((a, b) => {
      const profitA = a.opportunity?.profit || 0;
      const profitB = b.opportunity?.profit || 0;
      return profitB - profitA;
    });
    
    return NextResponse.json({
      success: true,
      signals: filteredSignals,
      totalPools: state.pools.length,
      enhanced,
      metadata: {
        scanTime: Date.now(),
        signalsFound: filteredSignals.length,
        patternsMatched: filteredSignals.reduce((sum, s) => 
          sum + (s.opportunity?.historicalMatches || 0), 0
        ),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Imbalance detection error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to detect imbalances',
        success: false,
      },
      { status: 500 }
    );
  }
}

