import { PublicKey } from '@solana/web3.js';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

/**
 * Verify Solana wallet signature
 * 
 * @param message The message that was signed (string or Uint8Array)
 * @param signature The signature in base58 string format
 * @param walletAddress The wallet address (public key)
 * @returns boolean indicating if signature is valid
 */
export function verifySignature(
  message: string | Uint8Array,
  signature: string,
  walletAddress: string
): boolean {
  try {
    const messageBytes = typeof message === 'string' ? new TextEncoder().encode(message) : message;
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(walletAddress).toBytes();

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Verify a timestamped message to prevent replay attacks
 * The message should be the timestamp string
 */
export function verifyTimestampedSignature(
  timestamp: number,
  signature: string,
  walletAddress: string,
  maxAgeMs: number = 5 * 60 * 1000 // 5 minutes default
): boolean {
  const now = Date.now();
  
  // Check if timestamp is within acceptable range
  if (timestamp > now + 30000 || timestamp < now - maxAgeMs) {
    return false; // Timestamp too far in future or too old
  }

  // Verify signature of the timestamp string
  return verifySignature(timestamp.toString(), signature, walletAddress);
}


