/**
 * Consensus Response Cache
 * Caches consensus results to reduce API calls
 */

import { ConsensusResult, ConsensusRequest } from './types';

interface CacheEntry {
  result: ConsensusResult;
  timestamp: Date;
  ttl: number; // Time to live in seconds
}

export class ConsensusCache {
  private cache: Map<string, CacheEntry> = new Map();
  private defaultTTL: number = 300; // 5 minutes default

  /**
   * Generate cache key from request
   */
  private getCacheKey(request: ConsensusRequest): string {
    // Use prompt hash as key (simple hash for now)
    const promptHash = this.simpleHash(request.prompt);
    return `consensus:${promptHash}`;
  }

  /**
   * Simple hash function
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get cached result if available and not expired
   */
  get(request: ConsensusRequest): ConsensusResult | null {
    const key = this.getCacheKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    const age = (Date.now() - entry.timestamp.getTime()) / 1000;
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.result;
  }

  /**
   * Store result in cache
   */
  set(request: ConsensusRequest, result: ConsensusResult, ttl?: number): void {
    const key = this.getCacheKey(request);
    this.cache.set(key, {
      result,
      timestamp: new Date(),
      ttl: ttl || this.defaultTTL,
    });
  }

  /**
   * Check if request is cached
   */
  has(request: ConsensusRequest): boolean {
    return this.get(request) !== null;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of Array.from(this.cache.entries())) {
      const age = (now - entry.timestamp.getTime()) / 1000;
      if (age > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getStats(): { size: number; entries: number } {
    return {
      size: this.cache.size,
      entries: this.cache.size,
    };
  }
}

// Global cache instance
export const consensusCache = new ConsensusCache();

// Cleanup expired entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    consensusCache.cleanup();
  }, 5 * 60 * 1000);
}

