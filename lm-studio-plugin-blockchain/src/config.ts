/**
 * Plugin Configuration
 * Handles encryption keys and environment configuration
 */

/**
 * Get encryption key from environment variable
 * Required in production for security
 */
export function getEncryptionKey(): string | null {
  // Check for encryption key in environment
  const key = process.env.LM_STUDIO_PLUGIN_ENCRYPTION_KEY || 
              process.env.PLUGIN_ENCRYPTION_KEY ||
              null;
  
  // In production, warn if key is not set
  if (process.env.NODE_ENV === 'production' && !key) {
    console.warn(
      '⚠️  WARNING: Encryption key not set in production!\n' +
      'Set LM_STUDIO_PLUGIN_ENCRYPTION_KEY environment variable for secure operation.\n' +
      'Generate a key with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  
  return key;
}

/**
 * Generate a new encryption key
 * Use this to generate a key for production use
 */
export function generateEncryptionKey(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validate encryption key format
 */
export function isValidEncryptionKey(key: string): boolean {
  // Should be 64 hex characters (32 bytes = 256 bits)
  return /^[a-f0-9]{64}$/i.test(key);
}

