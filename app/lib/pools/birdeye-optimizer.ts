/**
 * Optimized Birdeye API Integration for Arbitrage Scanner
 * Minimizes API calls while maximizing opportunity detection
 */

import { BirdeyeFetcher } from './fetchers/birdeye';
import { PoolData, TokenInfo } from './types';

interface CachedPrice {
  price: number;
  timestamp: number;
  volume24h?: number;
  priceChange24h?: number;
}

interface CachedOHLCV {
  data: any;
  timestamp: number;
}

interface CachedTokenData {
  overview?: any;
  security?: any;
  timestamp: number;
}

export class BirdeyeOptimizer {
  private birdeyeFetcher: BirdeyeFetcher;
  
  // Caching to minimize API calls
  private priceCache: Map<string, CachedPrice> = new Map();
  private ohlcvCache: Map<string, CachedOHLCV> = new Map();
  private tokenDataCache: Map<string, CachedTokenData> = new Map();
  private transactionCache: Map<string, { data: any; timestamp: number }> = new Map();
  
  // Cache TTLs (in milliseconds)
  private readonly PRICE_CACHE_TTL = 5000; // 5 seconds for prices
  private readonly OHLCV_CACHE_TTL = 30000; // 30 seconds for OHLCV
  private readonly TOKEN_DATA_CACHE_TTL = 300000; // 5 minutes for token data
  private readonly TRANSACTION_CACHE_TTL = 60000; // 1 minute for transactions
  
  // Batch request tracking
  private pendingPriceRequests: Set<string> = new Set();
  private pendingOHLCVRequests: Set<string> = new Set();
  private batchTimeout?: NodeJS.Timeout;
  private priceBatchQueue: string[] = [];
  
  constructor(birdeyeFetcher: BirdeyeFetcher) {
    this.birdeyeFetcher = birdeyeFetcher;
  }

  /**
   * Batch fetch prices for multiple tokens (most efficient)
   * Uses multi-price endpoint to fetch up to 100 tokens in one call
   */
  async batchFetchPrices(tokenAddresses: string[]): Promise<Map<string, CachedPrice>> {
    const results = new Map<string, CachedPrice>();
    const now = Date.now();
    
    // Filter out cached and valid prices
    const uncachedTokens: string[] = [];
    for (const address of tokenAddresses) {
      const cached = this.priceCache.get(address);
      if (cached && (now - cached.timestamp) < this.PRICE_CACHE_TTL) {
        results.set(address, cached);
      } else {
        uncachedTokens.push(address);
      }
    }
    
    if (uncachedTokens.length === 0) {
      return results;
    }
    
    // Batch fetch in chunks of 100 (Birdeye limit)
    const chunks: string[][] = [];
    for (let i = 0; i < uncachedTokens.length; i += 100) {
      chunks.push(uncachedTokens.slice(i, i + 100));
    }
    
    // Fetch all chunks in parallel
    const fetchPromises = chunks.map(async (chunk) => {
      try {
        const response = await this.birdeyeFetcher.fetchMultiPrice(chunk, 'raw');
        if (response && response.data) {
          for (const [address, priceData] of Object.entries(response.data)) {
            if (priceData && typeof priceData === 'object' && 'value' in priceData) {
              const price = (priceData as any).value || 0;
              const volume24h = (priceData as any).updateUnixTime ? undefined : (priceData as any).volume24h;
              const priceChange24h = (priceData as any).priceChange24h;
              
              const cached: CachedPrice = {
                price,
                timestamp: now,
                volume24h,
                priceChange24h,
              };
              
              this.priceCache.set(address, cached);
              results.set(address, cached);
            }
          }
        }
      } catch (error) {
        console.error(`Error batch fetching prices for chunk:`, error);
      }
    });
    
    await Promise.allSettled(fetchPromises);
    return results;
  }

  /**
   * Get price for a single token (uses cache if available)
   */
  async getPrice(tokenAddress: string): Promise<number | null> {
    const cached = this.priceCache.get(tokenAddress);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < this.PRICE_CACHE_TTL) {
      return cached.price;
    }
    
