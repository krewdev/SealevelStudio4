/**
 * Hook for logging transactions
 * Simplifies transaction logging across the app
 */

import { useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { useNetwork } from '../contexts/NetworkContext';
import { logTransaction, updateTransactionStatus } from '../lib/transactions/logger';

export function useTransactionLogger() {
  const { user } = useUser();
  const { network } = useNetwork();

  const log = useCallback(async (
    featureName: string,
    transactionType: string,
    transactionData?: any,
    transactionSignature?: string
  ): Promise<number | null> => {
    if (!user) {
      console.warn('Cannot log transaction: user not logged in');
      return null;
    }

    const result = await logTransaction(
      user.walletAddress,
      user.walletId,
      {
        featureName,
        transactionType,
        transactionData,
        transactionSignature,
        status: 'pending',
        network: network as 'mainnet' | 'devnet' | 'testnet',
      }
    );

    return result.success ? result.transactionId || null : null;
  }, [user, network]);

  const updateStatus = useCallback(async (
    transactionId: number,
    status: 'pending' | 'success' | 'failed' | 'cancelled',
    transactionSignature?: string,
    errorMessage?: string
  ) => {
    await updateTransactionStatus(transactionId, status, transactionSignature, errorMessage);
  }, []);

  return { log, updateStatus };
}

