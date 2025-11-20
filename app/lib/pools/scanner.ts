// Main scanner orchestrator that aggregates all DEX data

import { Connection } from '@solana/web3.js';
import { PoolData, ScannerState, ScannerConfig, DEFAULT_SCANNER_CONFIG, DEXProtocol } from './types';
import { PoolFetcher } from './fetchers/base';
import { RaydiumFetcher } from './fetchers/raydium';
import { OrcaFetcher } from './fetchers/orca';
import { JupiterFetcher } from './fetchers/jupiter';
import { MeteoraFetcher } from './fetchers/meteora';
import { LifinityFetcher } from './fetchers/lifinity';
import { HeliusFetcher } from './fetchers/helius';
import { BirdeyeFetcher } from './fetchers/birdeye';
import { AISearcher } from './ai-searcher';
import { poolWebSocketManager, PoolUpdate } from './websocket';
import { poolCache } from './cache';

export class PoolScanner {
  private fetchers: Map<DEXProtocol, PoolFetcher>;
  private state: ScannerState;
  private rpcUrl?: string;
  private lastScanTime: number = 0;
  private readonly CACHE_TTL = 60000; // 60 seconds cache TTL
  private readonly MIN_SCAN_INTERVAL = 30000; // Minimum 30 seconds between scans

