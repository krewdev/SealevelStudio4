/**
 * Airdrop Executor
 * Handles devnet airdrop operations
 */

import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

export interface AirdropExecutionResult {
  success: boolean;
  signature?: string;
  error?: string;
  amount?: number;
  recipient?: string;
  network?: string;
}

/**
 * Execute devnet airdrop
 */
export async function executeAirdrop(
  connection: Connection,
  wallet: WalletContextState,
  amount: number,
  recipientAddress?: string
): Promise<AirdropExecutionResult> {
  // Determine recipient
  const recipient = recipientAddress 
    ? new PublicKey(recipientAddress)
    : wallet.publicKey;

  if (!recipient) {
    return {
      success: false,
      error: 'No recipient address provided and wallet not connected',
    };
  }

  // Check if we're on devnet
  const endpoint = connection.rpcEndpoint;
  const isDevnet = endpoint.includes('devnet') || endpoint.includes('localhost');

  if (!isDevnet) {
    return {
      success: false,
      error: 'Airdrops are only available on devnet. Please switch to devnet network first.',
      network: 'mainnet',
    };
  }

  try {
    const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

    // Request airdrop
    const signature = await connection.requestAirdrop(
      recipient,
      amountLamports
    );

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    return {
      success: true,
      signature,
      amount,
      recipient: recipient.toString(),
      network: 'devnet',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      amount,
      recipient: recipient.toString(),
      network: 'devnet',
    };
  }
}

/**
 * Validate airdrop amount
 */
export function validateAirdropAmount(amount: number): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (amount > 10) {
    return { valid: false, error: 'Maximum airdrop amount is 10 SOL per request' };
  }
  return { valid: true };
}

