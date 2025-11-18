import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PoolScanner } from '@/app/lib/pools/scanner';
import { ArbitrageDetector } from '@/app/lib/pools/arbitrage';
import { RiskAnalyzer } from '@/app/lib/pools/risk-analyzer';
import { PredictiveAnalytics } from '@/app/lib/pools/predictive-analytics';
import { patternMatcher } from '@/app/lib/pools/pattern-matcher';
import { DEFAULT_SCANNER_CONFIG } from '@/app/lib/pools/types';

export const dynamic = 'force-dynamic';

interface PrioritizedSignal {
  priority: number;
  score: number; // Composite score (0-1)
  opportunity: any;
  profit: number;
  executionProbability: number;
  riskScore: number;
  timeSensitivity: 'low' | 'medium' | 'high' | 'critical';
  aiReasoning: string;
  recommendedAction: 'execute_immediately' | 'execute_soon' | 'monitor' | 'skip';
}

export async function GET(request: NextRequest) {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const scanner = new PoolScanner();
    const state = await scanner.scan(connection);
    
    const detector = new ArbitrageDetector(state.pools, state.config, connection);
    const opportunities = await detector.detectOpportunities();
    
    const riskAnalyzer = new RiskAnalyzer();
    const analyses = riskAnalyzer.batchAnalyze(opportunities, state.pools);
    
    const predictiveAnalytics = new PredictiveAnalytics();
    
    // Prioritize signals
    const prioritizedSignals: PrioritizedSignal[] = [];
    
    for (let i = 0; i < analyses.length; i++) {
      const analysis = analyses[i];
      const opp = analysis.opportunity;
      
      // Get prediction if available
      let prediction = null;
      if (opp.steps.length > 0) {
        const pool = state.pools.find(p => p.id === opp.steps[0].pool.id);
        if (pool) {
          prediction = await predictiveAnalytics.predictPrice(pool, 60);
        }
      }

      // Get pattern matches
      let patternMatches = [];
      if (opp.steps.length > 0) {
        const pool = state.pools.find(p => p.id === opp.steps[0].pool.id);
        if (pool) {
          patternMatches = patternMatcher.findMatches(opp, pool);
        }
      }

      // Calculate composite score
      const profitScore = Math.min(1, opp.profit / 1); // Normalize to 1 SOL
      const executionScore = analysis.executionProbability;
      const riskScore = 1 - analysis.riskScore; // Inverse risk
      const confidenceScore = opp.confidence;
      const patternScore = patternMatches.length > 0 
        ? patternMatches[0].similarity * (patternMatches[0].historicalPattern.finalOutcome.success ? 1 : 0.5)
        : 0.5;
      const predictionScore = prediction ? prediction.confidence : 0.5;

      // Weighted composite score
      const compositeScore = (
        profitScore * 0.3 +
        executionScore * 0.25 +
        riskScore * 0.2 +
        confidenceScore * 0.1 +
        patternScore * 0.1 +
        predictionScore * 0.05
      );

      // Determine time sensitivity
      const timeRemaining = opp.expiresAt 
        ? opp.expiresAt.getTime() - Date.now()
        : 60000; // Default 1 minute
      
      const timeSensitivity: PrioritizedSignal['timeSensitivity'] =
        timeRemaining < 10000 ? 'critical' :
        timeRemaining < 30000 ? 'high' :
        timeRemaining < 60000 ? 'medium' :
        'low';

      // Generate AI reasoning
      const reasoningParts: string[] = [];
      if (analysis.executionProbability > 0.7) reasoningParts.push('High execution probability');
      if (analysis.riskScore < 0.3) reasoningParts.push('Low risk profile');
      if (opp.profit > 0.1) reasoningParts.push('High profit potential');
      if (patternMatches.length > 0) reasoningParts.push('Matches successful historical patterns');
      if (prediction && prediction.direction === 'up') reasoningParts.push('Positive price prediction');
      if (analysis.competitionLevel === 'low') reasoningParts.push('Low competition');
      
      const aiReasoning = reasoningParts.length > 0
        ? reasoningParts.join(', ')
        : 'Moderate opportunity with balanced risk/reward';

      // Determine recommended action
      const recommendedAction: PrioritizedSignal['recommendedAction'] =
        compositeScore > 0.8 && timeSensitivity === 'critical' ? 'execute_immediately' :
        compositeScore > 0.7 && timeSensitivity === 'high' ? 'execute_soon' :
        compositeScore > 0.5 ? 'monitor' :
        'skip';

      prioritizedSignals.push({
        priority: i + 1,
        score: compositeScore,
        opportunity: opp,
        profit: opp.profit,
        executionProbability: analysis.executionProbability,
        riskScore: analysis.riskScore,
        timeSensitivity,
        aiReasoning,
        recommendedAction,
      });
    }

    // Sort by score
    prioritizedSignals.sort((a, b) => b.score - a.score);

    // Update priorities
    prioritizedSignals.forEach((signal, index) => {
      signal.priority = index + 1;
    });

    return NextResponse.json({
      success: true,
      signals: prioritizedSignals.slice(0, 20), // Top 20
      total: prioritizedSignals.length,
      recommendedAction: prioritizedSignals[0]?.recommendedAction || 'monitor',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Signal prioritization error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to prioritize signals',
        success: false,
      },
      { status: 500 }
    );
  }
}

