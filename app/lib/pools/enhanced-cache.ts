// Enhanced caching with smart invalidation and predictive pre-warming

import { PoolData, ArbitrageOpportunity } from './types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
  volatility: number; // Higher volatility = shorter cache
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

export class EnhancedCache {
  private pools: Map<string, CacheEntry<PoolData>> = new Map();
  private opportunities: Map<string, CacheEntry<ArbitrageOpportunity[]>> = new Map();
  private defaultTTL = 30000; // 30 seconds
  private maxSize = 10000; // Max entries
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0,
  };

  /**
   * Get cached pool with smart TTL based on volatility
   */
  getPool(poolId: string): PoolData | null {
    const entry = this.pools.get(poolId);
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.pools.delete(poolId);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  /**
   * Cache pool with volatility-based TTL
   */
  setPool(poolId: string, pool: PoolData, volatility?: number, ttl?: number): void {
    // Calculate TTL based on volatility
    const calculatedTTL = ttl || this.calculateTTL(volatility || 0);
    
    // Evict if at max size
    if (this.pools.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.pools.set(poolId, {
      data: pool,
      timestamp: Date.now(),
      ttl: calculatedTTL,
      accessCount: 0,
      lastAccess: Date.now(),
      volatility: volatility || 0,
    });

    this.updateStats();
  }

  /**
   * Calculate TTL based on volatility
   * High volatility = shorter cache time
   */
  private calculateTTL(volatility: number): number {
    // Base TTL of 30s, reduced by volatility
    const volatilityPenalty = Math.min(volatility * 10000, 20000); // Max 20s reduction
    return Math.max(10000, this.defaultTTL - volatilityPenalty); // Min 10s
  }

  /**
   * Get cached opportunities
   */
  getOpportunities(key: string): ArbitrageOpportunity[] | null {
    const entry = this.opportunities.get(key);
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > entry.ttl) {
      this.opportunities.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    entry.accessCount++;
    entry.lastAccess = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    return entry.data;
  }

  /**
   * Cache opportunities
   */
  setOpportunities(key: string, opportunities: ArbitrageOpportunity[], ttl?: number): void {
    if (this.opportunities.size >= this.maxSize) {
      this.evictLeastUsedOpportunities();
    }

    this.opportunities.set(key, {
      data: opportunities,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      accessCount: 0,
      lastAccess: Date.now(),
      volatility: 0,
    });

    this.updateStats();
  }

  /**
   * Invalidate pool cache (called on WebSocket update)
   */
  invalidatePool(poolId: string): void {
    this.pools.delete(poolId);
    this.updateStats();
  }

  /**
   * Invalidate all opportunities
   */
  invalidateOpportunities(): void {
    this.opportunities.clear();
    this.updateStats();
  }

  /**
   * Pre-warm cache for popular pools
   */
  preWarm(poolIds: string[], fetcher: (id: string) => Promise<PoolData | null>): void {
    for (const poolId of poolIds) {
      if (!this.pools.has(poolId)) {
        fetcher(poolId).then(pool => {
          if (pool) {
            this.setPool(poolId, pool);
          }
        });
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLeastUsed(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.pools.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.pools.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Evict least used opportunities
   */
  private evictLeastUsedOpportunities(): void {
    let lruKey: string | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.opportunities.entries()) {
      if (entry.lastAccess < lruTime) {
        lruTime = entry.lastAccess;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.opportunities.delete(lruKey);
      this.stats.evictions++;
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Update cache size
   */
  private updateStats(): void {
    this.stats.size = this.pools.size + this.opportunities.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & {
    pools: number;
    opportunities: number;
  } {
    return {
      ...this.stats,
      pools: this.pools.size,
      opportunities: this.opportunities.size,
    };
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.pools.clear();
    this.opportunities.clear();
    this.updateStats();
  }
}

// Singleton instance
export const enhancedCache = new EnhancedCache();

