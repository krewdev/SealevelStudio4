/**
 * Custodial Wallet Signer Utility
 * Automatically signs transactions with custodial wallet when user has one
 */

import { Transaction, VersionedTransaction, Keypair, Connection, PublicKey } from '@solana/web3.js';

export interface CustodialSignerOptions {
  userWalletAddress?: string | null;
  connection: Connection;
}

/**
 * Sign a transaction using the custodial wallet API
 */
export async function signWithCustodialWallet(
  transaction: Transaction | VersionedTransaction,
  options: CustodialSignerOptions
): Promise<Transaction | VersionedTransaction> {
  const { userWalletAddress, connection } = options;

  // Only use custodial wallet if user has one
  if (!userWalletAddress) {
    throw new Error('No custodial wallet available');
  }

  // Serialize transaction to base64
  const transactionBase64 = transaction.serialize({ requireAllSignatures: false }).toString('base64');

  // Call signing API
  const response = await fetch('/api/wallet/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transaction: transactionBase64,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to sign transaction' }));
    throw new Error(error.error || 'Failed to sign transaction with custodial wallet');
  }

  const data = await response.json();
  if (!data.success || !data.signedTransaction) {
    throw new Error(data.error || 'Failed to sign transaction');
  }

  // Deserialize signed transaction
  const signedBuffer = Buffer.from(data.signedTransaction, 'base64');
  
  // Try to deserialize as VersionedTransaction first
  try {
    return VersionedTransaction.deserialize(signedBuffer);
  } catch {
    // Fall back to legacy Transaction
    return Transaction.from(signedBuffer);
  }
}

/**
 * Sign transaction and all additional signers (new keypairs)
 * This handles the case where transactions create new accounts that need signing
 */
export async function signTransactionWithCustodialAndSigners(
  transaction: Transaction | VersionedTransaction,
  additionalSigners: Keypair[],
  options: CustodialSignerOptions
): Promise<Transaction | VersionedTransaction> {
  // First sign with custodial wallet (main payer)
  let signedTx = await signWithCustodialWallet(transaction, options);

  // Then sign with additional signers (new keypairs created in the transaction)
  if (additionalSigners.length > 0) {
    if (signedTx instanceof VersionedTransaction) {
      signedTx.sign(additionalSigners);
    } else {
      (signedTx as Transaction).partialSign(...additionalSigners);
    }
  }

  return signedTx;
}

/**
 * Check if user has custodial wallet and should use it for signing
 */
export function shouldUseCustodialWallet(userWalletAddress: string | null | undefined): boolean {
  return !!userWalletAddress;
}

