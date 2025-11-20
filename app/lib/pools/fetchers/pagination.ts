/**
 * Pagination utilities for getProgramAccountsV2
 * Handles large datasets efficiently with pagination
 */

export interface PaginatedAccountsResponse {
  accounts: Array<{
    pubkey: string;
    account: {
      data: any;
      executable: boolean;
      owner: string;
      lamports: number;
      rentEpoch?: number;
    };
  }>;
  paginationKey?: string | null;
}

export interface PaginationOptions {
  limit?: number; // Max 10000, default 1000
  encoding?: 'base64' | 'jsonParsed' | 'base58';
  dataSlice?: {
    offset: number;
    length: number;
  };
  filters?: Array<{
    dataSize?: number;
    memcmp?: {
      offset: number;
      bytes: string;
    };
  }>;
  changedSinceSlot?: number;
}

/**
 * Fetch all program accounts with pagination
 * Uses Helius getProgramAccountsV2 method for efficient pagination
 */
export async function fetchAllProgramAccountsV2(
  rpcUrl: string,
  programId: string,
  options: PaginationOptions = {}
): Promise<PaginatedAccountsResponse['accounts']> {
  const {
    limit = 1000,
    encoding = 'jsonParsed',
    dataSlice,
    filters = [],
    changedSinceSlot
  } = options;

  const allAccounts: PaginatedAccountsResponse['accounts'] = [];
  let paginationKey: string | null | undefined = null;
  let pageCount = 0;
  // Reduced max pages to prevent excessive API calls (was 1000, now 50 = max 50,000 accounts per DEX)
  const maxPages = 50; // Safety limit - 50 pages * 10000 limit = 500k accounts max per DEX
  const REQUEST_DELAY = 100; // 100ms delay between requests to avoid rate limits

  do {
    // Helius getProgramAccountsV2 format:
    // method: "getProgramAccountsV2"
    // params: [programId, { encoding, limit, filters, paginationKey, ... }]
    const requestBody = {
      jsonrpc: '2.0' as const,
      id: pageCount + 1,
      method: 'getProgramAccountsV2',
      params: [
        programId,
        {
          encoding,
          limit: Math.min(limit, 10000), // Helius max is 10000
          ...(filters.length > 0 && { filters }),
          ...(dataSlice && { dataSlice }),
          ...(paginationKey && { paginationKey }),
          ...(changedSinceSlot && { changedSinceSlot }),
        },
      ],
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RPC request failed: ${response.statusText}. Response: ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      const errorMsg = data.error.message || JSON.stringify(data.error);
      // Check for method errors or stake-related errors
      if (errorMsg.includes('method') || errorMsg.includes('not found') || errorMsg.includes('stake') || errorMsg.includes('invalid')) {
        throw new Error(`RPC method error: ${errorMsg}. Make sure you're using the correct RPC endpoint and method.`);
      }
      throw new Error(`RPC error: ${errorMsg}`);
    }

    if (!data.result) {
      break;
    }

    const result = data.result as PaginatedAccountsResponse;
    
    if (result.accounts && result.accounts.length > 0) {
      // Transform accounts to match expected format
      const transformedAccounts = result.accounts.map((acc: any) => {
        // Handle different response formats
        const pubkey = acc.pubkey || acc.accountId || (typeof acc === 'string' ? acc : null);
        const accountData = acc.account || acc;
        
        // Handle parsed vs raw data based on encoding
        let data: any;
        if (accountData?.data) {
          // jsonParsed encoding returns parsed data
          if (encoding === 'jsonParsed' && typeof accountData.data === 'object' && accountData.data.parsed) {
            data = accountData.data;
          } 
          // base64 encoding returns string that needs to be converted to Buffer
          else if (encoding === 'base64' && typeof accountData.data === 'string') {
            // Convert base64 string to Buffer
            if (typeof Buffer !== 'undefined') {
              data = Buffer.from(accountData.data, 'base64');
            } else {
              // Browser environment - use Uint8Array
              const binaryString = atob(accountData.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              data = bytes;
            }
          }
          // Already a Buffer or Uint8Array
          else if (accountData.data instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(accountData.data))) {
            data = accountData.data;
          } 
          // Array format (base58 or other)
          else if (Array.isArray(accountData.data)) {
            data = new Uint8Array(accountData.data);
          }
          else {
            data = accountData.data;
          }
        } else {
          data = accountData;
        }

        return {
          pubkey: typeof pubkey === 'string' ? pubkey : pubkey?.toString() || '',
          account: {
            data,
            executable: accountData?.executable || false,
            owner: accountData?.owner || (typeof accountData?.owner === 'string' ? accountData.owner : accountData?.owner?.toString() || ''),
            lamports: accountData?.lamports || 0,
            rentEpoch: accountData?.rentEpoch,
          },
        };
      });

      allAccounts.push(...transformedAccounts);
    }

    paginationKey = result.paginationKey;
    pageCount++;

    // Safety check
    if (pageCount >= maxPages) {
      console.warn(`Reached max pages limit (${maxPages}). Stopping pagination.`);
      break;
    }

    // Rate limiting: Add delay between pagination requests to avoid hitting Helius limits
    if (paginationKey) {
      await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
    }
  } while (paginationKey);

  return allAccounts;
}

