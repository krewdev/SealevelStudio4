// Jupiter aggregator fetcher

import { Connection } from '@solana/web3.js';
import { BasePoolFetcher } from './base';
import { PoolData, FetcherResult, DEXProtocol, TokenInfo, WSOL_MINT } from '../types';

// Jupiter API endpoints (using lite API for better performance)
const JUPITER_API_BASE = 'https://lite-api.jup.ag/v6';
const JUPITER_PRICE_API = 'https://price.jup.ag/v4';

export class JupiterFetcher extends BasePoolFetcher {
  dex: DEXProtocol = 'jupiter';

  async fetchPools(connection: Connection): Promise<FetcherResult> {
    const pools: PoolData[] = [];
    const errors: string[] = [];

    try {
      // Jupiter is an aggregator, so we fetch price data and routes
      // Get popular token pairs
      const popularTokens = [
        WSOL_MINT, // SOL
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
        'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
      ];

      // Fetch prices for token pairs
      for (let i = 0; i < popularTokens.length; i++) {
        for (let j = i + 1; j < popularTokens.length; j++) {
          try {
            const tokenA = popularTokens[i];
            const tokenB = popularTokens[j];
            
            // Get price quote
            const quote = await this.fetchQuote(tokenA, tokenB, '1000000'); // 1 token (assuming 6 decimals)
            
            if (quote) {
              const tokenAInfo = await this.fetchTokenInfo(connection, tokenA);
              const tokenBInfo = await this.fetchTokenInfo(connection, tokenB);
              
              const pool: PoolData = {
                id: `jupiter-${tokenA}-${tokenB}`,
                dex: 'jupiter',
                tokenA: {
                  mint: tokenA,
                  symbol: tokenAInfo.symbol,
                  decimals: tokenAInfo.decimals,
                },
                tokenB: {
                  mint: tokenB,
                  symbol: tokenBInfo.symbol,
                  decimals: tokenBInfo.decimals,
                },
                reserves: {
                  tokenA: BigInt(0), // Jupiter doesn't have reserves
                  tokenB: BigInt(0),
                },
                price: quote.price || 0,
                fee: quote.fee || 30, // Default fee estimate
                volume24h: 0, // Would need to fetch from Jupiter API
                tvl: 0, // Aggregator doesn't have TVL
                recentTrades: [],
                lastUpdated: new Date(),
              };
              
              pools.push(pool);
            }
          } catch (error) {
            errors.push(this.handleError(error, `Fetching quote for ${popularTokens[i]}-${popularTokens[j]}`));
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
    // Jupiter pools are virtual, identified by token pair
    const match = poolId.match(/jupiter-(.+)-(.+)/);
    if (!match) {
      return null;
    }

    try {
      const tokenA = match[1];
      const tokenB = match[2];
      
      const quote = await this.fetchQuote(tokenA, tokenB, '1000000');
      if (!quote) {
        return null;
      }

      const tokenAInfo = await this.fetchTokenInfo(connection, tokenA);
      const tokenBInfo = await this.fetchTokenInfo(connection, tokenB);

      return {
        id: poolId,
        dex: 'jupiter',
        tokenA: {
          mint: tokenA,
          symbol: tokenAInfo.symbol,
          decimals: tokenAInfo.decimals,
        },
        tokenB: {
          mint: tokenB,
          symbol: tokenBInfo.symbol,
          decimals: tokenBInfo.decimals,
        },
        reserves: {
          tokenA: BigInt(0),
          tokenB: BigInt(0),
        },
        price: quote.price || 0,
        fee: quote.fee || 30,
        volume24h: 0,
        tvl: 0,
        recentTrades: [],
        lastUpdated: new Date(),
      };
    } catch (error) {
      this.handleError(error, `fetchPoolById ${poolId}`);
      return null;
    }
  }

  private async fetchQuote(
    inputMint: string,
    outputMint: string,
    amount: string
  ): Promise<{ price: number; fee: number } | null> {
    try {
      // Use Next.js API route to proxy requests (fixes CORS issues)
      const url = `/api/jupiter/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;
      const response = await fetch(url);
      
      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      
      if (data && data.price !== undefined) {
        return { price: data.price, fee: data.fee || 30 };
      }

      return null;
    } catch (error) {
      this.handleError(error, `fetchQuote ${inputMint}-${outputMint}`);
      return null;
    }
  }
}

