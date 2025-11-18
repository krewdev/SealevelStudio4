// AI-powered signal prioritization and ranking
// Combines multiple factors to rank opportunities

import { ArbitrageOpportunity, PoolData } from './types';
import { RiskAnalysis } from './risk-analyzer';
import { Prediction } from './predictive-analytics';
import { PatternMatch } from './pattern-matcher';

export interface PrioritizedSignal {
  priority: number;
  score: number; // 0-1 composite score
  opportunity: ArbitrageOpportunity;
  riskAnalysis: RiskAnalysis;
  prediction?: Prediction;
  patternMatches: PatternMatch[];
  timeSensitivity: 'low' | 'medium' | 'high' | 'critical';
  aiReasoning: string;
  recommendedAction: 'execute_immediately' | 'execute_soon' | 'monitor' | 'skip';
  estimatedExecutionTime: number;
  requiredTip?: number;
}

export class SignalPrioritizer {
  /**
   * Prioritize signals using AI-powered scoring
   */
  prioritize(
    opportunities: ArbitrageOpportunity[],
    riskAnalyses: RiskAnalysis[],
    predictions?: Map<string, Prediction>,
    patternMatches?: Map<string, PatternMatch[]>
  ): PrioritizedSignal[] {
    const prioritized: PrioritizedSignal[] = [];

    for (let i = 0; i < opportunities.length; i++) {
      const opp = opportunities[i];
      const riskAnalysis = riskAnalyses[i];
      const prediction = predictions?.get(opp.id);
      const matches = patternMatches?.get(opp.id) || [];

      // Calculate composite score
      const score = this.calculateScore(opp, riskAnalysis, prediction, matches);

      // Determine time sensitivity
      const timeSensitivity = this.assessTimeSensitivity(opp);

      // Generate AI reasoning
      const aiReasoning = this.generateReasoning(opp, riskAnalysis, prediction, matches);

      // Determine recommended action
      const recommendedAction = this.determineAction(score, timeSensitivity, riskAnalysis);

      prioritized.push({
        priority: 0, // Will be set after sorting
        score,
        opportunity: opp,
        riskAnalysis,
        prediction,
        patternMatches: matches,
        timeSensitivity,
        aiReasoning,
        recommendedAction,
        estimatedExecutionTime: riskAnalysis.estimatedExecutionTime,
        requiredTip: riskAnalysis.requiredTip,
      });
    }

    // Sort by score
    prioritized.sort((a, b) => b.score - a.score);

    // Update priorities
    prioritized.forEach((signal, index) => {
      signal.priority = index + 1;
    });

    return prioritized;
  }

  /**
   * Calculate composite score (0-1)
   */
  private calculateScore(
    opp: ArbitrageOpportunity,
    riskAnalysis: RiskAnalysis,
    prediction?: Prediction,
    patternMatches?: PatternMatch[]
  ): number {
    // Profit score (normalized to 1 SOL max)
    const profitScore = Math.min(1, opp.profit / 1);

    // Execution probability score
    const executionScore = riskAnalysis.executionProbability;

    // Risk score (inverse - lower risk = higher score)
    const riskScore = 1 - riskAnalysis.riskScore;

    // Confidence score
    const confidenceScore = opp.confidence;

    // Pattern match score
    const patternScore = patternMatches && patternMatches.length > 0
      ? patternMatches[0].similarity * 
        (patternMatches[0].historicalPattern.finalOutcome.success ? 1 : 0.5)
      : 0.5;

    // Prediction score
    const predictionScore = prediction
      ? prediction.confidence * (prediction.direction === 'up' ? 1 : 0.8)
      : 0.5;

    // Competition score (inverse - lower competition = higher score)
    const competitionScore = riskAnalysis.competitionLevel === 'low' ? 1 :
                            riskAnalysis.competitionLevel === 'medium' ? 0.7 : 0.4;

    // Weighted composite score
    return (
      profitScore * 0.25 +
      executionScore * 0.20 +
      riskScore * 0.15 +
      confidenceScore * 0.10 +
      patternScore * 0.10 +
      predictionScore * 0.10 +
      competitionScore * 0.10
    );
  }

  /**
   * Assess time sensitivity
   */
  private assessTimeSensitivity(opp: ArbitrageOpportunity): PrioritizedSignal['timeSensitivity'] {
    if (!opp.expiresAt) return 'medium';

    const timeRemaining = opp.expiresAt.getTime() - Date.now();
    
    if (timeRemaining < 10000) return 'critical'; // < 10 seconds
    if (timeRemaining < 30000) return 'high'; // < 30 seconds
    if (timeRemaining < 60000) return 'medium'; // < 1 minute
    return 'low';
  }

  /**
   * Generate AI reasoning
   */
  private generateReasoning(
    opp: ArbitrageOpportunity,
    riskAnalysis: RiskAnalysis,
    prediction?: Prediction,
    patternMatches?: PatternMatch[]
  ): string {
    const factors: string[] = [];

    if (riskAnalysis.executionProbability > 0.7) {
      factors.push('High execution probability');
    }
    if (riskAnalysis.riskScore < 0.3) {
      factors.push('Low risk profile');
    }
    if (opp.profit > 0.1) {
      factors.push('High profit potential');
    }
    if (patternMatches && patternMatches.length > 0) {
      const successRate = patternMatches.filter(m => 
        m.historicalPattern.finalOutcome.success
      ).length / patternMatches.length;
      factors.push(`${(successRate * 100).toFixed(0)}% historical success rate`);
    }
    if (prediction && prediction.direction === 'up') {
      factors.push('Positive price prediction');
    }
    if (riskAnalysis.competitionLevel === 'low') {
      factors.push('Low competition');
    }
    if (riskAnalysis.factors.liquidity === 'sufficient') {
      factors.push('Sufficient liquidity');
    }
    if (riskAnalysis.factors.slippage === 'low') {
      factors.push('Low slippage risk');
    }

    return factors.length > 0
      ? factors.join(', ')
      : 'Moderate opportunity with balanced risk/reward';
  }

  /**
   * Determine recommended action
   */
  private determineAction(
    score: number,
    timeSensitivity: PrioritizedSignal['timeSensitivity'],
    riskAnalysis: RiskAnalysis
  ): PrioritizedSignal['recommendedAction'] {
    if (score > 0.8 && timeSensitivity === 'critical' && riskAnalysis.recommendation === 'execute') {
      return 'execute_immediately';
    }
    if (score > 0.7 && (timeSensitivity === 'high' || timeSensitivity === 'critical')) {
      return 'execute_soon';
    }
    if (score > 0.5 && riskAnalysis.recommendation !== 'skip') {
      return 'monitor';
    }
    return 'skip';
  }
}

