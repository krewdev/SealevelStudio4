// Meteora DLMM fetcher

import { Connection, PublicKey } from '@solana/web3.js';
import { BasePoolFetcher } from './base';
import { PoolData, FetcherResult, DEXProtocol } from '../types';
import { fetchAllProgramAccountsV2 } from './pagination';

// Meteora DLMM program ID
const METEORA_DLMM_PROGRAM_ID = 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo';

export class MeteoraFetcher extends BasePoolFetcher {
  dex: DEXProtocol = 'meteora';

  async fetchPools(connection: Connection): Promise<FetcherResult> {
    const pools: PoolData[] = [];
    const errors: string[] = [];

    try {
      const programId = METEORA_DLMM_PROGRAM_ID;
      
      // Always try to use getProgramAccountsV2 with pagination first
      // This is required for large datasets like Meteora pools
      const rpcUrl = this.getRpcUrl(connection);
      
      let accounts;
      let usePagination = false;
      
      // Check if RPC supports getProgramAccountsV2 (Helius, QuickNode, etc.)
      const supportsV2 = rpcUrl.includes('helius') || 
                        rpcUrl.includes('quiknode') || 
                        rpcUrl.includes('quicknode') ||
                        process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      
      if (supportsV2) {
        try {
          // Construct RPC URL with API key if needed
          let apiRpcUrl = rpcUrl;
          
          if (rpcUrl.includes('helius') && process.env.NEXT_PUBLIC_HELIUS_API_KEY && !rpcUrl.includes('api-key')) {
            // Extract just the API key if env var is accidentally set to full URL
            let apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
            if (apiKey.includes('helius-rpc.com')) {
              const match = apiKey.match(/[?&]api-key=([^&]+)/);
              apiKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
            }
            
            // Add API key to Helius URL if not present
            const separator = rpcUrl.includes('?') ? '&' : '?';
            apiRpcUrl = `${rpcUrl}${separator}api-key=${apiKey}`;
          }
          
          // Use getProgramAccountsV2 with pagination
          accounts = await fetchAllProgramAccountsV2(
            apiRpcUrl,
            programId,
            {
              limit: 1000, // Fetch 1000 accounts per page
              encoding: 'base64', // Use base64 for better performance
              filters: [{ dataSize: 1024 }], // Filter by data size
            }
          );
          
          usePagination = true;
          console.log(`[Meteora] Fetched ${accounts.length} pools using getProgramAccountsV2 pagination`);
        } catch (paginationError) {
          console.warn('[Meteora] Pagination failed, falling back to standard method:', paginationError);
          // Fall through to standard method
        }
      }
      
      // Fallback to standard getProgramAccounts (with smaller limit to avoid errors)
      if (!usePagination) {
        try {
          const programPubkey = new PublicKey(programId);
          
          // Use a smaller limit to avoid deprioritization
          // Note: This will only get a subset of pools, but avoids errors
          const standardAccounts = await connection.getProgramAccounts(programPubkey, {
            filters: [{ dataSize: 1024 }],
            dataSlice: { offset: 0, length: 1024 },
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
          
          console.log(`[Meteora] Fetched ${accounts.length} pools using standard getProgramAccounts (limited)`);
          
          if (accounts.length > 0) {
            errors.push('Warning: Using limited pool fetch. Consider using Helius RPC with getProgramAccountsV2 for full dataset.');
          }
        } catch (error) {
          errors.push(this.handleError(error, 'fetchPools - both pagination and standard methods failed'));
          return {
            pools: [],
            errors,
            lastUpdated: new Date(),
          };
        }
      }

      // Process all accounts
      if (!accounts || accounts.length === 0) {
        errors.push('No accounts found for Meteora DLMM program');
        return {
          pools,
          errors,
          lastUpdated: new Date(),
        };
      }
      
      console.log(`[Meteora] Processing ${accounts.length} pool accounts...`);
      
      for (const account of accounts) {
        try {
          // Convert data to Buffer if needed
          let accountData = account.account.data;
          if (typeof accountData === 'string') {
            // Already base64 string, convert to Buffer
            accountData = Buffer.from(accountData, 'base64');
          } else if (accountData instanceof Uint8Array && typeof Buffer !== 'undefined') {
            accountData = Buffer.from(accountData);
          }
          
          const pool = await this.parseDLMMPool(connection, account.pubkey, accountData);
          if (pool) {
            pools.push(pool);
          }
        } catch (error) {
          // Don't add every parse error to avoid spam, only log
          if (errors.length < 10) {
            errors.push(this.handleError(error, `Parsing DLMM pool ${account.pubkey}`));
          }
        }
      }
      
      console.log(`[Meteora] Successfully parsed ${pools.length} pools from ${accounts.length} accounts`);

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

      return await this.parseDLMMPool(connection, poolId, accountInfo.data);
    } catch (error) {
      this.handleError(error, `fetchPoolById ${poolId}`);
      return null;
    }
  }

  private async parseDLMMPool(
    connection: Connection,
    poolAddress: string,
    data: Buffer
  ): Promise<PoolData | null> {
    try {
      if (data.length < 1024) {
        return null;
      }

      // DLMM pool structure parsing (simplified)
      // Real implementation would use Anchor IDL or proper deserialization
      // For now, return null as placeholder
      // In production, parse:
      // - mintX (token A)
      // - mintY (token B)
      // - binStep
      // - liquidity
      // - activeId
      // - binMap
      // ... etc

      return null;
    } catch (error) {
      this.handleError(error, `parseDLMMPool ${poolAddress}`);
      return null;
    }
  }
}

