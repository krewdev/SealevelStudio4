// Historical pattern matching for opportunity prediction
// Matches current market conditions to historical successful opportunities

import { ArbitrageOpportunity, PoolData } from './types';

export interface HistoricalPattern {
  id: string;
  timestamp: Date;
  initialConditions: {
    price: number;
    volume: number;
    liquidity: number;
    volatility: number;
  };
  finalOutcome: {
    profit: number;
    profitPercent: number;
    executionTime: number;
    success: boolean;
  };
  patternType: 'price_deviation' | 'volume_spike' | 'liquidity_imbalance' | 'new_pool';
  tokenPair: string;
  dex: string;
}

export interface PatternMatch {
  historicalPattern: HistoricalPattern;
  similarity: number; // 0-1
  predictedOutcome: {
    profit: number;
    profitPercent: number;
    successProbability: number;
  };
  confidence: number;
}

export class PatternMatcher {
  private patterns: HistoricalPattern[] = [];
  private maxPatterns = 10000; // Keep last 10k patterns

  /**
   * Add a historical pattern (called after opportunity execution)
   */
  addPattern(pattern: HistoricalPattern): void {
    this.patterns.push(pattern);
    
    // Keep only recent patterns
    if (this.patterns.length > this.maxPatterns) {
      this.patterns.shift();
    }
  }

  /**
   * Find matching patterns for current opportunity
   */
  findMatches(
    opportunity: ArbitrageOpportunity,
    pool: PoolData
  ): PatternMatch[] {
    const currentConditions = {
      price: pool.price,
      volume: pool.volume24h,
      liquidity: Number(pool.reserves.tokenA + pool.reserves.tokenB) / 1e9,
      volatility: this.calculateVolatility(pool),
    };

    const matches: PatternMatch[] = [];

    for (const pattern of this.patterns) {
      // Only match similar pattern types
      if (this.getPatternType(opportunity) !== pattern.patternType) continue;

      const similarity = this.calculateSimilarity(currentConditions, pattern.initialConditions);
      
      if (similarity > 0.7) { // 70% similarity threshold
        const predictedOutcome = this.predictOutcome(pattern, similarity);
        
        matches.push({
          historicalPattern: pattern,
          similarity,
          predictedOutcome,
          confidence: similarity * (pattern.finalOutcome.success ? 1 : 0.5),
        });
      }
    }

    // Sort by similarity
    return matches.sort((a, b) => b.similarity - a.similarity).slice(0, 10); // Top 10 matches
  }

  /**
   * Determine pattern type from opportunity
   */
  private getPatternType(opportunity: ArbitrageOpportunity): HistoricalPattern['patternType'] {
    if (opportunity.signalType === 'new_pool') return 'new_pool';
    if (opportunity.profitPercent > 5) return 'price_deviation';
    // Would need more context to determine volume_spike vs liquidity_imbalance
    return 'price_deviation';
  }

  /**
   * Calculate similarity between current and historical conditions
   */
  private calculateSimilarity(
    current: HistoricalPattern['initialConditions'],
    historical: HistoricalPattern['initialConditions']
  ): number {
    // Normalize values for comparison
    const priceSimilarity = 1 - Math.min(1, Math.abs(current.price - historical.price) / historical.price);
    const volumeSimilarity = 1 - Math.min(1, Math.abs(current.volume - historical.volume) / Math.max(historical.volume, 1));
    const liquiditySimilarity = 1 - Math.min(1, Math.abs(current.liquidity - historical.liquidity) / Math.max(historical.liquidity, 1));
    const volatilitySimilarity = 1 - Math.min(1, Math.abs(current.volatility - historical.volatility) / Math.max(historical.volatility, 0.01));

    // Weighted average
    return (
      priceSimilarity * 0.4 +
      volumeSimilarity * 0.2 +
      liquiditySimilarity * 0.2 +
      volatilitySimilarity * 0.2
    );
  }

  /**
   * Predict outcome based on historical pattern
   */
  private predictOutcome(
    pattern: HistoricalPattern,
    similarity: number
  ): PatternMatch['predictedOutcome'] {
    // Scale historical outcome by similarity
    const profit = pattern.finalOutcome.profit * similarity;
    const profitPercent = pattern.finalOutcome.profitPercent * similarity;
    const successProbability = pattern.finalOutcome.success 
      ? similarity 
      : 1 - similarity;

    return {
      profit,
      profitPercent,
      successProbability,
    };
  }

  /**
   * Calculate volatility from pool data
   */
  private calculateVolatility(pool: PoolData): number {
    if (pool.recentTrades.length < 2) return 0;
    
    const prices = pool.recentTrades.map(t => t.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance) / mean;
  }

  /**
   * Get pattern statistics
   */
  getStats(): {
    totalPatterns: number;
    successRate: number;
    averageProfit: number;
    patternsByType: Record<string, number>;
  } {
    const successful = this.patterns.filter(p => p.finalOutcome.success);
    const successRate = this.patterns.length > 0 
      ? successful.length / this.patterns.length 
      : 0;
    
    const averageProfit = this.patterns.length > 0
      ? this.patterns.reduce((sum, p) => sum + p.finalOutcome.profit, 0) / this.patterns.length
      : 0;

    const patternsByType: Record<string, number> = {};
    for (const pattern of this.patterns) {
      patternsByType[pattern.patternType] = (patternsByType[pattern.patternType] || 0) + 1;
    }

    return {
      totalPatterns: this.patterns.length,
      successRate,
      averageProfit,
      patternsByType,
    };
  }
}

// Singleton instance
export const patternMatcher = new PatternMatcher();

