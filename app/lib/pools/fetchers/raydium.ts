// Raydium pool fetcher — public API v3 (GPA on public RPC OOMs)

import { Connection, PublicKey } from '@solana/web3.js';
import { BasePoolFetcher } from './base';
import { PoolData, FetcherResult, DEXProtocol } from '../types';
import { feeToBps, fetchJson, toRawAmount } from './http';

const RAYDIUM_AMM_PROGRAM_ID = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
const MAX_POOLS = 200;

interface RaydiumMint {
  address: string;
  symbol?: string;
  name?: string;
  decimals?: number;
}

interface RaydiumPool {
  id: string;
  programId?: string;
  type?: string;
  mintA: RaydiumMint;
  mintB: RaydiumMint;
  price?: number;
  mintAmountA?: number;
  mintAmountB?: number;
  feeRate?: number;
  tvl?: number;
  day?: { volume?: number };
}

interface RaydiumListResponse {
  success?: boolean;
  data?: {
    count?: number;
    data?: RaydiumPool[];
    hasNextPage?: boolean;
  };
}

export class RaydiumFetcher extends BasePoolFetcher {
  dex: DEXProtocol = 'raydium';

  async fetchPools(_connection: Connection): Promise<FetcherResult> {
    const pools: PoolData[] = [];
    const errors: string[] = [];

    try {
      const pages = 2;
      const pageSize = 100;
      for (let page = 1; page <= pages; page++) {
        const url =
          `https://api-v3.raydium.io/pools/info/list?poolType=standard` +
          `&poolSortField=liquidity&sortType=desc&pageSize=${pageSize}&page=${page}`;
        const json = await fetchJson<RaydiumListResponse>(url, 20_000);
        const rows = json.data?.data || [];
        for (const row of rows) {
          const mapped = this.mapPool(row);
          if (mapped) pools.push(mapped);
        }
        if (!json.data?.hasNextPage) break;
      }

      console.log(`[raydium] HTTP API returned ${pools.length} pools`);
    } catch (error) {
      errors.push(this.handleError(error, 'fetchPools'));
    }

    return {
      pools: pools.slice(0, MAX_POOLS),
      errors: errors.length > 0 ? errors : undefined,
      lastUpdated: new Date(),
    };
  }

  async fetchPoolById(connection: Connection, poolId: string): Promise<PoolData | null> {
    try {
      const url = `https://api-v3.raydium.io/pools/info/ids?ids=${encodeURIComponent(poolId)}`;
      const json = await fetchJson<{ data?: RaydiumPool[] }>(url);
      const row = json.data?.[0];
      return row ? this.mapPool(row) : null;
    } catch (error) {
      this.handleError(error, `fetchPoolById ${poolId}`);
      try {
        new PublicKey(poolId);
      } catch {
        /* ignore */
      }
      return null;
    }
  }

  private mapPool(row: RaydiumPool): PoolData | null {
    try {
      if (!row?.id || !row.mintA?.address || !row.mintB?.address) return null;
      const decimalsA = row.mintA.decimals ?? 9;
      const decimalsB = row.mintB.decimals ?? 9;
      const amountA = Number(row.mintAmountA) || 0;
      const amountB = Number(row.mintAmountB) || 0;
      const price =
        Number(row.price) ||
        (amountA > 0 ? amountB / amountA : 0);
      if (price <= 0 || (amountA <= 0 && amountB <= 0)) return null;

      return {
        id: `raydium-${row.id}`,
        dex: 'raydium',
        tokenA: {
          mint: row.mintA.address,
          symbol: row.mintA.symbol || row.mintA.address.slice(0, 4),
          decimals: decimalsA,
          name: row.mintA.name,
        },
        tokenB: {
          mint: row.mintB.address,
          symbol: row.mintB.symbol || row.mintB.address.slice(0, 4),
          decimals: decimalsB,
          name: row.mintB.name,
        },
        reserves: {
          tokenA: toRawAmount(amountA > 0 ? amountA : 1 / price, decimalsA),
          tokenB: toRawAmount(amountB > 0 ? amountB : 1, decimalsB),
        },
        price,
        fee: feeToBps(row.feeRate, 25),
        volume24h: Number(row.day?.volume) || 0,
        tvl: Number(row.tvl) || 0,
        recentTrades: [],
        lastUpdated: new Date(),
        programId: row.programId || RAYDIUM_AMM_PROGRAM_ID,
        poolAddress: row.id,
      };
    } catch {
      return null;
    }
  }
}