/**
 * Fetch program accounts with progress callback
 */
export async function fetchAllProgramAccountsV2WithProgress(
  rpcUrl: string,
  programId: string,
  options: PaginationOptions = {},
  onProgress?: (current: number, total: number | null) => void
): Promise<PaginatedAccountsResponse['accounts']> {
  const accounts: PaginatedAccountsResponse['accounts'] = [];
  let paginationKey: string | null | undefined = null;
  let pageCount = 0;
  const maxPages = 50; // Reduced to prevent excessive API calls
  const REQUEST_DELAY = 100; // 100ms delay between requests

  const {
    limit = 1000,
    encoding = 'jsonParsed',
    dataSlice,
    filters = [],
    changedSinceSlot
  } = options;

  do {
    // Helius getProgramAccountsV2 format
    const requestBody = {
      jsonrpc: '2.0' as const,
      id: pageCount + 1,
      method: 'getProgramAccountsV2',
      params: [
        programId,
        {
          encoding,
          limit: Math.min(limit, 10000),
          ...(filters.length > 0 && { filters }),
          ...(dataSlice && { dataSlice }),
          ...(paginationKey && { paginationKey }),
          ...(changedSinceSlot && { changedSinceSlot }),
        },
      ],
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`RPC request failed: ${response.statusText}. Response: ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      const errorMsg = data.error.message || JSON.stringify(data.error);
      if (errorMsg.includes('method') || errorMsg.includes('not found') || errorMsg.includes('stake') || errorMsg.includes('invalid')) {
        throw new Error(`RPC method error: ${errorMsg}. Make sure you're using the correct RPC endpoint and method.`);
      }
      throw new Error(`RPC error: ${errorMsg}`);
    }

    if (!data.result) {
      break;
    }

    const result = data.result as PaginatedAccountsResponse;
    
    if (result.accounts && result.accounts.length > 0) {
      const transformedAccounts = result.accounts.map((acc: any) => {
        // Handle different response formats
        const pubkey = acc.pubkey || acc.accountId || (typeof acc === 'string' ? acc : null);
        const accountData = acc.account || acc;
        
        // Handle parsed vs raw data based on encoding
        let data: any;
        if (accountData?.data) {
          // jsonParsed encoding returns parsed data
          if (encoding === 'jsonParsed' && typeof accountData.data === 'object' && accountData.data.parsed) {
            data = accountData.data;
          } 
          // base64 encoding returns string that needs to be converted to Buffer
          else if (encoding === 'base64' && typeof accountData.data === 'string') {
            // Convert base64 string to Buffer
            if (typeof Buffer !== 'undefined') {
              data = Buffer.from(accountData.data, 'base64');
            } else {
              // Browser environment - use Uint8Array
              const binaryString = atob(accountData.data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              data = bytes;
            }
          }
          // Already a Buffer or Uint8Array
          else if (accountData.data instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(accountData.data))) {
            data = accountData.data;
          } 
          // Array format (base58 or other)
          else if (Array.isArray(accountData.data)) {
            data = new Uint8Array(accountData.data);
          }
          else {
            data = accountData.data;
          }
        } else {
          data = accountData;
        }

        return {
          pubkey: typeof pubkey === 'string' ? pubkey : pubkey?.toString() || '',
          account: {
            data,
            executable: accountData?.executable || false,
            owner: accountData?.owner || (typeof accountData?.owner === 'string' ? accountData.owner : accountData?.owner?.toString() || ''),
            lamports: accountData?.lamports || 0,
            rentEpoch: accountData?.rentEpoch,
          },
        };
      });

      accounts.push(...transformedAccounts);
      
      // Report progress
      if (onProgress) {
        onProgress(accounts.length, null); // Total unknown until done
      }
    }

    paginationKey = result.paginationKey;
    pageCount++;

    if (pageCount >= maxPages) {
      console.warn(`Reached max pages limit (${maxPages}). Stopping pagination.`);
      break;
    }

    if (paginationKey) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  } while (paginationKey);

  // Final progress update
  if (onProgress) {
    onProgress(accounts.length, accounts.length);
  }

  return accounts;
}