    // Use batch fetch for efficiency
    const prices = await this.batchFetchPrices([tokenAddress]);
    return prices.get(tokenAddress)?.price || null;
  }

  /**
   * Batch fetch OHLCV for base/quote pairs
   * Optimized to fetch only when needed and cache results
   */
  async batchFetchOHLCV(
    pairs: Array<{ base: string; quote: string; type?: string }>
  ): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const now = Date.now();
    
    // Filter out cached pairs
    const uncachedPairs: Array<{ base: string; quote: string; type: string; key: string }> = [];
    for (const pair of pairs) {
      const key = `${pair.base}-${pair.quote}-${pair.type || '1m'}`;
      const cached = this.ohlcvCache.get(key);
      if (cached && (now - cached.timestamp) < this.OHLCV_CACHE_TTL) {
        results.set(key, cached.data);
      } else {
        uncachedPairs.push({ ...pair, type: pair.type || '1m', key });
      }
    }
    
    if (uncachedPairs.length === 0) {
      return results;
    }
    
    // Fetch in parallel (but limit concurrency to avoid rate limits)
    const BATCH_SIZE = 10;
    for (let i = 0; i < uncachedPairs.length; i += BATCH_SIZE) {
      const batch = uncachedPairs.slice(i, i + BATCH_SIZE);
      const fetchPromises = batch.map(async (pair) => {
        try {
          const data = await this.birdeyeFetcher.fetchOHLCVBaseQuote(
            pair.base,
            pair.quote,
            pair.type,
            'raw'
          );
          
          if (data) {
            this.ohlcvCache.set(pair.key, { data, timestamp: now });
            results.set(pair.key, data);
          }
        } catch (error) {
          console.error(`Error fetching OHLCV for ${pair.key}:`, error);
        }
      });
      
      await Promise.allSettled(fetchPromises);
      
      // Small delay to avoid rate limits
      if (i + BATCH_SIZE < uncachedPairs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }

  /**
   * Get active pools by analyzing recent transactions
   * Uses transaction data to identify high-volume pools
   */
  async getActivePools(
    pools: PoolData[],
    minVolume24h: number = 10000
  ): Promise<PoolData[]> {
    const now = Date.now();
    const activePools: PoolData[] = [];
    
    // Extract unique token pairs
    const tokenPairs = new Set<string>();
    for (const pool of pools) {
      const pairKey = `${pool.tokenA.mint}-${pool.tokenB.mint}`;
      tokenPairs.add(pairKey);
    }
    
    // Batch fetch transaction data for pairs
    const pairAddresses = Array.from(tokenPairs).map(key => {
      const [tokenA, tokenB] = key.split('-');
      // Use the pool address if available, otherwise use token addresses
      return pools.find(p => 
        (p.tokenA.mint === tokenA && p.tokenB.mint === tokenB) ||
        (p.tokenA.mint === tokenB && p.tokenB.mint === tokenA)
      )?.id || tokenA;
    });
    
    // Fetch recent transactions for each pair (limit to avoid excessive calls)
    const transactionPromises = pairAddresses.slice(0, 50).map(async (address) => {
      const cacheKey = `tx-${address}`;
      const cached = this.transactionCache.get(cacheKey);
      
      if (cached && (now - cached.timestamp) < this.TRANSACTION_CACHE_TTL) {
        return cached.data;
      }
      
      try {
        // Fetch recent transactions (last hour)
        const timeFrom = Math.floor((now - 3600000) / 1000);
        const data = await this.birdeyeFetcher.fetchPairTransactions(
          address,
          0,
          10, // Only need recent volume data
          'swap',
          'scaled',
          timeFrom
        );
        
        if (data) {
          this.transactionCache.set(cacheKey, { data, timestamp: now });
          return data;
        }
      } catch (error) {
        console.error(`Error fetching transactions for ${address}:`, error);
      }
      
      return null;
    });
    
    const transactionResults = await Promise.allSettled(transactionPromises);
    
    // Analyze transaction volume and filter pools
    for (let i = 0; i < pools.length; i++) {
      const pool = pools[i];
      const result = transactionResults[i];
      
      if (result.status === 'fulfilled' && result.value) {
        // Calculate 24h volume from recent transactions
        const transactions = result.value.items || [];
        const recentVolume = transactions.reduce((sum: number, tx: any) => {
          return sum + (tx.amount || 0);
        }, 0);
        
        // Estimate 24h volume (extrapolate from recent hour)
        const estimatedVolume24h = recentVolume * 24;
        
        if (estimatedVolume24h >= minVolume24h) {
          activePools.push(pool);
        }
      } else {
        // If we can't get transaction data, include pool anyway (conservative)
        activePools.push(pool);
      }
    }
    
    return activePools;
  }

  /**
   * Enrich pools with Birdeye data efficiently
   * Batches all API calls to minimize costs
   */
  async enrichPools(pools: PoolData[]): Promise<PoolData[]> {
    if (pools.length === 0) return pools;
    
    // 1. Batch fetch prices for all unique tokens
    const uniqueTokens = new Set<string>();
    pools.forEach(pool => {
      uniqueTokens.add(pool.tokenA.mint);
      uniqueTokens.add(pool.tokenB.mint);
    });
    
    const prices = await this.batchFetchPrices(Array.from(uniqueTokens));
    
    // 2. Batch fetch OHLCV for all pairs
    const ohlcvPairs = pools.map(pool => ({
      base: pool.tokenA.mint,
      quote: pool.tokenB.mint,
      type: '1m' as string,
    }));
    
    const ohlcvData = await this.batchFetchOHLCV(ohlcvPairs);
    
    // 3. Enrich each pool with fetched data
    const enrichedPools = pools.map((pool, index) => {
      const enriched = { ...pool };
      
      // Update prices from cache
      const tokenAPrice = prices.get(pool.tokenA.mint)?.price;
      const tokenBPrice = prices.get(pool.tokenB.mint)?.price;
      
      if (tokenAPrice && tokenBPrice && tokenBPrice > 0) {
        enriched.price = tokenAPrice / tokenBPrice;
      }
      
      // Add OHLCV data if available
      const ohlcvKey = `${pool.tokenA.mint}-${pool.tokenB.mint}-1m`;
      const ohlcv = ohlcvData.get(ohlcvKey);
      if (ohlcv) {
        enriched.metadata = {
          ...enriched.metadata,
          ohlcv,
        };
      }
      
      // Add volume data from price cache
      const tokenAVolume = prices.get(pool.tokenA.mint)?.volume24h;
      const tokenBVolume = prices.get(pool.tokenB.mint)?.volume24h;
      if (tokenAVolume || tokenBVolume) {
        enriched.volume24h = (tokenAVolume || 0) + (tokenBVolume || 0);
      }
      
      return enriched;
    });
    
    return enrichedPools;
  }

  /**
   * Find arbitrage opportunities using Birdeye data
   * Optimized to use multi-price and OHLCV for accurate detection
   */
  async findArbitrageOpportunities(
    pools: PoolData[],
    minProfitPercent: number = 0.5
  ): Promise<Array<{ poolA: PoolData; poolB: PoolData; profitPercent: number }>> {
    const opportunities: Array<{ poolA: PoolData; poolB: PoolData; profitPercent: number }> = [];
    
    // Group pools by token pair
    const poolsByPair = new Map<string, PoolData[]>();
    for (const pool of pools) {
      const pairKey = `${pool.tokenA.mint}-${pool.tokenB.mint}`;
      if (!poolsByPair.has(pairKey)) {
        poolsByPair.set(pairKey, []);
      }
      poolsByPair.get(pairKey)!.push(pool);
    }
    
    // For each pair, compare prices across pools
    for (const [pairKey, pairPools] of poolsByPair.entries()) {
      if (pairPools.length < 2) continue;
      
      // Fetch OHLCV for accurate price comparison
      const [tokenA, tokenB] = pairKey.split('-');
      const ohlcvPairs = pairPools.map(() => ({
        base: tokenA,
        quote: tokenB,
        type: '1m',
      }));
      
      const ohlcvData = await this.batchFetchOHLCV(ohlcvPairs);
      
      // Compare all pairs of pools
      for (let i = 0; i < pairPools.length; i++) {
        for (let j = i + 1; j < pairPools.length; j++) {
          const poolA = pairPools[i];
          const poolB = pairPools[j];
          
          // Use OHLCV for more accurate price if available
          let priceA = poolA.price;
          let priceB = poolB.price;
          
          const ohlcvKeyA = `${tokenA}-${tokenB}-1m`;
          const ohlcvKeyB = `${tokenB}-${tokenA}-1m`;
          
          if (ohlcvData.has(ohlcvKeyA)) {
            const ohlcv = ohlcvData.get(ohlcvKeyA);
            if (ohlcv?.items && ohlcv.items.length > 0) {
              const latest = ohlcv.items[ohlcv.items.length - 1];
              priceA = latest.close || priceA;
            }
          }
          
          // Calculate price difference
          const priceDiff = Math.abs(priceA - priceB);
          const avgPrice = (priceA + priceB) / 2;
          const profitPercent = avgPrice > 0 ? (priceDiff / avgPrice) * 100 : 0;
          
          if (profitPercent >= minProfitPercent) {
            opportunities.push({
              poolA,
              poolB,
              profitPercent,
            });
          }
        }
      }
    }
    
    return opportunities;
  }

  /**
   * Get token security data (cached)
   */
  async getTokenSecurity(tokenAddress: string): Promise<any | null> {
    const cached = this.tokenDataCache.get(tokenAddress);
    const now = Date.now();
    
    if (cached?.security && (now - cached.timestamp) < this.TOKEN_DATA_CACHE_TTL) {
      return cached.security;
    }
    
    try {
      const security = await this.birdeyeFetcher.fetchTokenSecurity(tokenAddress);
      if (security) {
        const existing = this.tokenDataCache.get(tokenAddress) || { timestamp: now };
        existing.security = security;
        existing.timestamp = now;
        this.tokenDataCache.set(tokenAddress, existing);
        return security;
      }
    } catch (error) {
      console.error(`Error fetching token security for ${tokenAddress}:`, error);
    }
    
    return null;
  }

  /**
   * Clear all caches (useful for testing or memory management)
   */
  clearCache(): void {
    this.priceCache.clear();
    this.ohlcvCache.clear();
    this.tokenDataCache.clear();
    this.transactionCache.clear();
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getCacheStats(): {
    priceCacheSize: number;
    ohlcvCacheSize: number;
    tokenDataCacheSize: number;
    transactionCacheSize: number;
  } {
    return {
      priceCacheSize: this.priceCache.size,
      ohlcvCacheSize: this.ohlcvCache.size,
      tokenDataCacheSize: this.tokenDataCache.size,
      transactionCacheSize: this.transactionCache.size,
    };
  }
}

