/**
 * Multi-Send Transaction Bundler
 * Sends SOL to up to 50 wallets, creating accounts if needed
 */

import {
  Connection,
  Transaction,
  SystemProgram,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import { MultiSendConfig, MultiSendResult, MultiSendEstimate, MultiSendRecipient } from './types';
import { walletRegistry } from '../wallet-manager';

const MAX_RECIPIENTS = 50;
const MAX_TRANSACTION_SIZE = 1232; // Solana transaction size limit (actual limit is 1232 bytes)
// Conservative limit to account for serialization overhead and multiple signers
const SAFE_TRANSACTION_SIZE = 1200; // Leave buffer for signers and serialization overhead
const BASE_FEE = 5000; // Base transaction fee in lamports
const ACCOUNT_CREATION_SIZE = 200; // More accurate: account creation instruction + account key overhead
const TRANSFER_INSTRUCTION_SIZE = 180; // System transfer instruction size
const SIGNER_OVERHEAD = 64; // Each additional signer adds ~64 bytes (public key + signature space)
const TRANSACTION_HEADER_SIZE = 120; // Transaction header + recent blockhash + fee payer

// Memo Program ID (Solana's memo program)
const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');

/**
 * Estimate transaction costs and size
 */
export async function estimateMultiSend(
  connection: Connection,
  config: MultiSendConfig
): Promise<MultiSendEstimate> {
  const recipients = config.recipients.slice(0, config.maxRecipients || MAX_RECIPIENTS);
  const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
  
  let totalAmount = 0;
  let accountsToCreate = 0;
  let estimatedSize = 0;
  
  // Base transaction overhead
  estimatedSize += TRANSACTION_HEADER_SIZE;
  
  // Count signers (payer + new account keypairs)
  let signerCount = 1; // Payer is always a signer
  
  for (const recipient of recipients) {
    totalAmount += recipient.amount;
    
    if (recipient.address === 'new' || config.createAccounts) {
      accountsToCreate++;
      estimatedSize += ACCOUNT_CREATION_SIZE;
      signerCount++; // Each new account keypair is a signer
    } else {
      // Check if account exists
      try {
        const pubkey = new PublicKey(recipient.address);
        const accountInfo = await connection.getAccountInfo(pubkey);
        if (!accountInfo && config.createAccounts) {
          accountsToCreate++;
          estimatedSize += ACCOUNT_CREATION_SIZE;
          signerCount++; // New account keypair is a signer
        }
      } catch {
        // Invalid address, will create account
        accountsToCreate++;
        estimatedSize += ACCOUNT_CREATION_SIZE;
        signerCount++; // New account keypair is a signer
      }
    }
    
    // Transfer instruction size (only if not creating account, as createAccount includes transfer)
    if (recipient.address !== 'new' && !config.createAccounts) {
      estimatedSize += TRANSFER_INSTRUCTION_SIZE;
    }
  }
  
  // Add overhead for additional signers (beyond the payer)
  if (signerCount > 1) {
    estimatedSize += (signerCount - 1) * SIGNER_OVERHEAD;
  }
  
  // Priority fee instruction
  if (config.priorityFee) {
    estimatedSize += TRANSFER_INSTRUCTION_SIZE;
  }
  
  // Memo instruction
  if (config.memo) {
    estimatedSize += 50 + config.memo.length;
  }
  
  const totalFees =
    BASE_FEE +
    (config.priorityFee || 0) +
    (accountsToCreate * rentExempt);
  
  // Use conservative limit to account for serialization overhead
  const canFit = estimatedSize < SAFE_TRANSACTION_SIZE;
  
  return {
    totalAmount,
    totalFees: totalFees / LAMPORTS_PER_SOL,
    accountsToCreate,
    transactionSize: estimatedSize,
    canFitInTransaction: canFit,
  };
}

/**
 * Build multi-send transaction
 */
export async function buildMultiSendTransaction(
  connection: Connection,
  payer: PublicKey,
  config: MultiSendConfig
): Promise<{ transaction: Transaction; signers: Keypair[]; estimate: MultiSendEstimate; createdWallets: Array<{ keypair: Keypair; label?: string }> }> {
  const maxRecipients = config.maxRecipients || MAX_RECIPIENTS;
  
  if (config.recipients.length > maxRecipients) {
    throw new Error(`Maximum ${maxRecipients} recipients allowed per transaction`);
  }

  // Get estimate first
  const estimate = await estimateMultiSend(connection, config);
  
  // Build transaction to get actual size
  const transaction = new Transaction();
  const signers: Keypair[] = [];
  const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
  let accountsCreated = 0;
  const createdWallets: Array<{ keypair: Keypair; label?: string }> = [];
  
  // Process each recipient to build actual transaction
  for (const recipient of config.recipients) {
    let recipientPubkey: PublicKey;
    let shouldCreateAccount = false;
    
    // Handle new account creation
    if (recipient.address === 'new' || (recipient.createAccount && recipient.address === 'new')) {
      const newKeypair = Keypair.generate();
      signers.push(newKeypair);
      recipientPubkey = newKeypair.publicKey;
      shouldCreateAccount = true;
      createdWallets.push({ keypair: newKeypair, label: recipient.label });
    } else {
      try {
        recipientPubkey = new PublicKey(recipient.address);
        
        // Check if account exists
        if (config.createAccounts || recipient.createAccount) {
          const accountInfo = await connection.getAccountInfo(recipientPubkey);
          if (!accountInfo) {
            shouldCreateAccount = true;
          }
        }
      } catch (error) {
        // Invalid address - create new account
        const newKeypair = Keypair.generate();
        signers.push(newKeypair);
        recipientPubkey = newKeypair.publicKey;
        shouldCreateAccount = true;
        createdWallets.push({ keypair: newKeypair, label: recipient.label });
      }
    }
    
    // Create account if needed
    if (shouldCreateAccount) {
      const totalLamports = rentExempt + (recipient.amount * LAMPORTS_PER_SOL);
      transaction.add(
        SystemProgram.createAccount({
          fromPubkey: payer,
          newAccountPubkey: recipientPubkey,
          lamports: totalLamports,
          space: 0,
          programId: SystemProgram.programId,
        })
      );
      accountsCreated++;
    } else {
      // Regular transfer
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: recipientPubkey,
          lamports: recipient.amount * LAMPORTS_PER_SOL,
        })
      );
    }
  }

  // Add priority fee if specified
  if (config.priorityFee && config.priorityFee > 0) {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: payer,
        lamports: config.priorityFee,
      })
    );
  }

  // Add memo if specified
  if (config.memo) {
    const memoInstruction = new TransactionInstruction({
      keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(config.memo, 'utf-8'),
    });
    transaction.add(memoInstruction);
  }

  // Set fee payer and get blockhash for accurate size calculation
  transaction.feePayer = payer;
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;

  // Get actual serialized size (critical for accurate size checking)
  const serialized = transaction.serialize({ requireAllSignatures: false, verifySignatures: false });
  const actualSize = serialized.length;
  
  // Update estimate with actual size
  estimate.transactionSize = actualSize;
  estimate.canFitInTransaction = actualSize < SAFE_TRANSACTION_SIZE;
  
  if (!estimate.canFitInTransaction) {
    throw new Error(
      `Transaction too large (${actualSize} bytes). ` +
      `Maximum safe size: ${SAFE_TRANSACTION_SIZE} bytes (hard limit: ${MAX_TRANSACTION_SIZE} bytes). ` +
      `With ${signers.length} signer(s), reduce number of recipients or remove account creation.`
    );
  }

  return { 
    transaction, 
    signers, 
    estimate, 
    createdWallets 
  };
}

