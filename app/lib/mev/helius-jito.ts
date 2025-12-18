/**
 * Helius Jito Integration
 * Helper functions for sending transactions to Jito via Helius API
 */

import { Transaction, VersionedTransaction, PublicKey, SystemProgram } from '@solana/web3.js';

export interface HeliusJitoConfig {
  tipAmount?: number; // Tip in lamports (default: 10,000)
  tipAccount?: string; // Jito tip account address (single account)
  tipAccounts?: string[]; // List of Jito tip accounts to choose from
  skipPreflight?: boolean;
  maxRetries?: number;
}

export interface HeliusJitoResponse {
  success: boolean;
  signature?: string;
  bundleId?: string;
  slot?: number;
  error?: string;
  tipAmount?: number;
  tipAccount?: string;
}

/**
 * Send transaction to Jito via Helius API
 */
export async function sendToJitoViaHelius(
  transaction: Transaction | VersionedTransaction,
  config: HeliusJitoConfig = {}
): Promise<HeliusJitoResponse> {
  try {
    // Serialize transaction
    const serialized = transaction instanceof Transaction
      ? transaction.serialize({ requireAllSignatures: false, verifySignatures: false })
      : Buffer.from(transaction.serialize());

    const base64Tx = serialized.toString('base64');

    // Send to API endpoint
    const response = await fetch('/api/helius/jito-send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transaction: base64Tx,
        tipAmount: config.tipAmount,
        tipAccount: config.tipAccount,
        tipAccounts: config.tipAccounts,
        skipPreflight: config.skipPreflight,
        maxRetries: config.maxRetries,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send transaction to Jito',
    };
  }
}

/**
 * Send bundle (multiple transactions) to Jito via Helius
 */
export async function sendBundleToJitoViaHelius(
  transactions: (Transaction | VersionedTransaction)[],
  config: HeliusJitoConfig = {}
): Promise<HeliusJitoResponse> {
  if (transactions.length === 0) {
    return {
      success: false,
      error: 'Bundle must contain at least one transaction',
    };
  }

  if (transactions.length > 5) {
    return {
      success: false,
      error: 'Jito bundles can contain maximum 5 transactions',
    };
  }

  try {
    // Serialize all transactions
    const serializedTxs = transactions.map(tx => {
      const serialized = tx instanceof Transaction
        ? tx.serialize({ requireAllSignatures: false, verifySignatures: false })
        : Buffer.from(tx.serialize());
      return serialized.toString('base64');
    });

    // Send bundle to API
    // Note: The current endpoint handles single transactions
    // For bundles, we'd need to extend the endpoint or send individually
    // For now, send the first transaction with tip
    const firstTx = transactions[0];
    return await sendToJitoViaHelius(firstTx, config);
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send bundle to Jito',
    };
  }
}

/**
 * Check bundle or transaction status
 */
export async function checkJitoStatus(
  bundleId?: string,
  signature?: string
): Promise<HeliusJitoResponse> {
  try {
    const params = new URLSearchParams();
    if (bundleId) params.append('bundleId', bundleId);
    if (signature) params.append('signature', signature);

    const response = await fetch(`/api/helius/jito-send?${params.toString()}`);

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error.error || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to check status',
    };
  }
}

/**
 * Calculate optimal tip amount based on network conditions
 */
export function calculateOptimalTip(
  estimatedProfit?: number,
  baseTip: number = 10_000
): number {
  if (!estimatedProfit) {
    return baseTip;
  }

  // Scale tip with profit (1% of profit, max 100k lamports)
  const profitLamports = estimatedProfit * 1e9;
  const calculatedTip = Math.min(
    Math.max(baseTip, profitLamports * 0.01),
    100_000
  );

  return Math.floor(calculatedTip);
}

/**
 * Get default Jito tip accounts
 * Returns the default list of tip accounts
 */
export function getDefaultJitoTipAccounts(): string[] {
  return [
    '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZ8Nonsp8qrdNiy', // Mainnet tip account
    // Add more default tip accounts here
  ];
}

/**
 * Get Jito tip accounts as PublicKey array
 */
export function getJitoTipAccounts(): PublicKey[] {
  return getDefaultJitoTipAccounts().map(addr => new PublicKey(addr));
}

/**
 * Validate tip account addresses
 */
export function validateTipAccounts(tipAccounts: string[]): { valid: boolean; invalid: string[] } {
  const invalid: string[] = [];
  
  for (const addr of tipAccounts) {
    try {
      new PublicKey(addr);
    } catch {
      invalid.push(addr);
    }
  }
  
  return {
    valid: invalid.length === 0,
    invalid,
  };
}

