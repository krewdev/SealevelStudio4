// Orca Whirlpool fetcher

import { Connection, PublicKey } from '@solana/web3.js';
import { BasePoolFetcher } from './base';
import { PoolData, FetcherResult, DEXProtocol } from '../types';
import { fetchAllProgramAccountsV2 } from './pagination';

// Orca Whirlpool program ID
const ORCA_WHIRLPOOL_PROGRAM_ID = 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc';

export class OrcaFetcher extends BasePoolFetcher {
  dex: DEXProtocol = 'orca';

  async fetchPools(connection: Connection): Promise<FetcherResult> {
    const pools: PoolData[] = [];
    const errors: string[] = [];

    try {
      const programId = ORCA_WHIRLPOOL_PROGRAM_ID;
      
      // Use Helius RPC if available, otherwise fall back to standard RPC
      const rpcUrl = this.getRpcUrl(connection);
      const useHelius = rpcUrl.includes('helius') || !!process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      
      console.log(`[${this.dex}] RPC URL check - useHelius: ${useHelius}, hasHeliusInUrl: ${rpcUrl.includes('helius')}, hasApiKey: ${!!process.env.NEXT_PUBLIC_HELIUS_API_KEY}`);
      
      let accounts;
      
      if (useHelius) {
        // Try Helius API with getProgramAccountsV2 pagination first
        // rpcUrl already contains the API key if it's a Helius endpoint
        // Don't add API key again if URL already has it
        let heliusRpcUrl = rpcUrl;
        
        // Only add API key if URL doesn't already have one
        if (!heliusRpcUrl.includes('api-key') && process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
          // Extract just the API key if env var is accidentally set to full URL
          let apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
          let isUrl = false;
          try {
            const urlObj = new URL(apiKey);
            // Accept mainnet and devnet Helius endpoints
            if (
              urlObj.hostname === 'helius-rpc.com' ||
              urlObj.hostname === 'devnet.helius-rpc.com'
            ) {
              isUrl = true;
            }
          } catch {} // Not a URL
          if (isUrl) {
            // Extract API key from URL format: ...?api-key=KEY&...
            const match = apiKey.match(/[?&]api-key=([^&]+)/);
            apiKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
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
              filters: [{ dataSize: 653 }],
              dataSlice: { offset: 0, length: 653 },
            }
          );
        } catch (error: any) {
          // If Helius method fails, log and re-throw (don't fallback to public RPC which will also fail)
          const errorMsg = error?.message || String(error);
          console.error(`[${this.dex}] Helius getProgramAccountsV2 failed:`, errorMsg);
          console.error(`[${this.dex}] RPC URL used: ${heliusRpcUrl.replace(/api-key=[^&]+/, 'api-key=***')}`);
          
          // Only fallback for auth errors, not rate limits
          if (errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('401')) {
            console.warn(`[${this.dex}] Helius auth error, falling back to standard method`);
            // Fall through to standard method below
          } else if (errorMsg.includes('429') || errorMsg.includes('Too Many Requests')) {
            // Rate limit on Helius - this shouldn't happen, but if it does, don't fallback to public
            throw new Error(`Helius rate limit hit. Please check your Helius plan limits. Original error: ${errorMsg}`);
          } else {
            throw error; // Re-throw if it's a different error
          }
        }
      }
      
      // Fallback to standard getProgramAccounts ONLY if not using Helius
      // If using Helius and it failed, don't fallback (connection is also Helius, will also fail)
      if (!accounts && !useHelius) {
        try {
          console.log(`[${this.dex}] Using standard getProgramAccounts (not using Helius)`);
          const programPubkey = new PublicKey(programId);
          const standardAccounts = await connection.getProgramAccounts(programPubkey, {
            filters: [{ dataSize: 653 }],
            dataSlice: { offset: 0, length: 653 },
            commitment: 'confirmed',
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
          console.log(`[${this.dex}] Fetched ${accounts.length} accounts using standard method`);
        } catch (error) {
          errors.push(this.handleError(error, 'fetchPools'));
        }
      } else if (!accounts && useHelius) {
        // Helius failed and we shouldn't fallback to public RPC
        errors.push(`Helius RPC failed - cannot fetch pools. Check your Helius plan limits.`);
        console.error(`[${this.dex}] Cannot fetch pools - Helius failed and cannot fallback`);
      }

      // Process all accounts
      const accountsToProcess = accounts || [];
      
      for (const account of accountsToProcess) {
        try {
          const pool = await this.parseWhirlpoolAccount(connection, account.pubkey.toString(), account.account.data);
          if (pool) {
            pools.push(pool);
          }
        } catch (error) {
          errors.push(this.handleError(error, `Parsing whirlpool ${account.pubkey.toString()}`));
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

      return await this.parseWhirlpoolAccount(connection, poolId, accountInfo.data);
    } catch (error) {
      this.handleError(error, `fetchPoolById ${poolId}`);
      return null;
    }
  }

  private async parseWhirlpoolAccount(
    connection: Connection,
    poolAddress: string,
    data: Buffer
  ): Promise<PoolData | null> {
    try {
      if (data.length < 653) {
        return null;
      }

      // Whirlpool structure parsing (simplified)
      // Real implementation would use Anchor IDL or proper deserialization
      // For now, return null as placeholder
      // In production, parse:
      // - tokenMintA (offset 8)
      // - tokenVaultA (offset 40)
      // - feeRate (offset 72)
      // - tickSpacing (offset 76)
      // - liquidity (offset 80)
      // - sqrtPrice (offset 88)
      // - tickCurrentIndex (offset 96)
      // - protocolFeeOwedA (offset 100)
      // - protocolFeeOwedB (offset 108)
      // - tokenMintB (offset 116)
      // - tokenVaultB (offset 148)
      // ... etc

      return null;
    } catch (error) {
      this.handleError(error, `parseWhirlpoolAccount ${poolAddress}`);
      return null;
    }
  }
}