/**
 * Execute multi-send transaction
 */
export async function executeMultiSend(
  connection: Connection,
  wallet: any, // WalletContextState
  config: MultiSendConfig
): Promise<MultiSendResult> {
  if (!wallet.publicKey || !wallet.signTransaction || !wallet.sendTransaction) {
    throw new Error('Wallet not connected or missing required methods');
  }

  // Build transaction
  const { transaction, signers, estimate, createdWallets } = await buildMultiSendTransaction(
    connection,
    wallet.publicKey,
    config
  );

  // Get recent blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = wallet.publicKey;

  // Sign with wallet
  const signedTx = await wallet.signTransaction(transaction);
  
  // Sign with additional signers (new account keypairs)
  if (signers.length > 0) {
    signedTx.partialSign(...signers);
  }

  // Send transaction
  const signature = await wallet.sendTransaction(signedTx, connection, {
    skipPreflight: false,
    maxRetries: 3,
  });

  // Wait for confirmation
  await connection.confirmTransaction(
    {
      blockhash,
      lastValidBlockHeight,
      signature,
    },
    'confirmed'
  );

  // Register created wallets in wallet manager
  for (const { keypair, label } of createdWallets) {
    walletRegistry.registerWallet(
      keypair.publicKey.toString(),
      keypair,
      label || `Bundler Wallet ${new Date().toLocaleString()}`
    );
  }

  const totalAmount = config.recipients.reduce((sum, r) => sum + r.amount, 0);
  const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
  const accountsCreated = estimate.accountsToCreate;

  return {
    signature,
    recipients: config.recipients.length,
    totalAmount,
    accountsCreated,
    transactionSize: estimate.transactionSize,
    fees: {
      baseFee: BASE_FEE / LAMPORTS_PER_SOL,
      priorityFee: (config.priorityFee || 0) / LAMPORTS_PER_SOL,
      rentExempt: (accountsCreated * rentExempt) / LAMPORTS_PER_SOL,
      total: estimate.totalFees,
    },
    createdWalletIds: createdWallets.map(w => 
      walletRegistry.getWalletByAddress(w.keypair.publicKey.toString())?.id
    ).filter(Boolean) as string[],
  };
}

