// Predictive analytics for price movements and opportunity forecasting
// Uses pattern recognition and ML techniques to predict future prices

import { PoolData } from './types';

interface PriceHistory {
  timestamp: Date;
  price: number;
  volume: number;
  liquidity: number;
}

export interface Prediction {
  poolId: string;
  tokenPair: string;
  currentPrice: number;
  predictedPrice: number;
  confidence: number;
  timeHorizon: number; // seconds
  factors: string[];
  direction: 'up' | 'down' | 'stable';
  magnitude: number; // percentage change
}

interface PatternMatch {
  historicalPattern: {
    date: Date;
    initialPrice: number;
    finalPrice: number;
    duration: number;
    outcome: 'profitable' | 'unprofitable';
  };
  similarity: number;
  predictedOutcome: 'profitable' | 'unprofitable';
  confidence: number;
}

export class PredictiveAnalytics {
  private historicalData: Map<string, PriceHistory[]> = new Map();
  private patterns: Map<string, PatternMatch[]> = new Map();

  /**
   * Predict price movement for a pool
   */
  async predictPrice(
    pool: PoolData,
    timeHorizon: number = 60 // seconds
  ): Promise<Prediction> {
    const history = this.historicalData.get(pool.id) || [];
    
    if (history.length < 10) {
      // Not enough data for prediction
      return {
        poolId: pool.id,
        tokenPair: `${pool.tokenA.symbol}/${pool.tokenB.symbol}`,
        currentPrice: pool.price,
        predictedPrice: pool.price,
        confidence: 0,
        timeHorizon,
        factors: ['insufficient_data'],
        direction: 'stable',
        magnitude: 0,
      };
    }

    // Extract features
    const recentPrices = history.slice(-20).map(h => h.price);
    const recentVolumes = history.slice(-20).map(h => h.volume);
    const recentLiquidity = history.slice(-20).map(h => h.liquidity);

    // Calculate indicators
    const trend = this.calculateTrend(recentPrices);
    const volatility = this.calculateVolatility(recentPrices);
    const volumeTrend = this.calculateTrend(recentVolumes);
    const liquidityTrend = this.calculateTrend(recentLiquidity);
    const momentum = this.calculateMomentum(recentPrices);

    // Predict price using simple ML model (can be enhanced with actual ML)
    const predictedPrice = this.predictUsingIndicators(
      pool.price,
      trend,
      volatility,
      volumeTrend,
      liquidityTrend,
      momentum,
      timeHorizon
    );

    const direction = predictedPrice > pool.price ? 'up' : predictedPrice < pool.price ? 'down' : 'stable';
    const magnitude = Math.abs((predictedPrice - pool.price) / pool.price) * 100;

    // Calculate confidence based on data quality and pattern matches
    const patternMatches = this.findPatternMatches(pool, history);
    const confidence = this.calculateConfidence(
      history.length,
      volatility,
      patternMatches.length > 0 ? patternMatches[0].similarity : 0
    );

    const factors: string[] = [];
    if (trend > 0.1) factors.push('uptrend');
    if (trend < -0.1) factors.push('downtrend');
    if (volatility > 0.05) factors.push('high_volatility');
    if (volumeTrend > 0.2) factors.push('volume_increase');
    if (momentum > 0.1) factors.push('positive_momentum');
    if (patternMatches.length > 0) factors.push('pattern_match');

    return {
      poolId: pool.id,
      tokenPair: `${pool.tokenA.symbol}/${pool.tokenB.symbol}`,
      currentPrice: pool.price,
      predictedPrice,
      confidence,
      timeHorizon,
      factors,
      direction,
      magnitude,
    };
  }

  /**
   * Calculate price trend
   */
  private calculateTrend(prices: number[]): number {
    if (prices.length < 2) return 0;
    const first = prices[0];
    const last = prices[prices.length - 1];
    return (last - first) / first;
  }

