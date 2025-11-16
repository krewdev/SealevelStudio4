/**
 * Market Maker Analytics
 * Generate trading analytics and recommendations
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { MarketMakerAnalytics } from './types';

/**
 * Generate analytics for token
 */
export async function generateAnalytics(
  connection: Connection,
  tokenMint: string,
  windowMinutes: number = 60
): Promise<MarketMakerAnalytics> {
  const priceHistory: Array<{ price: number; timestamp: Date }> = [];
  const now = Date.now();
  const windowStart = now - (windowMinutes * 60 * 1000);
  
  // Fetch price history from Jupiter or DEX
  // This is a simplified version - in production, would fetch from DEX APIs
  try {
    // Get recent prices (simplified - would use actual DEX data)
    for (let i = 0; i < 20; i++) {
      const timestamp = new Date(windowStart + (i * (windowMinutes * 60 * 1000) / 20));
      const price = await getTokenPrice(connection, tokenMint);
      if (price > 0) {
        priceHistory.push({ price, timestamp });
      }
    }
  } catch (error) {
    console.error('Failed to fetch price history:', error);
  }
  
  // Calculate metrics
  const prices = priceHistory.map(p => p.price);
  const currentPrice = prices[prices.length - 1] || 0;
  const volume24h = calculateVolume24h(priceHistory);
  const volatility = calculateVolatility(prices);
  const trend = determineTrend(prices);
  const rsi = calculateRSI(prices);
  
  // Generate recommendations
  const recommendations = generateRecommendations(
    currentPrice,
    prices,
    volatility,
    trend,
    rsi
  );
  
  return {
    priceHistory,
    volume24h,
    buyVolume24h: volume24h * 0.6, // Estimate
    sellVolume24h: volume24h * 0.4, // Estimate
    volatility,
    trend,
    supportLevel: findSupportLevel(prices),
    resistanceLevel: findResistanceLevel(prices),
    rsi,
    recommendations,
  };
}

/**
 * Get current token price
 */
async function getTokenPrice(connection: Connection, tokenMint: string): Promise<number> {
  try {
    const response = await fetch(
      `https://quote-api.jup.ag/v6/quote?` +
      `inputMint=So11111111111111111111111111111111111111112&` +
      `outputMint=${tokenMint}&` +
      `amount=1000000000&` +
      `slippageBps=50`
    );
    
    if (response.ok) {
      const quote = await response.json();
      return parseFloat(quote.outAmount) / 1e9;
    }
  } catch (error) {
    console.error('Failed to get price:', error);
  }
  
  return 0;
}

/**
 * Calculate 24h volume (simplified)
 */
function calculateVolume24h(priceHistory: Array<{ price: number; timestamp: Date }>): number {
  // Simplified calculation - would use actual DEX volume data
  return priceHistory.length * 1000; // Estimate
}

/**
 * Calculate volatility
 */
function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    const ret = (prices[i] - prices[i - 1]) / prices[i - 1];
    returns.push(ret);
  }
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  return stdDev * 100; // As percentage
}

/**
 * Determine trend
 */
function determineTrend(prices: number[]): 'up' | 'down' | 'sideways' {
  if (prices.length < 2) return 'sideways';
  
  const first = prices[0];
  const last = prices[prices.length - 1];
  const change = (last - first) / first;
  
  if (change > 0.02) return 'up';
  if (change < -0.02) return 'down';
  return 'sideways';
}

/**
 * Calculate RSI (Relative Strength Index)
 */
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length < period + 1) return 50; // Neutral
  
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains.push(change);
      losses.push(0);
    } else {
      gains.push(0);
      losses.push(Math.abs(change));
    }
  }
  
  const avgGain = gains.slice(-period).reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.slice(-period).reduce((a, b) => a + b, 0) / period;
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));
  
  return rsi;
}

/**
 * Find support level
 */
function findSupportLevel(prices: number[]): number | undefined {
  if (prices.length < 3) return undefined;
  
  // Find local minima
  const minima: number[] = [];
  for (let i = 1; i < prices.length - 1; i++) {
    if (prices[i] < prices[i - 1] && prices[i] < prices[i + 1]) {
      minima.push(prices[i]);
    }
  }
  
  if (minima.length === 0) return undefined;
  return Math.min(...minima);
}

/**
 * Find resistance level
 */
function findResistanceLevel(prices: number[]): number | undefined {
  if (prices.length < 3) return undefined;
  
  // Find local maxima
  const maxima: number[] = [];
  for (let i = 1; i < prices.length - 1; i++) {
    if (prices[i] > prices[i - 1] && prices[i] > prices[i + 1]) {
      maxima.push(prices[i]);
    }
  }
  
  if (maxima.length === 0) return undefined;
  return Math.max(...maxima);
}

/**
 * Generate trading recommendations
 */
function generateRecommendations(
  currentPrice: number,
  prices: number[],
  volatility: number,
  trend: 'up' | 'down' | 'sideways',
  rsi: number
): { action: 'buy' | 'sell' | 'hold'; confidence: number; reason: string } {
  let action: 'buy' | 'sell' | 'hold' = 'hold';
  let confidence = 0.5;
  let reason = '';
  
  // RSI-based signals
  if (rsi < 30) {
    action = 'buy';
    confidence = 0.8;
    reason = 'Oversold (RSI < 30)';
  } else if (rsi > 70) {
    action = 'sell';
    confidence = 0.8;
    reason = 'Overbought (RSI > 70)';
  }
  
  // Trend-based signals
  if (trend === 'up' && rsi < 50) {
    action = 'buy';
    confidence = Math.max(confidence, 0.7);
    reason = 'Uptrend with room to grow';
  } else if (trend === 'down' && rsi > 50) {
    action = 'sell';
    confidence = Math.max(confidence, 0.7);
    reason = 'Downtrend, take profits';
  }
  
  // Volatility adjustment
  if (volatility > 10) {
    confidence *= 0.8; // Reduce confidence in high volatility
    reason += ' (High volatility)';
  }
  
  return { action, confidence, reason };
}

