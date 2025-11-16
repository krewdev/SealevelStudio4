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
  const maxPages = 1000; // Safety limit to prevent infinite loops

  do {
    const params: any = {
      encoding,
      limit: Math.min(limit, 10000), // Helius max is 10000
    };

    if (paginationKey) {
      params.paginationKey = paginationKey;
    }

    if (dataSlice) {
      params.dataSlice = dataSlice;
    }

    if (filters.length > 0) {
      params.filters = filters;
    }

    if (changedSinceSlot) {
      params.changedSinceSlot = changedSinceSlot;
    }

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: pageCount + 1,
        method: 'getProgramAccountsV2',
        params: [programId, params],
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
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
        
        // Handle parsed vs raw data
        let data: any;
        if (accountData?.data) {
          // jsonParsed encoding returns parsed data
          if (typeof accountData.data === 'object' && accountData.data.parsed) {
            data = accountData.data;
          } else if (accountData.data instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(accountData.data))) {
            data = accountData.data;
          } else {
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

    // Small delay to avoid rate limiting
    if (paginationKey) {
      await new Promise(resolve => setTimeout(resolve, 50));
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
  const maxPages = 1000;

  const {
    limit = 1000,
    encoding = 'jsonParsed',
    dataSlice,
    filters = [],
    changedSinceSlot
  } = options;

  do {
    const params: any = {
      encoding,
      limit: Math.min(limit, 10000),
    };

    if (paginationKey) {
      params.paginationKey = paginationKey;
    }

    if (dataSlice) {
      params.dataSlice = dataSlice;
    }

    if (filters.length > 0) {
      params.filters = filters;
    }

    if (changedSinceSlot) {
      params.changedSinceSlot = changedSinceSlot;
    }

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: pageCount + 1,
        method: 'getProgramAccountsV2',
        params: [programId, params],
      }),
    });

    if (!response.ok) {
      throw new Error(`RPC request failed: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message || JSON.stringify(data.error)}`);
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
        
        // Handle parsed vs raw data
        let data: any;
        if (accountData?.data) {
          // jsonParsed encoding returns parsed data
          if (typeof accountData.data === 'object' && accountData.data.parsed) {
            data = accountData.data;
          } else if (accountData.data instanceof Uint8Array || (typeof Buffer !== 'undefined' && Buffer.isBuffer(accountData.data))) {
            data = accountData.data;
          } else {
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