  /**
   * Calculate volatility (standard deviation)
   */
  private calculateVolatility(prices: number[]): number {
    if (prices.length < 2) return 0;
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance) / mean;
  }

  /**
   * Calculate momentum (rate of change)
   */
  private calculateMomentum(prices: number[]): number {
    if (prices.length < 5) return 0;
    const short = prices.slice(-5);
    const long = prices.slice(-10, -5);
    const shortAvg = short.reduce((a, b) => a + b, 0) / short.length;
    const longAvg = long.reduce((a, b) => a + b, 0) / long.length;
    return (shortAvg - longAvg) / longAvg;
  }

  /**
   * Predict price using technical indicators
   */
  private predictUsingIndicators(
    currentPrice: number,
    trend: number,
    volatility: number,
    volumeTrend: number,
    liquidityTrend: number,
    momentum: number,
    timeHorizon: number
  ): number {
    // Simple linear model (can be replaced with actual ML model)
    const trendComponent = trend * (timeHorizon / 60); // Scale by time
    const momentumComponent = momentum * 0.5;
    const volumeComponent = volumeTrend > 0 ? volumeTrend * 0.1 : 0;
    
    // Volatility adjustment (higher vol = less predictable)
    const volatilityAdjustment = 1 - Math.min(volatility, 0.5);
    
    const predictedChange = (trendComponent + momentumComponent + volumeComponent) * volatilityAdjustment;
    return currentPrice * (1 + predictedChange);
  }

  /**
   * Find matching historical patterns
   */
  private findPatternMatches(
    pool: PoolData,
    history: PriceHistory[]
  ): PatternMatch[] {
    if (history.length < 20) return [];

    const recentPattern = {
      prices: history.slice(-10).map(h => h.price),
      volumes: history.slice(-10).map(h => h.volume),
      liquidity: history.slice(-10).map(h => h.liquidity),
    };

    // Compare with historical patterns (simplified - would use actual pattern DB)
    const matches: PatternMatch[] = [];

    // This would query a database of historical patterns
    // For now, return empty array (would be populated with actual pattern matching)

    return matches;
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(
    dataPoints: number,
    volatility: number,
    patternSimilarity: number
  ): number {
    // More data = higher confidence
    const dataConfidence = Math.min(1, dataPoints / 50);
    
    // Lower volatility = higher confidence
    const volatilityConfidence = Math.max(0, 1 - volatility * 2);
    
    // Pattern match = higher confidence
    const patternConfidence = patternSimilarity;

    // Weighted average
    return (dataConfidence * 0.4 + volatilityConfidence * 0.4 + patternConfidence * 0.2);
  }

  /**
   * Add historical data point
   */
  addHistoryPoint(poolId: string, history: PriceHistory): void {
    if (!this.historicalData.has(poolId)) {
      this.historicalData.set(poolId, []);
    }
    const historyArray = this.historicalData.get(poolId)!;
    historyArray.push(history);
    
    // Keep only last 1000 points
    if (historyArray.length > 1000) {
      historyArray.shift();
    }
  }

  /**
   * Batch predict for multiple pools
   */
  async batchPredict(
    pools: PoolData[],
    timeHorizon: number = 60
  ): Promise<Prediction[]> {
    const predictions = await Promise.all(
      pools.map(pool => this.predictPrice(pool, timeHorizon))
    );
    
    // Sort by confidence and magnitude
    return predictions
      .filter(p => p.confidence > 0.3) // Filter low confidence
      .sort((a, b) => {
        const scoreA = a.confidence * a.magnitude;
        const scoreB = b.confidence * b.magnitude;
        return scoreB - scoreA;
      });
  }

  /**
   * Detect anomalies that might indicate opportunities
   */
  detectAnomalies(pool: PoolData): {
    type: 'price_spike' | 'volume_surge' | 'liquidity_drop' | 'unusual_pattern';
    severity: 'low' | 'medium' | 'high';
    description: string;
    confidence: number;
  }[] {
    const history = this.historicalData.get(pool.id) || [];
    if (history.length < 10) return [];

    const anomalies: any[] = [];
    const recent = history.slice(-10);

    // Check for price spike
    const avgPrice = recent.reduce((sum, h) => sum + h.price, 0) / recent.length;
    const latestPrice = recent[recent.length - 1].price;
    const priceChange = Math.abs((latestPrice - avgPrice) / avgPrice);

    if (priceChange > 0.1) {
      anomalies.push({
        type: 'price_spike' as const,
        severity: priceChange > 0.3 ? 'high' : priceChange > 0.2 ? 'medium' : 'low',
        description: `${(priceChange * 100).toFixed(2)}% price deviation from average`,
        confidence: Math.min(1, priceChange * 2),
      });
    }

    // Check for volume surge
    const avgVolume = recent.slice(0, -1).reduce((sum, h) => sum + h.volume, 0) / (recent.length - 1);
    const latestVolume = recent[recent.length - 1].volume;
    const volumeChange = latestVolume / avgVolume;

    if (volumeChange > 5) {
      anomalies.push({
        type: 'volume_surge' as const,
        severity: volumeChange > 20 ? 'high' : volumeChange > 10 ? 'medium' : 'low',
        description: `${volumeChange.toFixed(1)}x volume increase`,
        confidence: Math.min(1, volumeChange / 20),
      });
    }

    return anomalies;
  }
}

