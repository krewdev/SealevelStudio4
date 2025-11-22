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
      const rpcUrl = this.getRpcUrl(connection);
      const useHelius = rpcUrl.includes('helius') || !!process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      
      let accounts;
      
      if (useHelius) {
        // Use Helius API with getProgramAccountsV2 pagination
        // Don't add API key again if URL already has it
        let heliusRpcUrl = rpcUrl;
        
        // Only add API key if URL doesn't already have one
        if (!heliusRpcUrl.includes('api-key') && process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
          // Extract just the API key if env var is accidentally set to full URL
          let apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
          try {
            // Parse if it's a URL and hostname is 'helius-rpc.com'
            const apiKeyUrl = new URL(apiKey);
            if (apiKeyUrl.hostname === 'helius-rpc.com') {
              // Extract api-key query parameter, fallback to full apiKey if not present
              apiKey = apiKeyUrl.searchParams.get('api-key') ?? apiKey;
            }
          } catch (e) {
            // If apiKey is not a URL, keep as is
          }
          
          const separator = heliusRpcUrl.includes('?') ? '&' : '?';
          heliusRpcUrl = `${heliusRpcUrl}${separator}api-key=${apiKey}`;
        }
        
        try {
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
        } catch (error: any) {
          // If Helius method fails (403, rate limit, etc.), fallback to standard method
          const errorMsg = error?.message || String(error);
          if (errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('401')) {
            console.warn(`[${this.dex}] Helius getProgramAccountsV2 failed (${errorMsg}), falling back to standard method`);
            // Fall through to standard method below
          } else {
            throw error; // Re-throw if it's a different error
          }
        }
      }
      
      // Fallback to standard getProgramAccounts if Helius failed or not using Helius
      if (!accounts) {
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

