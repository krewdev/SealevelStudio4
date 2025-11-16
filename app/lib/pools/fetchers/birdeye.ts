// Birdeye API fetcher for price, volume, and market data

import { Connection } from '@solana/web3.js';
import { BasePoolFetcher } from './base';
import { PoolData, FetcherResult, DEXProtocol, TokenInfo } from '../types';

export class BirdeyeFetcher extends BasePoolFetcher {
  dex: DEXProtocol = 'birdeye';

  async fetchPools(connection: Connection): Promise<FetcherResult> {
    const pools: PoolData[] = [];
    const errors: string[] = [];

    try {
      // Fetch popular token pairs from Birdeye
      // Note: API key is handled server-side in the API route
      const popularTokens = [
        'So11111111111111111111111111111111111111112', // SOL
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      ];

      // Fetch price and volume data for token pairs
      for (let i = 0; i < popularTokens.length; i++) {
        for (let j = i + 1; j < popularTokens.length; j++) {
          try {
            const tokenA = popularTokens[i];
            const tokenB = popularTokens[j];

            // Fetch price data (API key handled server-side)
            const priceResponse = await fetch(`/api/birdeye/prices?address=${tokenA}&type=price`);
            if (priceResponse.ok) {
              const priceData = await priceResponse.json();
              
              // Fetch pairs data to get pool information
              const pairsResponse = await fetch(`/api/birdeye/prices?address=${tokenA}&type=pairs`);
              
              if (pairsResponse.ok) {
                const pairsData = await pairsResponse.json();
                
                // Parse Birdeye pairs data to extract pool information
                // This is simplified - actual parsing depends on Birdeye API structure
                if (pairsData && pairsData.data) {
                  // Extract pool data from Birdeye response
                  // Placeholder for actual parsing
                }
              }
            }
          } catch (error) {
            errors.push(this.handleError(error, `Fetching Birdeye data for ${popularTokens[i]}-${popularTokens[j]}`));
          }
        }
      }

    } catch (error) {
      errors.push(this.handleError(error, 'fetchPools'));
    }

    return {
      pools,
      errors: errors.length > 0 ? errors : undefined,
      lastUpdated: new Date(),
    };
  }

  async fetchPoolById(connection: Connection, poolId: string): Promise<PoolData | null> {
    try {
      // Fetch specific pool data from Birdeye
      // Note: API key is handled server-side in the API route
      // Placeholder - implement actual Birdeye pool lookup
      return null;
    } catch (error) {
      this.handleError(error, `fetchPoolById ${poolId}`);
      return null;
    }
  }

  // Helper method to enrich pool data with Birdeye market data
  async enrichPoolData(pool: PoolData): Promise<PoolData> {
    try {
      // Fetch volume and market data (API key handled server-side)
      const volumeResponse = await fetch(`/api/birdeye/prices?address=${pool.tokenA.mint}&type=volume`);
      
      if (volumeResponse.ok) {
        const volumeData = await volumeResponse.json();
        
        // Update pool with Birdeye data
        if (volumeData && volumeData.data) {
          pool.volume24h = volumeData.data.volume24h || pool.volume24h;
          pool.tvl = volumeData.data.tvl || pool.tvl;
        }
      }
    } catch (error) {
      this.handleError(error, `enrichPoolData ${pool.id}`);
    }

    return pool;
  }

