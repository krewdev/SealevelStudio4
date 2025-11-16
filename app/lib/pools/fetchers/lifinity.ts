// Lifinity fetcher

import { Connection, PublicKey } from '@solana/web3.js';
import { BasePoolFetcher } from './base';
import { PoolData, FetcherResult, DEXProtocol } from '../types';
import { fetchAllProgramAccountsV2 } from './pagination';

// Lifinity program ID
const LIFINITY_PROGRAM_ID = 'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S';

export class LifinityFetcher extends BasePoolFetcher {
  dex: DEXProtocol = 'lifinity';

  async fetchPools(connection: Connection): Promise<FetcherResult> {
    const pools: PoolData[] = [];
    const errors: string[] = [];

    try {
      const programId = LIFINITY_PROGRAM_ID;
      
      // Use Helius RPC if available, otherwise fall back to standard RPC
      const rpcUrl = connection.rpcEndpoint;
      const useHelius = rpcUrl.includes('helius') || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      
      let accounts;
      
      if (useHelius && process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
        // Use Helius API with getProgramAccountsV2 pagination
        const heliusRpcUrl = rpcUrl.includes('helius') 
          ? rpcUrl 
          : `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`;
        
        accounts = await fetchAllProgramAccountsV2(
          heliusRpcUrl,
          programId,
          {
            limit: 1000,
            encoding: 'jsonParsed',
            filters: [{ dataSize: 512 }],
            dataSlice: { offset: 0, length: 512 },
          }
        );
      } else {
        // Fallback to standard getProgramAccounts
        const programPubkey = new PublicKey(programId);
        const standardAccounts = await connection.getProgramAccounts(programPubkey, {
          filters: [{ dataSize: 512 }],
          dataSlice: { offset: 0, length: 512 },
        });
        
        accounts = standardAccounts.map(acc => ({
          pubkey: acc.pubkey.toString(),
          account: {
            data: acc.account.data,
            executable: acc.account.executable,
            owner: acc.account.owner.toString(),
            lamports: acc.account.lamports,
            rentEpoch: acc.account.rentEpoch,
          },
        }));
      }

      // Process all accounts
      const accountsToProcess = accounts;
      
      for (const account of accountsToProcess) {
        try {
          const pool = await this.parseLifinityPool(connection, account.pubkey.toString(), account.account.data);
          if (pool) {
            pools.push(pool);
          }
        } catch (error) {
          errors.push(this.handleError(error, `Parsing Lifinity pool ${account.pubkey.toString()}`));
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
      const poolPubkey = new PublicKey(poolId);
      const accountInfo = await connection.getAccountInfo(poolPubkey);
      
      if (!accountInfo) {
        return null;
      }

      return await this.parseLifinityPool(connection, poolId, accountInfo.data);
    } catch (error) {
      this.handleError(error, `fetchPoolById ${poolId}`);
      return null;
    }
  }

  private async parseLifinityPool(
    connection: Connection,
    poolAddress: string,
    data: Buffer
  ): Promise<PoolData | null> {
    try {
      if (data.length < 512) {
        return null;
      }

      // Lifinity pool structure parsing (simplified)
      // Real implementation would use Anchor IDL or proper deserialization
      // For now, return null as placeholder
      // In production, parse pool structure from account data

      return null;
    } catch (error) {
      this.handleError(error, `parseLifinityPool ${poolAddress}`);
      return null;
    }
  }
}

