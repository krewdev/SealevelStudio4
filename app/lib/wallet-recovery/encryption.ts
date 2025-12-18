/**
 * Wallet Key Encryption Utilities
 * Provides secure encryption/decryption for wallet private keys
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;

/**
 * Derive encryption key from master key or generate one
 */
function getEncryptionKey(): Buffer {
  const masterKey = process.env.WALLET_ENCRYPTION_KEY;
  
  if (masterKey) {
    // Use provided master key (should be 64 hex characters = 32 bytes)
    if (masterKey.length !== 64) {
      throw new Error('WALLET_ENCRYPTION_KEY must be 64 hex characters (32 bytes)');
    }
    return Buffer.from(masterKey, 'hex');
  }

  // Generate a key from a combination of environment variables (less secure, for development)
  // In production, WALLET_ENCRYPTION_KEY MUST be set
  if (process.env.NODE_ENV === 'production') {
    throw new Error('WALLET_ENCRYPTION_KEY must be set in production');
  }

  console.warn('⚠️  WALLET_ENCRYPTION_KEY not set. Using development key (NOT SECURE FOR PRODUCTION).');
  const devKey = process.env.DATABASE_URL || 'dev-key-not-secure';
  return crypto.createHash('sha256').update(devKey).digest();
}

/**
 * Encrypt wallet private key
 */
export function encryptWalletKey(plaintextKey: Uint8Array | Buffer): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt the key
  const encrypted = Buffer.concat([
    cipher.update(plaintextKey),
    cipher.final(),
  ]);

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Combine salt + iv + tag + encrypted data
  const combined = Buffer.concat([
    salt,
    iv,
    tag,
    encrypted,
  ]);

  // Return base64 encoded
  return combined.toString('base64');
}

/**
 * Decrypt wallet private key
 */
export function decryptWalletKey(encryptedKey: string): Buffer {
  try {
    const key = getEncryptionKey();
    
    // Decode from base64
    const combined = Buffer.from(encryptedKey, 'base64');

    // Extract components
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.slice(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted;
  } catch (error) {
    throw new Error(`Failed to decrypt wallet key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate a secure encryption key (for setting up WALLET_ENCRYPTION_KEY)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

