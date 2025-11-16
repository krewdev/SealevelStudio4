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

export class PoolScanner {
  private fetchers: Map<DEXProtocol, PoolFetcher>;
  private state: ScannerState;

  constructor(config: Partial<ScannerConfig> = {}) {
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

  async scan(connection: Connection): Promise<ScannerState> {
    if (this.state.isScanning) {
      return this.state;
    }

    this.state.isScanning = true;
    this.state.errors = [];

    try {
      const allPools: PoolData[] = [];
      const enabledDEXs = this.state.config.enabledDEXs;

      // Fetch pools from each enabled DEX
      const fetchPromises = enabledDEXs.map(async (dex) => {
        const fetcher = this.fetchers.get(dex);
        if (!fetcher) {
          this.state.errors.push(`No fetcher found for DEX: ${dex}`);
          return;
        }

        try {
          const result = await fetcher.fetchPools(connection);
          allPools.push(...result.pools);
          
          if (result.errors && result.errors.length > 0) {
            this.state.errors.push(...result.errors);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          this.state.errors.push(`Error fetching ${dex}: ${errorMsg}`);
        }
      });

      await Promise.allSettled(fetchPromises);

      // Enrich pool data with Birdeye if available
      if (this.fetchers.has('birdeye')) {
        const birdeyeFetcher = this.fetchers.get('birdeye') as BirdeyeFetcher;
        const enrichmentPromises = allPools.map(pool => 
          birdeyeFetcher.enrichPoolData(pool).catch(() => pool)
        );
        const enrichedPools = await Promise.all(enrichmentPromises);
        allPools.splice(0, allPools.length, ...enrichedPools);
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

    const aiSearcher = new AISearcher(connection, this.state.pools);
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

