// Orca Whirlpool fetcher — public HTTP API first (GPA is a stub without Helius)

import { Connection, PublicKey } from '@solana/web3.js';
import { BasePoolFetcher } from './base';
import { PoolData, FetcherResult, DEXProtocol } from '../types';
import { feeToBps, fetchJson, toRawAmount } from './http';

const ORCA_WHIRLPOOL_PROGRAM_ID = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';
const ORCA_LIST_URL = 'https://api.mainnet.orca.so/v1/whirlpool/list';
const MAX_POOLS = 200;

interface OrcaToken {
  mint: string;
  symbol?: string;
  name?: string;
  decimals?: number;
}

interface OrcaWhirlpool {
  address: string;
  tokenA: OrcaToken;
  tokenB: OrcaToken;
  price?: number;
  lpFeeRate?: number;
  tvl?: number;
  volume?: { day?: number } | number;
}

export class OrcaFetcher extends BasePoolFetcher {
  dex: DEXProtocol = 'orca';

  async fetchPools(connection: Connection): Promise<FetcherResult> {
    const pools: PoolData[] = [];
    const errors: string[] = [];

    try {
      const data = await fetchJson<{ whirlpools?: OrcaWhirlpool[] }>(ORCA_LIST_URL, 25_000);
      const whirlpools = Array.isArray(data.whirlpools) ? data.whirlpools : [];

      const ranked = whirlpools
        .filter((p) => p?.address && p.tokenA?.mint && p.tokenB?.mint && (p.tvl || 0) > 1_000 && (p.price || 0) > 0)
        .sort((a, b) => (b.tvl || 0) - (a.tvl || 0))
        .slice(0, MAX_POOLS);

      for (const wp of ranked) {
        const mapped = this.mapWhirlpool(wp);
        if (mapped) pools.push(mapped);
      }

      console.log(`[orca] HTTP API returned ${pools.length} pools (from ${whirlpools.length})`);
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
      const poolPubkey = new PublicKey(poolId);
      await connection.getAccountInfo(poolPubkey);
      // Full on-chain parse is not implemented; refresh via list instead.
      const result = await this.fetchPools(connection);
      return result.pools.find((p) => p.poolAddress === poolId || p.id === poolId) || null;
    } catch (error) {
      this.handleError(error, `fetchPoolById ${poolId}`);
      return null;
    }
  }

  private mapWhirlpool(wp: OrcaWhirlpool): PoolData | null {
    try {
      const decimalsA = wp.tokenA.decimals ?? 9;
      const decimalsB = wp.tokenB.decimals ?? 6;
      const price = Number(wp.price) || 0;
      const tvl = Number(wp.tvl) || 0;
      if (price <= 0) return null;

      // Synthetic CP reserves consistent with mid price + TVL (tokenB ~ USD fallback).
      const amountB = tvl > 0 ? tvl / 2 : 1;
      const amountA = amountB / price;

      const volume24h =
        typeof wp.volume === 'number'
          ? wp.volume
          : Number((wp.volume as { day?: number } | undefined)?.day) || 0;

      return {
        id: `orca-${wp.address}`,
        dex: 'orca',
        tokenA: {
          mint: wp.tokenA.mint,
          symbol: wp.tokenA.symbol || wp.tokenA.mint.slice(0, 4),
          decimals: decimalsA,
          name: wp.tokenA.name,
        },
        tokenB: {
          mint: wp.tokenB.mint,
          symbol: wp.tokenB.symbol || wp.tokenB.mint.slice(0, 4),
          decimals: decimalsB,
          name: wp.tokenB.name,
        },
        reserves: {
          tokenA: toRawAmount(amountA, decimalsA),
          tokenB: toRawAmount(amountB, decimalsB),
        },
        price,
        fee: feeToBps(wp.lpFeeRate, 30),
        volume24h,
        tvl,
        recentTrades: [],
        lastUpdated: new Date(),
        programId: ORCA_WHIRLPOOL_PROGRAM_ID,
        poolAddress: wp.address,
      };
    } catch {
      return null;
    }
  }
}
