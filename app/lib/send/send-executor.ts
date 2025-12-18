/**
 * Send Executor
 * Handles sending SOL/tokens to contacts or wallet addresses
 */

import {
  Connection,
  Transaction,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { getContactManager } from '../contacts/contact-manager';
import { Contact } from '../contacts/types';

export interface SendExecutionResult {
  success: boolean;
  signature?: string;
  error?: string;
  recipient?: string;
  amount?: number;
  token?: string;
  contactSaved?: boolean;
}

/**
 * Validate Solana address
 */
function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email address
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Find or create contact for recipient
 */
async function resolveRecipient(
  recipient: string
): Promise<{ contact: Contact | null; walletAddress: string | null; needsContactSave: boolean }> {
  const contactManager = getContactManager();
  
  // Check if it's already a wallet address
  if (isValidSolanaAddress(recipient)) {
    // Check if we have a contact for this address
    const contact = contactManager.findContactByWallet(recipient);
    return {
      contact: contact || null,
      walletAddress: recipient,
      needsContactSave: false,
    };
  }
  
  // Check if it's an email
  if (isValidEmail(recipient)) {
    const contact = contactManager.findContactByEmail(recipient);
    if (contact && contact.walletAddress) {
      return {
        contact,
        walletAddress: contact.walletAddress,
        needsContactSave: false,
      };
    }
    // Email found but no wallet - need to prompt
    return {
      contact: contact || null,
      walletAddress: null,
      needsContactSave: false,
    };
  }
  
  // Try to find by name
  const contact = contactManager.findContactByName(recipient);
  if (contact && contact.walletAddress) {
    return {
      contact,
      walletAddress: contact.walletAddress,
      needsContactSave: false,
    };
  }
  
  // Not found - will need to prompt for wallet/email
  return {
    contact: null,
    walletAddress: null,
    needsContactSave: true,
  };
}

/**
 * Execute SOL transfer
 */
export async function executeSendSOL(
  connection: Connection,
  wallet: WalletContextState,
  amount: number,
  recipient: string
): Promise<SendExecutionResult> {
  if (!wallet.publicKey || !wallet.sendTransaction) {
    return {
      success: false,
      error: 'Wallet not connected',
    };
  }

  // Resolve recipient
  const { walletAddress, needsContactSave } = await resolveRecipient(recipient);
  
  if (!walletAddress) {
    return {
      success: false,
      error: `Recipient "${recipient}" not found in contacts. Please provide a wallet address or email to save them as a contact.`,
      recipient,
      amount,
      contactSaved: false,
    };
  }

  try {
    const recipientPubkey = new PublicKey(walletAddress);
    const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

    // Build transfer transaction
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: recipientPubkey,
        lamports: amountLamports,
      })
    );

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = wallet.publicKey;

    // Send transaction
    const signature = await wallet.sendTransaction(transaction, connection);

    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');

    // Save contact if needed
    let contactSaved = false;
    if (needsContactSave && !isValidSolanaAddress(recipient) && !isValidEmail(recipient)) {
      // This would be handled by the UI prompting for wallet/email
      // For now, we just note that contact saving is needed
    }

    return {
      success: true,
      signature,
      recipient: walletAddress,
      amount,
      contactSaved,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recipient,
      amount,
    };
  }
}

/**
 * Save contact with wallet address or email
 */
export async function saveContact(
  name: string,
  walletAddress?: string,
  email?: string
): Promise<{ success: boolean; contact?: Contact; error?: string }> {
  try {
    const contactManager = getContactManager();
    
    if (!walletAddress && !email) {
      return {
        success: false,
        error: 'Either wallet address or email is required',
      };
    }

    const contact = await contactManager.addContact({
      name,
      walletAddress,
      email,
    });

    return {
      success: true,
      contact,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate send amount
 */
export function validateSendAmount(amount: number): { valid: boolean; error?: string } {
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }
  if (amount < 0.0001) {
    return { valid: false, error: 'Amount too small (minimum 0.0001 SOL)' };
  }
  return { valid: true };
}