  /**
   * Fetch OHLCV (Open, High, Low, Close, Volume) data for a pair
   * @param pairAddress - Pair address (pool address)
   * @param type - Time interval (15s, 1m, 5m, 15m, 1h, 1d, etc.)
   * @param timeFrom - Start timestamp (Unix seconds)
   * @param timeTo - End timestamp (Unix seconds)
   * @param mode - 'range' or 'last'
   */
  async fetchOHLCV(
    pairAddress: string,
    type: string = '15m',
    timeFrom?: number,
    timeTo?: number,
    mode: 'range' | 'last' = 'range'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        address: pairAddress,
        type,
        mode,
        padding: 'false',
        outlier: 'true',
        inversion: 'false',
      });

      if (timeFrom !== undefined) {
        params.append('time_from', timeFrom.toString());
      }
      if (timeTo !== undefined) {
        params.append('time_to', timeTo.toString());
      }

      const response = await fetch(`/api/birdeye/ohlcv?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`OHLCV fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `fetchOHLCV ${pairAddress}`);
      return null;
    }
  }

  /**
   * Fetch prices for multiple tokens in a single request
   * @param addresses - Array of token mint addresses
   * @param uiAmountMode - 'raw' (lamports) or 'ui' (human-readable)
   */
  async fetchMultiPrice(
    addresses: string[],
    uiAmountMode: 'raw' | 'ui' = 'raw'
  ): Promise<any> {
    try {
      if (addresses.length === 0) {
        throw new Error('At least one address is required');
      }

      const listAddress = addresses.join(',');

      const response = await fetch('/api/birdeye/multi-price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          list_address: listAddress,
          ui_amount_mode: uiAmountMode,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Multi-price fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `fetchMultiPrice`);
      return null;
    }
  }

  /**
   * Fetch token transactions sorted by time
   * @param tokenAddress - Token mint address
   * @param offset - Pagination offset (default: 0)
   * @param limit - Number of transactions to return (default: 100, max: 1000)
   * @param txType - Transaction type: 'swap', 'transfer', or 'all' (default: 'all')
   * @param uiAmountMode - 'raw', 'ui', or 'scaled' (default: 'scaled')
   * @param timeFrom - Optional start timestamp (Unix seconds)
   * @param timeTo - Optional end timestamp (Unix seconds)
   */
  async fetchTokenTransactions(
    tokenAddress: string,
    offset: number = 0,
    limit: number = 100,
    txType: 'swap' | 'transfer' | 'all' = 'all',
    uiAmountMode: 'raw' | 'ui' | 'scaled' = 'scaled',
    timeFrom?: number,
    timeTo?: number
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        address: tokenAddress,
        offset: offset.toString(),
        limit: Math.min(limit, 1000).toString(),
        tx_type: txType,
        ui_amount_mode: uiAmountMode,
      });

      if (timeFrom !== undefined) {
        params.append('time_from', timeFrom.toString());
      }
      if (timeTo !== undefined) {
        params.append('time_to', timeTo.toString());
      }

      const response = await fetch(`/api/birdeye/txs/token/seek_by_time?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Token transactions fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `fetchTokenTransactions ${tokenAddress}`);
      return null;
    }
  }

  /**
   * Fetch pair (pool) transactions sorted by time
   * @param pairAddress - Pair/pool address
   * @param offset - Pagination offset (default: 0)
   * @param limit - Number of transactions to return (default: 100, max: 1000)
   * @param txType - Transaction type: 'swap', 'transfer', or 'all' (default: 'all')
   * @param uiAmountMode - 'raw', 'ui', or 'scaled' (default: 'scaled')
   * @param timeFrom - Optional start timestamp (Unix seconds)
   * @param timeTo - Optional end timestamp (Unix seconds)
   */
  async fetchPairTransactions(
    pairAddress: string,
    offset: number = 0,
    limit: number = 100,
    txType: 'swap' | 'transfer' | 'all' = 'all',
    uiAmountMode: 'raw' | 'ui' | 'scaled' = 'scaled',
    timeFrom?: number,
    timeTo?: number
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        address: pairAddress,
        offset: offset.toString(),
        limit: Math.min(limit, 1000).toString(),
        tx_type: txType,
        ui_amount_mode: uiAmountMode,
      });

      if (timeFrom !== undefined) {
        params.append('time_from', timeFrom.toString());
      }
      if (timeTo !== undefined) {
        params.append('time_to', timeTo.toString());
      }

      const response = await fetch(`/api/birdeye/txs/pair/seek_by_time?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Pair transactions fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `fetchPairTransactions ${pairAddress}`);
      return null;
    }
  }

  /**
   * Fetch transactions using v3 API with advanced sorting
   * @param offset - Pagination offset (default: 0)
   * @param limit - Number of transactions to return (default: 100, max: 1000)
   * @param sortBy - Sort field: 'block_unix_time', 'amount', or 'signature' (default: 'block_unix_time')
   * @param sortType - Sort direction: 'asc' or 'desc' (default: 'desc')
   * @param txType - Transaction type: 'swap', 'transfer', or 'all' (default: 'all')
   * @param uiAmountMode - 'raw', 'ui', or 'scaled' (default: 'scaled')
   * @param address - Optional: Filter by token or pair address
   * @param timeFrom - Optional start timestamp (Unix seconds)
   * @param timeTo - Optional end timestamp (Unix seconds)
   */
  async fetchTransactionsV3(
    offset: number = 0,
    limit: number = 100,
    sortBy: 'block_unix_time' | 'amount' | 'signature' = 'block_unix_time',
    sortType: 'asc' | 'desc' = 'desc',
    txType: 'swap' | 'transfer' | 'all' = 'all',
    uiAmountMode: 'raw' | 'ui' | 'scaled' = 'scaled',
    address?: string,
    timeFrom?: number,
    timeTo?: number
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: Math.min(limit, 1000).toString(),
        sort_by: sortBy,
        sort_type: sortType,
        tx_type: txType,
        ui_amount_mode: uiAmountMode,
      });

      if (address) {
        params.append('address', address);
      }
      if (timeFrom !== undefined) {
        params.append('time_from', timeFrom.toString());
      }
      if (timeTo !== undefined) {
        params.append('time_to', timeTo.toString());
      }

      const response = await fetch(`/api/birdeye/txs/v3?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Transactions v3 fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `fetchTransactionsV3`);
      return null;
    }
  }

  /**
   * Fetch OHLCV data for base/quote token pairs
   * @param baseAddress - Base token mint address
   * @param quoteAddress - Quote token mint address
   * @param type - Time interval (default: '1m')
   * @param uiAmountMode - 'raw', 'ui', or 'scaled' (default: 'raw')
   * @param timeFrom - Optional start timestamp (Unix seconds)
   * @param timeTo - Optional end timestamp (Unix seconds)
   */
  async fetchOHLCVBaseQuote(
    baseAddress: string,
    quoteAddress: string,
    type: string = '1m',
    uiAmountMode: 'raw' | 'ui' | 'scaled' = 'raw',
    timeFrom?: number,
    timeTo?: number
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        base: baseAddress,
        quote: quoteAddress,
        type,
        ui_amount_mode: uiAmountMode,
      });

      if (timeFrom !== undefined) {
        params.append('time_from', timeFrom.toString());
      }
      if (timeTo !== undefined) {
        params.append('time_to', timeTo.toString());
      }

      const response = await fetch(`/api/birdeye/ohlcv/base_quote?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`OHLCV base_quote fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `fetchOHLCVBaseQuote`);
      return null;
    }
  }

  /**
   * Search for tokens and markets
   * @param query - Search query (token symbol, name, or address)
   * @param limit - Number of results (default: 10, max: 50)
   */
  async searchTokens(query: string, limit: number = 10): Promise<any> {
    try {
      const response = await fetch(`/api/birdeye/search?query=${encodeURIComponent(query)}&limit=${Math.min(limit, 50)}`);
      
      if (!response.ok) {
        throw new Error(`Token search failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `searchTokens`);
      return null;
    }
  }

  /**
   * Get token list with trading activity
   * @param offset - Pagination offset (default: 0)
   * @param limit - Number of tokens (default: 50, max: 100)
   * @param sortBy - Sort field (default: 'v24hUSD')
   * @param sortType - 'asc' or 'desc' (default: 'desc')
   */
  async fetchTokenList(
    offset: number = 0,
    limit: number = 50,
    sortBy: string = 'v24hUSD',
    sortType: 'asc' | 'desc' = 'desc'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        offset: offset.toString(),
        limit: Math.min(limit, 100).toString(),
        sort_by: sortBy,
        sort_type: sortType,
      });

      const response = await fetch(`/api/birdeye/token-list?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Token list fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `fetchTokenList`);
      return null;
    }
  }

  /**
   * Get detailed token overview
   * @param tokenAddress - Token mint address
   */
  async fetchTokenOverview(tokenAddress: string): Promise<any> {
    try {
      const response = await fetch(`/api/birdeye/token-overview?address=${encodeURIComponent(tokenAddress)}`);
      
      if (!response.ok) {
        throw new Error(`Token overview fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `fetchTokenOverview ${tokenAddress}`);
      return null;
    }
  }

  /**
   * Get token security information
   * @param tokenAddress - Token mint address
   */
  async fetchTokenSecurity(tokenAddress: string): Promise<any> {
    try {
      const response = await fetch(`/api/birdeye/token-security?address=${encodeURIComponent(tokenAddress)}`);
      
      if (!response.ok) {
        throw new Error(`Token security fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `fetchTokenSecurity ${tokenAddress}`);
      return null;
    }
  }

  /**
   * Get historical price data
   * @param tokenAddress - Token mint address
   * @param type - Time period type (default: '1D')
   * @param timeFrom - Optional start timestamp (Unix seconds)
   * @param timeTo - Optional end timestamp (Unix seconds)
   */
  async fetchPriceHistory(
    tokenAddress: string,
    type: string = '1D',
    timeFrom?: number,
    timeTo?: number
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        address: tokenAddress,
        type,
      });

      if (timeFrom !== undefined) {
        params.append('time_from', timeFrom.toString());
      }
      if (timeTo !== undefined) {
        params.append('time_to', timeTo.toString());
      }

      const response = await fetch(`/api/birdeye/price-history?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Price history fetch failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.handleError(error, `fetchPriceHistory ${tokenAddress}`);
      return null;
    }
  }
}

