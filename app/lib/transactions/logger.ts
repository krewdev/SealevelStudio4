/**
 * Transaction Logger Utility
 * Client-side helper to log transactions to the database
 */

export interface TransactionLogData {
  featureName: string;
  transactionType: string;
  transactionSignature?: string;
  transactionData?: any;
  status?: 'pending' | 'success' | 'failed' | 'cancelled';
  errorMessage?: string;
  network?: 'mainnet' | 'devnet' | 'testnet';
}

/**
 * Log a transaction for a specific feature
 */
export async function logTransaction(
  userWalletAddress: string,
  userWalletId: string,
  data: TransactionLogData
): Promise<{ success: boolean; transactionId?: number; error?: string }> {
  try {
    const response = await fetch('/api/transactions/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userWalletAddress,
        userWalletId,
        ...data,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Failed to log transaction:', result.error);
      return { success: false, error: result.error };
    }

    return {
      success: true,
      transactionId: result.transactionId,
    };
  } catch (error) {
    console.error('Transaction logging error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Update transaction status
 */
export async function updateTransactionStatus(
  transactionId: number,
  status: 'pending' | 'success' | 'failed' | 'cancelled',
  transactionSignature?: string,
  errorMessage?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/transactions/log', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transactionId,
        status,
        transactionSignature,
        errorMessage,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error('Failed to update transaction:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Transaction update error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get recent transactions for a user/feature
 */
export async function getRecentTransactions(
  walletAddress: string,
  featureName?: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
  try {
    const params = new URLSearchParams({
      walletAddress,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (featureName) {
      params.append('feature', featureName);
    }

    const response = await fetch(`/api/transactions/recent?${params.toString()}`);

    const result = await response.json();

    if (!result.success) {
      console.error('Failed to get transactions:', result.error);
      return { success: false, error: result.error };
    }

    return {
      success: true,
      transactions: result.transactions || [],
    };
  } catch (error) {
    console.error('Get transactions error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

