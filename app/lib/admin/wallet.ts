/**
 * Admin Wallet Utilities
 * Functions for admin wallet verification and operations
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Get admin wallet address from environment
 */
export function getAdminWalletAddress(): PublicKey | null {
  const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
  if (!adminAddress) {
    return null;
  }

  try {
    return new PublicKey(adminAddress);
  } catch {
    console.error('Invalid ADMIN_WALLET_ADDRESS format');
    return null;
  }
}

/**
 * Check if a wallet address is the admin wallet
 */
export function isAdminWallet(walletAddress: string): boolean {
  const adminAddress = process.env.ADMIN_WALLET_ADDRESS;
  if (!adminAddress) {
    return false;
  }

  try {
    const adminPubkey = new PublicKey(adminAddress);
    const walletPubkey = new PublicKey(walletAddress);
    return adminPubkey.equals(walletPubkey);
  } catch {
    return false;
  }
}

/**
 * Verify admin wallet signature for admin operations
 * In production, this would verify a signature from the admin wallet
 */
export function verifyAdminSignature(
  message: string,
  signature: string,
  walletAddress: string
): boolean {
  // Check if wallet is admin
  if (!isAdminWallet(walletAddress)) {
    return false;
  }

  // TODO: Implement signature verification
  // This would verify that the signature was created by the admin wallet
  // For now, just verify the wallet is the admin wallet
  
  return true;
}

