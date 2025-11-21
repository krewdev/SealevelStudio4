// Base fetcher interface and common utilities

import { Connection, PublicKey } from '@solana/web3.js';
import { PoolData, FetcherResult, DEXProtocol } from '../types';

export interface PoolFetcher {
  dex: DEXProtocol;
  fetchPools(connection: Connection): Promise<FetcherResult>;
  fetchPoolById(connection: Connection, poolId: string): Promise<PoolData | null>;
}

export abstract class BasePoolFetcher implements PoolFetcher {
  abstract dex: DEXProtocol;
  protected rpcUrl?: string;

  /**
   * Set RPC URL (used when Helius RPC is provided)
   */
  setRpcUrl(rpcUrl: string): void {
    this.rpcUrl = rpcUrl;
  }

  /**
   * Get RPC URL from connection or stored value
   */
  protected getRpcUrl(connection: Connection): string {
    if (this.rpcUrl) {
      console.log(`[${this.dex}] Using stored RPC URL: ${this.rpcUrl.replace(/api-key=[^&]+/, 'api-key=***')}`);
      return this.rpcUrl;
    }
    // Try to get from connection (may not include query params)
    const url = (connection as any).rpcEndpoint || (connection as any)._rpcEndpoint || connection.rpcEndpoint || '';
    console.log(`[${this.dex}] Using connection RPC URL: ${url.replace(/api-key=[^&]+/, 'api-key=***')}`);
    return url;
  }

  abstract fetchPools(connection: Connection): Promise<FetcherResult>;
  abstract fetchPoolById(connection: Connection, poolId: string): Promise<PoolData | null>;

  protected async fetchTokenInfo(
    connection: Connection,
    mintAddress: string
  ): Promise<{ symbol: string; decimals: number; name?: string }> {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      // Try to get mint account data
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
      
      if (mintInfo.value && 'parsed' in mintInfo.value) {
        const parsed = mintInfo.value.parsed as any;
        if (parsed.info) {
          return {
            symbol: this.getTokenSymbol(mintAddress),
            decimals: parsed.info.decimals || 9,
            name: parsed.info.name || this.getTokenSymbol(mintAddress),
          };
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch token info for ${mintAddress}:`, error);
    }
    
    // Fallback to default
    return {
      symbol: this.getTokenSymbol(mintAddress),
      decimals: 9,
      name: this.getTokenSymbol(mintAddress),
    };
  }

  protected getTokenSymbol(mintAddress: string): string {
    // Common token symbols mapping
    const knownTokens: Record<string, string> = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
      '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
    };
    
    return knownTokens[mintAddress] || mintAddress.slice(0, 4).toUpperCase();
  }

  protected calculatePrice(
    reserveA: bigint,
    reserveB: bigint,
    decimalsA: number,
    decimalsB: number
  ): number {
    if (reserveB === BigInt(0)) return 0;
    const adjustedA = Number(reserveA) / Math.pow(10, decimalsA);
    const adjustedB = Number(reserveB) / Math.pow(10, decimalsB);
    return adjustedB / adjustedA;
  }

  protected handleError(error: any, context: string): string {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${this.dex}] Error in ${context}:`, errorMessage);
    return `${context}: ${errorMessage}`;
  }
}

