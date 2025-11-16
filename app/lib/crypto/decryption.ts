/**
 * Advanced Decryption Utilities for R&D
 * WARNING: For R&D purposes only. Not for production use.
 */

import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import bs58 from 'bs58';

// ============================================================================
// Base64 Encoding/Decoding
// ============================================================================

export function base64Encode(data: string | Uint8Array): string {
  if (typeof data === 'string') {
    return btoa(data);
  }
  return btoa(String.fromCharCode(...data));
}

export function base64Decode(encoded: string): string {
  try {
    return atob(encoded);
  } catch (error) {
    throw new Error(`Base64 decode failed: ${error}`);
  }
}

export function base64DecodeToBytes(encoded: string): Uint8Array {
  const decoded = base64Decode(encoded);
  return new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
}

// ============================================================================
// Hex Encoding/Decoding
// ============================================================================

export function hexEncode(data: string | Uint8Array): string {
  if (typeof data === 'string') {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(data);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Array.from(data).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function hexDecode(hex: string): string {
  try {
    const bytes = hexDecodeToBytes(hex);
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
  } catch (error) {
    throw new Error(`Hex decode failed: ${error}`);
  }
}

export function hexDecodeToBytes(hex: string): Uint8Array {
  try {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  } catch (error) {
    throw new Error(`Hex decode to bytes failed: ${error}`);
  }
}

// ============================================================================
// Base58 Encoding/Decoding (Solana)
// ============================================================================

export function base58Encode(data: Uint8Array): string {
  return bs58.encode(data);
}

export function base58Decode(encoded: string): Uint8Array {
  try {
    return bs58.decode(encoded);
  } catch (error) {
    throw new Error(`Base58 decode failed: ${error}`);
  }
}

// ============================================================================
// AES Decryption (Web Crypto API)
// ============================================================================

export async function aesDecrypt(
  encryptedData: string | Uint8Array,
  key: string | Uint8Array,
  iv?: string | Uint8Array
): Promise<string> {
  try {
    const keyData = typeof key === 'string' ? new TextEncoder().encode(key) : key;
    const encrypted = typeof encryptedData === 'string' 
      ? base64DecodeToBytes(encryptedData) 
      : encryptedData;
    
    // Derive key using PBKDF2
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: new Uint8Array(16), // In production, use proper salt
        iterations: 100000,
        hash: 'SHA-256',
      },
      cryptoKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Extract IV from encrypted data if not provided
    let ivData: Uint8Array;
    let ciphertext: Uint8Array;
    
    if (iv) {
      ivData = typeof iv === 'string' ? hexDecodeToBytes(iv) : iv;
      ciphertext = encrypted;
    } else {
      // Assume IV is prepended (12 bytes for GCM)
      ivData = encrypted.slice(0, 12);
      ciphertext = encrypted.slice(12);
    }

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: ivData,
      },
      derivedKey,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error(`AES decryption failed: ${error}`);
  }
}

// ============================================================================
// Solana Keypair Utilities
// ============================================================================

export function decodeKeypairFromBase64(base64: string): Keypair {
  try {
    const decoded = base64Decode(base64);
    const keyArray = JSON.parse(decoded);
    const secretKey = new Uint8Array(keyArray);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    throw new Error(`Keypair decode failed: ${error}`);
  }
}

export function decodeKeypairFromHex(hex: string): Keypair {
  try {
    const bytes = hexDecodeToBytes(hex);
    return Keypair.fromSecretKey(bytes);
  } catch (error) {
    throw new Error(`Keypair decode from hex failed: ${error}`);
  }
}

export function decodeKeypairFromBase58(base58: string): Keypair {
  try {
    const bytes = base58Decode(base58);
    return Keypair.fromSecretKey(bytes);
  } catch (error) {
    throw new Error(`Keypair decode from base58 failed: ${error}`);
  }
}

export function decodeKeypairFromArray(arrayString: string): Keypair {
  try {
    const array = JSON.parse(arrayString);
    const secretKey = new Uint8Array(array);
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    throw new Error(`Keypair decode from array failed: ${error}`);
  }
}

// ============================================================================
// Transaction Decoding
// ============================================================================

export function decodeTransaction(base64: string): Transaction {
  try {
    const bytes = base64DecodeToBytes(base64);
    return Transaction.from(bytes);
  } catch (error) {
    throw new Error(`Transaction decode failed: ${error}`);
  }
}

// ============================================================================
// Account Data Decoding
// ============================================================================

export function decodeAccountData(base64: string): Uint8Array {
  return base64DecodeToBytes(base64);
}

export function decodeAccountDataAsString(base64: string, encoding: 'utf8' | 'hex' = 'utf8'): string {
  const bytes = base64DecodeToBytes(base64);
  if (encoding === 'hex') {
    return hexEncode(bytes);
  }
  return new TextDecoder().decode(bytes);
}

// ============================================================================
// Hash Functions
// ============================================================================

export async function sha256(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' 
    ? new TextEncoder().encode(data) 
    : data;
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sha512(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === 'string' 
    ? new TextEncoder().encode(data) 
    : data;
  const hashBuffer = await crypto.subtle.digest('SHA-512', bytes);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// Utility Functions
// ============================================================================

export function detectEncoding(data: string): 'base64' | 'hex' | 'base58' | 'unknown' {
  // Base64: A-Z, a-z, 0-9, +, /, = (padding)
  if (/^[A-Za-z0-9+/]*={0,2}$/.test(data) && data.length % 4 === 0) {
    try {
      atob(data);
      return 'base64';
    } catch {
      // Not valid base64
    }
  }
  
  // Hex: 0-9, a-f, A-F
  if (/^[0-9a-fA-F]+$/.test(data)) {
    return 'hex';
  }
  
  // Base58: alphanumeric without 0, O, I, l
  if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(data)) {
    try {
      bs58.decode(data);
      return 'base58';
    } catch {
      // Not valid base58
    }
  }
  
  return 'unknown';
}

export function formatBytes(bytes: Uint8Array, maxLength: number = 100): string {
  if (bytes.length <= maxLength) {
    return `[${Array.from(bytes).join(', ')}]`;
  }
  const start = Array.from(bytes.slice(0, 20)).join(', ');
  const end = Array.from(bytes.slice(bytes.length - 20)).join(', ');
  return `[${start}, ..., ${end}] (${bytes.length} bytes)`;
}

