// Caching layer for pool data to improve performance
// Reduces redundant API calls and improves response times

import { PoolData, ArbitrageOpportunity } from './types';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export class PoolCache {
  private pools: Map<string, CacheEntry<PoolData>> = new Map();
  private opportunities: Map<string, CacheEntry<ArbitrageOpportunity[]>> = new Map();
  private defaultTTL = 30000; // 30 seconds default TTL

  /**
   * Get cached pool data
   */
  getPool(poolId: string): PoolData | null {
    const entry = this.pools.get(poolId);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.pools.delete(poolId);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache pool data
   */
  setPool(poolId: string, pool: PoolData, ttl?: number): void {
    this.pools.set(poolId, {
      data: pool,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Get cached opportunities
   */
  getOpportunities(key: string): ArbitrageOpportunity[] | null {
    const entry = this.opportunities.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.opportunities.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Cache opportunities
   */
  setOpportunities(key: string, opportunities: ArbitrageOpportunity[], ttl?: number): void {
    this.opportunities.set(key, {
      data: opportunities,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Invalidate cache for a specific pool
   */
  invalidatePool(poolId: string): void {
    this.pools.delete(poolId);
  }

  /**
   * Invalidate all opportunities cache
   */
  invalidateOpportunities(): void {
    this.opportunities.clear();
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.pools.clear();
    this.opportunities.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    pools: number;
    opportunities: number;
    totalSize: number;
  } {
    return {
      pools: this.pools.size,
      opportunities: this.opportunities.size,
      totalSize: this.pools.size + this.opportunities.size,
    };
  }
}

// Singleton instance
export const poolCache = new PoolCache();

