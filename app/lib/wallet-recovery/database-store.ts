/**
 * Database-backed Wallet Recovery Store
 * Stores wallet-email mappings in PostgreSQL database
 */

import { query, transaction } from '@/app/lib/database/connection';
import { encryptWalletKey, decryptWalletKey } from './encryption';
import crypto from 'crypto';

export interface WalletEmailMapping {
  id: number;
  email: string;
  walletId: string;
  walletAddress: string;
  encryptedKey: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Store wallet-email mapping in database
 */
export async function storeWalletEmailMapping(
  email: string,
  walletId: string,
  walletAddress: string,
  privateKey: Uint8Array | Buffer
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();
  const encryptedKey = encryptWalletKey(privateKey);

  // Check if database is available
  try {
    await query(
      `INSERT INTO wallet_email_mappings (email, wallet_id, wallet_address, encrypted_key, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) 
       DO UPDATE SET 
         wallet_id = EXCLUDED.wallet_id,
         wallet_address = EXCLUDED.wallet_address,
         encrypted_key = EXCLUDED.encrypted_key,
         updated_at = CURRENT_TIMESTAMP`,
      [normalizedEmail, walletId, walletAddress, encryptedKey, false]
    );
  } catch (error) {
    // Fallback to in-memory if database not available
    console.warn('Database not available, using in-memory fallback:', error);
    throw error; // Let caller handle fallback
  }
}

/**
 * Get wallet by email
 */
export async function getWalletByEmail(email: string): Promise<WalletEmailMapping | null> {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    const result = await query<WalletEmailMapping>(
      `SELECT 
        id,
        email,
        wallet_id as "walletId",
        wallet_address as "walletAddress",
        encrypted_key as "encryptedKey",
        email_verified as "emailVerified",
        created_at as "createdAt",
        updated_at as "updatedAt"
       FROM wallet_email_mappings
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error getting wallet by email:', error);
    return null;
  }
}

/**
 * Get decrypted private key by email
 */
export async function getWalletPrivateKey(email: string): Promise<Buffer | null> {
  const mapping = await getWalletByEmail(email);
  if (!mapping) {
    return null;
  }

  try {
    return decryptWalletKey(mapping.encryptedKey);
  } catch (error) {
    console.error('Error decrypting wallet key:', error);
    return null;
  }
}

/**
 * Mark email as verified
 */
export async function verifyEmail(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    await query(
      `UPDATE wallet_email_mappings 
       SET email_verified = TRUE, 
           verification_token = NULL,
           verification_expires_at = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $1`,
      [normalizedEmail]
    );
    return true;
  } catch (error) {
    console.error('Error verifying email:', error);
    return false;
  }
}

/**
 * Update last recovery time
 */
export async function updateLastRecoveryTime(email: string): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    await query(
      `UPDATE wallet_email_mappings 
       SET last_recovery_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $1`,
      [normalizedEmail]
    );
  } catch (error) {
    console.error('Error updating last recovery time:', error);
    // Non-critical error, continue
  }
}

