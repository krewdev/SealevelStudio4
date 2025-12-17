/**
 * Bundler Test Utilities
 * Helper functions for testing bundler with multiple wallets
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { buildMultiSendTransaction } from './multi-send';
import { MultiSendConfig } from './types';

export interface TestWallet {
  index: number;
  keypair: Keypair;
  address: string;
  label: string;
  group: 'dcaBuy' | 'scheduledSell' | 'manual';
  balance?: number;
}

export interface SendConfig {
  fromWallet: TestWallet;
  toAddress: string;
  amount: number; // in SOL
  tokenMint?: string; // If sending SPL token, otherwise SOL
  priorityFee?: number;
}

/**
 * Send SOL from a test wallet
 */
export async function sendSolFromWallet(
  connection: Connection,
  config: SendConfig
): Promise<string> {
  const { fromWallet, toAddress, amount, priorityFee } = config;

  const transaction = new Transaction();
  const toPubkey = new PublicKey(toAddress);

  // Add transfer instruction
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: fromWallet.keypair.publicKey,
      toPubkey: toPubkey,
      lamports: amount * LAMPORTS_PER_SOL,
    })
  );

  // Add priority fee if specified
  if (priorityFee && priorityFee > 0) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.keypair.publicKey,
        toPubkey: fromWallet.keypair.publicKey,
        lamports: priorityFee,
      })
    );
  }

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromWallet.keypair.publicKey;

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fromWallet.keypair],
    {
      commitment: 'confirmed',
      skipPreflight: false,
    }
  );

  return signature;
}

/**
 * Send SPL token from a test wallet
 */
export async function sendTokenFromWallet(
  connection: Connection,
  config: SendConfig
): Promise<string> {
  const { fromWallet, toAddress, amount, tokenMint, priorityFee } = config;

  if (!tokenMint) {
    throw new Error('Token mint address required for token transfers');
  }

  const mintPubkey = new PublicKey(tokenMint);
  const toPubkey = new PublicKey(toAddress);

  const transaction = new Transaction();

  // Get source token account
  const sourceTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    fromWallet.keypair.publicKey
  );

  // Get destination token account
  const destTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    toPubkey
  );

  // Check if destination token account exists
  try {
    await getAccount(connection, destTokenAccount);
  } catch {
    // Create destination token account
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromWallet.keypair.publicKey, // Payer
        destTokenAccount,
        toPubkey,
        mintPubkey
      )
    );
  }

  // Get token decimals
  const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
  const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;
  const amountInSmallestUnit = BigInt(Math.floor(amount * 10 ** decimals));

  // Add transfer instruction
  transaction.add(
    createTransferInstruction(
      sourceTokenAccount,
      destTokenAccount,
      fromWallet.keypair.publicKey,
      amountInSmallestUnit,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // Add priority fee if specified
  if (priorityFee && priorityFee > 0) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: fromWallet.keypair.publicKey,
        toPubkey: fromWallet.keypair.publicKey,
        lamports: priorityFee,
      })
    );
  }

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromWallet.keypair.publicKey;

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fromWallet.keypair],
    {
      commitment: 'confirmed',
      skipPreflight: false,
    }
  );

  return signature;
}

/**
 * Get balance of a test wallet
 */
export async function getWalletBalance(
  connection: Connection,
  wallet: TestWallet,
  tokenMint?: string
): Promise<number> {
  if (tokenMint) {
    const mintPubkey = new PublicKey(tokenMint);
    const tokenAccount = await getAssociatedTokenAddress(
      mintPubkey,
      wallet.keypair.publicKey
    );

    try {
      const account = await getAccount(connection, tokenAccount);
      const mintInfo = await connection.getParsedAccountInfo(mintPubkey);
      const decimals = (mintInfo.value?.data as any)?.parsed?.info?.decimals || 9;
      return Number(account.amount) / 10 ** decimals;
    } catch {
      return 0;
    }
  } else {
    const balance = await connection.getBalance(wallet.keypair.publicKey);
    return balance / LAMPORTS_PER_SOL;
  }
}

/**
 * Create multiple wallets using bundler
 */
export async function createTestWallets(
  connection: Connection,
  fundingWallet: Keypair,
  count: number,
  amountPerWallet: number
): Promise<TestWallet[]> {
  const wallets: TestWallet[] = [];
  const recipients = [];

  // Create recipients for bundler
  for (let i = 0; i < count; i++) {
    recipients.push({
      address: 'new',
      amount: amountPerWallet,
      label: `Test Wallet ${i + 1}`,
    });
  }

  // Build and send bundler transaction
  const config: MultiSendConfig = {
    recipients,
    createAccounts: true,
    maxRecipients: 50,
  };

  const { transaction, signers, createdWallets } = await buildMultiSendTransaction(
    connection,
    fundingWallet.publicKey,
    config
  );

  // Sign with funding wallet
  transaction.sign(fundingWallet);

  // Sign with new wallet keypairs
  if (signers.length > 0) {
    transaction.partialSign(...signers);
  }

  // Send transaction
  const signature = await connection.sendRawTransaction(
    transaction.serialize(),
    {
      skipPreflight: false,
      maxRetries: 3,
    }
  );

  // Wait for confirmation
  await connection.confirmTransaction(signature, 'confirmed');

  // Create TestWallet objects
  for (let i = 0; i < createdWallets.length; i++) {
    const wallet = createdWallets[i];
    let group: 'dcaBuy' | 'scheduledSell' | 'manual' = 'manual';
    
    if (i >= 0 && i < 10) {
      group = 'dcaBuy';
    } else if (i >= 10 && i < 20) {
      group = 'scheduledSell';
    }

    wallets.push({
      index: i + 1,
      keypair: wallet.keypair,
      address: wallet.keypair.publicKey.toString(),
      label: wallet.label || `Test Wallet ${i + 1}`,
      group,
    });
  }

  return wallets;
}