  constructor(config: Partial<ScannerConfig> & { rpcUrl?: string } = {}) {
    this.rpcUrl = config.rpcUrl;
    this.state = {
      pools: [],
      opportunities: [],
      isScanning: false,
      lastScanTime: null,
      errors: [],
      config: { ...DEFAULT_SCANNER_CONFIG, ...config },
    };

    // Initialize fetchers
    this.fetchers = new Map();
    this.fetchers.set('raydium', new RaydiumFetcher());
    this.fetchers.set('orca', new OrcaFetcher());
    this.fetchers.set('jupiter', new JupiterFetcher());
    this.fetchers.set('meteora', new MeteoraFetcher());
    this.fetchers.set('lifinity', new LifinityFetcher());
    
    // Enhanced data source fetchers (optional, require API keys)
    if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
      this.fetchers.set('helius', new HeliusFetcher());
    }
    if (process.env.NEXT_PUBLIC_BIRDEYE_API_KEY) {
      this.fetchers.set('birdeye', new BirdeyeFetcher());
    }
  }

  /**
   * Get a fetcher by DEX protocol name
   */
  getFetcher(dex: DEXProtocol): PoolFetcher | undefined {
    return this.fetchers.get(dex);
  }

  async scan(connection: Connection): Promise<ScannerState> {
    if (this.state.isScanning) {
      return this.state;
    }

    // Rate limiting: Prevent scans too frequently
    const now = Date.now();
    const timeSinceLastScan = now - this.lastScanTime;
    if (timeSinceLastScan < this.MIN_SCAN_INTERVAL) {
      console.warn(`[Scanner] Rate limit: Please wait ${Math.ceil((this.MIN_SCAN_INTERVAL - timeSinceLastScan) / 1000)}s before scanning again`);
      return this.state;
    }

    // Check cache first
    const cacheKey = `scan_${this.state.config.enabledDEXs.join(',')}`;
    const cached = poolCache.getOpportunities(cacheKey);
    if (cached && Array.isArray(cached) && cached.length > 0) {
      console.log(`[Scanner] Using cached pools (${cached.length} pools)`);
      this.state.pools = cached as any;
      this.state.lastScanTime = new Date();
      return this.state;
    }

    this.state.isScanning = true;
    this.state.errors = [];
    this.lastScanTime = now;

    try {
      let allPools: PoolData[] = [];
      const enabledDEXs = this.state.config.enabledDEXs;
      
      // Track API calls for logging
      let totalApiCalls = 0;

      // Fetch pools from each enabled DEX (with rate limiting between DEXs)
      const fetchPromises = enabledDEXs.map(async (dex, index) => {
        // Stagger DEX fetches to avoid overwhelming the API
        if (index > 0) {
          await new Promise(resolve => setTimeout(resolve, 200 * index));
        }
        const fetcher = this.fetchers.get(dex);
        if (!fetcher) {
          this.state.errors.push(`No fetcher found for DEX: ${dex}`);
          return;
        }

        try {
          // Pass RPC URL to fetcher if available
          if (this.rpcUrl) {
            if (typeof (fetcher as any).setRpcUrl === 'function') {
              (fetcher as any).setRpcUrl(this.rpcUrl);
              console.log(`[Scanner] Set RPC URL for ${dex}: ${this.rpcUrl.replace(/api-key=[^&]+/, 'api-key=***')}`);
            } else {
              console.warn(`[Scanner] Fetcher ${dex} does not have setRpcUrl method`);
            }
          }
          const result = await fetcher.fetchPools(connection);
          
          // Log results for debugging
          if (result.pools.length > 0) {
            console.log(`[Scanner] ${dex}: Found ${result.pools.length} pools`);
          } else {
            console.warn(`[Scanner] ${dex}: No pools found`);
          }
          
          allPools.push(...result.pools);
          
          // Estimate API calls (rough estimate: 1 call per 1000 accounts)
          // This is just for logging, actual calls are in pagination
          totalApiCalls += Math.ceil(result.pools.length / 1000) || 1;
          
          if (result.errors && result.errors.length > 0) {
            console.warn(`[Scanner] ${dex} errors:`, result.errors);
            this.state.errors.push(...result.errors.map(e => `[${dex}] ${e}`));
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`[Scanner] Error fetching ${dex}:`, error);
          this.state.errors.push(`[${dex}] Error: ${errorMsg}`);
        }
      });

      const results = await Promise.allSettled(fetchPromises);
      
      // Cache the results
      if (allPools.length > 0) {
        poolCache.setOpportunities(cacheKey, allPools as any, this.CACHE_TTL);
        console.log(`[Scanner] Cached ${allPools.length} pools for ${this.CACHE_TTL / 1000}s`);
      }
      
      // Log summary with API call estimate
      console.log(`[Scanner] Estimated API calls: ~${totalApiCalls} (across ${enabledDEXs.length} DEXs)`);
      const dexCounts = new Map<DEXProtocol, number>();
      allPools.forEach(pool => {
        dexCounts.set(pool.dex, (dexCounts.get(pool.dex) || 0) + 1);
      });
      
      console.log('[Scanner] Pool counts by DEX (before Birdeye):', Object.fromEntries(dexCounts));
      
      // Always try Birdeye as a primary source (it aggregates pools from all DEXs)
      // This ensures we get pools even if individual DEX fetchers fail
      if (this.fetchers.has('birdeye')) {
        try {
          console.log('[Scanner] Fetching pools from Birdeye (aggregates all DEXs)...');
          const birdeyeFetcher = this.fetchers.get('birdeye') as BirdeyeFetcher;
          const birdeyeResult = await birdeyeFetcher.fetchPools(connection);
          
          if (birdeyeResult.pools.length > 0) {
            console.log(`[Scanner] Birdeye: Found ${birdeyeResult.pools.length} pools`);
            // Merge Birdeye pools (avoid duplicates by pool ID)
            const existingIds = new Set(allPools.map(p => p.id));
            const newPools = birdeyeResult.pools.filter(p => !existingIds.has(p.id));
            allPools.push(...newPools);
            console.log(`[Scanner] Added ${newPools.length} new pools from Birdeye`);
            
            if (birdeyeResult.errors && birdeyeResult.errors.length > 0) {
              this.state.errors.push(...birdeyeResult.errors.map(e => `[birdeye] ${e}`));
            }
          } else {
            console.warn('[Scanner] Birdeye returned no pools');
          }
        } catch (error) {
          console.error('[Scanner] Birdeye fetch failed:', error);
          this.state.errors.push(`[birdeye] Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
      
      // Final summary
      const finalDexCounts = new Map<DEXProtocol, number>();
      allPools.forEach(pool => {
        finalDexCounts.set(pool.dex, (finalDexCounts.get(pool.dex) || 0) + 1);
      });
      
      console.log('[Scanner] Final pool counts by DEX:', Object.fromEntries(finalDexCounts));
      console.log(`[Scanner] Total pools: ${allPools.length}`);

      // Enrich pool data with Birdeye if available (optimized batch processing)
      if (this.fetchers.has('birdeye')) {
        const birdeyeFetcher = this.fetchers.get('birdeye') as BirdeyeFetcher;
        
        // Use optimized batch enrichment to minimize API calls
        try {
          const { BirdeyeOptimizer } = await import('./birdeye-optimizer');
          const optimizer = new BirdeyeOptimizer(birdeyeFetcher);
          
          // Filter to active pools first (saves API calls)
          const activePools = await optimizer.getActivePools(allPools, 1000);
          
          // Batch enrich only active pools
          const enrichedPools = await optimizer.enrichPools(activePools);
          
          // Merge enriched pools back (keep non-active pools but mark them)
          const enrichedMap = new Map(enrichedPools.map(p => [p.id, p]));
          allPools = allPools.map(pool => enrichedMap.get(pool.id) || pool);
        } catch (error) {
          console.error('Error using Birdeye optimizer, falling back to standard enrichment:', error);
          // Fallback to standard enrichment
          const enrichmentPromises = allPools.map(pool => 
            birdeyeFetcher.enrichPoolData(pool).catch(() => pool)
          );
          const enrichedPools = await Promise.all(enrichmentPromises);
          allPools.splice(0, allPools.length, ...enrichedPools);
        }
      }

      // Update state
      this.state.pools = allPools;
      this.state.lastScanTime = new Date();
      this.state.isScanning = false;

      return this.state;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.state.errors.push(`Scanner error: ${errorMsg}`);
      this.state.isScanning = false;
      return this.state;
    }
  }

  getState(): ScannerState {
    return { ...this.state };
  }

  updateConfig(config: Partial<ScannerConfig>): void {
    this.state.config = { ...this.state.config, ...config };
  }

  getPools(): PoolData[] {
    return [...this.state.pools];
  }

  getPoolsByDEX(dex: DEXProtocol): PoolData[] {
    return this.state.pools.filter(pool => pool.dex === dex);
  }

  getPoolsByToken(mint: string): PoolData[] {
    return this.state.pools.filter(
      pool => pool.tokenA.mint === mint || pool.tokenB.mint === mint
    );
  }

  getPoolById(poolId: string): PoolData | undefined {
    return this.state.pools.find(pool => pool.id === poolId);
  }

  async refreshPool(connection: Connection, poolId: string): Promise<PoolData | null> {
    const pool = this.getPoolById(poolId);
    if (!pool) {
      return null;
    }

    const fetcher = this.fetchers.get(pool.dex);
    if (!fetcher) {
      return null;
    }

    try {
      const updatedPool = await fetcher.fetchPoolById(connection, poolId);
      if (updatedPool) {
        // Update pool in state
        const index = this.state.pools.findIndex(p => p.id === poolId);
        if (index !== -1) {
          this.state.pools[index] = updatedPool;
        }
        return updatedPool;
      }
    } catch (error) {
      this.handleError(error, `refreshPool ${poolId}`);
    }

    return null;
  }

  /**
   * Get AI-powered unconventional opportunities
   */
  async findUnconventionalOpportunities(connection: Connection): Promise<any[]> {
    if (this.state.pools.length === 0) {
      return [];
    }

    const birdeyeFetcher = this.fetchers.get('birdeye') as BirdeyeFetcher | undefined;
    const aiSearcher = new AISearcher(connection, this.state.pools, birdeyeFetcher);
    return await aiSearcher.findUnconventionalOpportunities(this.state.config.minProfitThreshold);
  }

  /**
   * Optimize routing for a specific arbitrage path
   */
  optimizeRoute(startToken: string, endToken: string, amount: bigint, connection: Connection): any {
    if (this.state.pools.length === 0) {
      return null;
    }

    const aiSearcher = new AISearcher(connection, this.state.pools);
    const startTokenInfo = this.findTokenInfo(startToken);
    const endTokenInfo = this.findTokenInfo(endToken);

    if (!startTokenInfo || !endTokenInfo) {
      return null;
    }

    return aiSearcher.optimizeRoute(startTokenInfo, endTokenInfo, amount);
  }

  /**
   * Analyze market anomalies
   */
  async analyzeAnomalies(connection: Connection): Promise<any> {
    if (this.state.pools.length === 0) {
      return { anomalies: [] };
    }

    const aiSearcher = new AISearcher(connection, this.state.pools);
    return await aiSearcher.analyzeAnomalies();
  }

  private findTokenInfo(mint: string): { mint: string; symbol: string; decimals: number } | null {
    for (const pool of this.state.pools) {
      if (pool.tokenA.mint === mint) {
        return pool.tokenA;
      }
      if (pool.tokenB.mint === mint) {
        return pool.tokenB;
      }
    }
    return null;
  }

  private handleError(error: any, context: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[PoolScanner] Error in ${context}:`, errorMessage);
    this.state.errors.push(`${context}: ${errorMessage}`);
  }
}

