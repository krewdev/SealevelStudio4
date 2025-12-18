/**
 * Helius Transaction Parser Client Library
 * 
 * Client-side utilities for parsing Solana transactions using Helius Enhanced Transaction API
 */

export interface ParsedTransaction {
  signature: string;
  timestamp: number;
  fee: number;
  feePayer: string;
  instructions: Array<{
    programId: string;
    programName?: string;
    type?: string;
    data?: any;
  }>;
  tokenTransfers?: Array<{
    fromTokenAccount?: string;
    toTokenAccount?: string;
    fromUserAccount?: string;
    toUserAccount?: string;
    tokenAmount: number;
    mint: string;
    tokenStandard?: string;
  }>;
  nativeTransfers?: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
  accountData?: Array<{
    account: string;
    nativeBalanceChange?: number;
    tokenBalanceChanges?: Array<{
      userAccount: string;
      tokenAccount: string;
      mint: string;
      rawTokenAmount: {
        tokenAmount: string;
        decimals: number;
      };
      tokenAmount: number;
    }>;
  }>;
  events?: Array<{
    type: string;
    source: string;
    nativeTransfers?: Array<{
      fromUserAccount: string;
      toUserAccount: string;
      amount: number;
    }>;
    tokenTransfers?: Array<{
      fromTokenAccount: string;
      toTokenAccount: string;
      fromUserAccount: string;
      toUserAccount: string;
      tokenAmount: number;
      mint: string;
    }>;
  }>;
  error?: string;
}

export interface AddressTransactionsResponse {
  success: boolean;
  address: string;
  network: string;
  count: number;
  transactions: ParsedTransaction[];
  pagination: {
    limit: number;
    before?: string;
    until?: string;
    hasMore: boolean;
  };
}

export interface ParseTransactionResponse {
  success: boolean;
  transaction: ParsedTransaction;
}

/**
 * Parse a single transaction by signature
 * 
 * @param signature Transaction signature (base58 string)
 * @param network Network to use (mainnet, devnet, testnet)
 * @returns Parsed transaction data
 */
export async function parseTransaction(
  signature: string,
  network: 'mainnet' | 'devnet' | 'testnet' = 'mainnet'
): Promise<ParsedTransaction> {
  const response = await fetch('/api/helius/parse-transaction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ signature, network }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to parse transaction: ${response.status}`);
  }

  const data: ParseTransactionResponse = await response.json();
  return data.transaction;
}

/**
 * Get transaction history for an address
 * 
 * @param address Solana address (public key)
 * @param options Options for fetching transactions
 * @returns Transaction history with pagination info
 */
export async function getAddressTransactions(
  address: string,
  options: {
    network?: 'mainnet' | 'devnet' | 'testnet';
    limit?: number;
    before?: string;
    until?: string;
  } = {}
): Promise<AddressTransactionsResponse> {
  const { network = 'mainnet', limit = 100, before, until } = options;

  const params = new URLSearchParams({
    address,
    network,
    limit: limit.toString(),
  });

  if (before) {
    params.append('before', before);
  }
  if (until) {
    params.append('until', until);
  }

  const response = await fetch(`/api/helius/address-transactions?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || `Failed to fetch transactions: ${response.status}`);
  }

  return response.json();
}

/**
 * Parse multiple transactions by signatures
 * 
 * @param signatures Array of transaction signatures
 * @param network Network to use
 * @returns Array of parsed transactions
 */
export async function parseTransactions(
  signatures: string[],
  network: 'mainnet' | 'devnet' | 'testnet' = 'mainnet'
): Promise<ParsedTransaction[]> {
  // Parse transactions in parallel (with rate limiting)
  const batchSize = 10; // Process 10 at a time to avoid overwhelming the API
  const results: ParsedTransaction[] = [];

  for (let i = 0; i < signatures.length; i += batchSize) {
    const batch = signatures.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(sig => parseTransaction(sig, network).catch(error => {
        console.error(`Failed to parse transaction ${sig}:`, error);
        return null;
      }))
    );
    
    results.push(...batchResults.filter((tx): tx is ParsedTransaction => tx !== null));
    
    // Small delay between batches to avoid rate limiting
    if (i + batchSize < signatures.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Get all transactions for an address (with automatic pagination)
 * 
 * @param address Solana address
 * @param options Options including maxTransactions limit
 * @returns All transactions up to the limit
 */
export async function getAllAddressTransactions(
  address: string,
  options: {
    network?: 'mainnet' | 'devnet' | 'testnet';
    maxTransactions?: number;
  } = {}
): Promise<ParsedTransaction[]> {
  const { network = 'mainnet', maxTransactions = 1000 } = options;
  const allTransactions: ParsedTransaction[] = [];
  let before: string | undefined;
  const limit = 100; // Helius max per request

  while (allTransactions.length < maxTransactions) {
    const response = await getAddressTransactions(address, {
      network,
      limit,
      before,
    });

    allTransactions.push(...response.transactions);

    if (!response.pagination.hasMore || response.transactions.length === 0) {
      break;
    }

    // Use the last transaction signature for pagination
    before = response.transactions[response.transactions.length - 1]?.signature;
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return allTransactions.slice(0, maxTransactions);
}

/**
 * Extract token transfers from a parsed transaction
 */
export function extractTokenTransfers(transaction: ParsedTransaction): Array<{
  from: string;
  to: string;
  mint: string;
  amount: number;
  tokenStandard?: string;
}> {
  const transfers: Array<{
    from: string;
    to: string;
    mint: string;
    amount: number;
    tokenStandard?: string;
  }> = [];

  if (transaction.tokenTransfers) {
    for (const transfer of transaction.tokenTransfers) {
      transfers.push({
        from: transfer.fromUserAccount || transfer.fromTokenAccount || '',
        to: transfer.toUserAccount || transfer.toTokenAccount || '',
        mint: transfer.mint,
        amount: transfer.tokenAmount,
        tokenStandard: transfer.tokenStandard,
      });
    }
  }

  return transfers;
}

/**
 * Extract native SOL transfers from a parsed transaction
 */
export function extractNativeTransfers(transaction: ParsedTransaction): Array<{
  from: string;
  to: string;
  amount: number;
}> {
  const transfers: Array<{
    from: string;
    to: string;
    amount: number;
  }> = [];

  if (transaction.nativeTransfers) {
    for (const transfer of transaction.nativeTransfers) {
      transfers.push({
        from: transfer.fromUserAccount,
        to: transfer.toUserAccount,
        amount: transfer.amount,
      });
    }
  }

  return transfers;
}

/**
 * Get total value transferred in a transaction (SOL + tokens)
 * Note: Token values would need price data to calculate USD value
 */
export function getTransactionValue(transaction: ParsedTransaction): {
  solTransferred: number;
  tokenTransfers: number;
  fee: number;
} {
  const solTransferred = transaction.nativeTransfers?.reduce(
    (sum, transfer) => sum + transfer.amount,
    0
  ) || 0;

  const tokenTransfers = transaction.tokenTransfers?.length || 0;

  return {
    solTransferred,
    tokenTransfers,
    fee: transaction.fee,
  };
}

