// Security validation utilities to prevent SSRF and injection attacks

import { PublicKey } from '@solana/web3.js';

/**
 * Allowed API base URLs (whitelist)
 */
export const ALLOWED_API_BASES = {
  DUNE: 'https://api.dune.com',
  SOLSCAN: 'https://api.solscan.io',
  JUPITER: 'https://quote-api.jup.ag',
  HELIUS: 'https://api.helius.xyz',
  BIRDEYE: 'https://public-api.birdeye.so',
} as const;

/**
 * Validate Solana address format
 * Prevents injection of malicious URLs or hostnames
 */
export function validateSolanaAddress(address: string | null): { valid: boolean; error?: string } {
  if (!address) {
    return { valid: false, error: 'Address is required' };
  }

  // Solana addresses are base58 encoded, 32-44 characters
  // Must match base58 pattern (no 0, O, I, l)
  const base58Pattern = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  
  if (!base58Pattern.test(address)) {
    return { valid: false, error: 'Invalid Solana address format' };
  }

  // Additional validation: try to parse as PublicKey
  try {
    new PublicKey(address);
    return { valid: true };
  } catch {
    return { valid: false, error: 'Invalid Solana public key' };
  }
}

/**
 * Validate and sanitize numeric input
 */
export function validateNumeric(input: string | null, min?: number, max?: number): { valid: boolean; value?: number; error?: string } {
  if (!input) {
    return { valid: false, error: 'Numeric input is required' };
  }

  // Must be strictly numeric (no decimals, no negative, no special chars)
  if (!/^\d+$/.test(input)) {
    return { valid: false, error: 'Invalid numeric format' };
  }

  const value = parseInt(input, 10);
  
  if (isNaN(value)) {
    return { valid: false, error: 'Not a valid number' };
  }

  if (min !== undefined && value < min) {
    return { valid: false, error: `Value must be at least ${min}` };
  }

  if (max !== undefined && value > max) {
    return { valid: false, error: `Value must be at most ${max}` };
  }

  return { valid: true, value };
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string | null): { valid: boolean; error?: string } {
  if (!uuid) {
    return { valid: false, error: 'UUID is required' };
  }

  const uuidPattern = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  
  if (!uuidPattern.test(uuid)) {
    return { valid: false, error: 'Invalid UUID format' };
  }

  return { valid: true };
}

/**
 * Validate endpoint name (prevent path traversal)
 */
export function validateEndpoint(endpoint: string | null, allowedEndpoints: string[]): { valid: boolean; error?: string } {
  if (!endpoint) {
    return { valid: false, error: 'Endpoint is required' };
  }

  // Prevent path traversal
  if (endpoint.includes('..') || endpoint.includes('/') || endpoint.includes('\\')) {
    return { valid: false, error: 'Invalid endpoint format' };
  }

  // Must be in allow-list
  if (!allowedEndpoints.includes(endpoint)) {
    return { valid: false, error: `Endpoint must be one of: ${allowedEndpoints.join(', ')}` };
  }

  return { valid: true };
}

/**
 * Validate action name (prevent path traversal)
 */
export function validateAction(action: string | null, allowedActions: string[]): boolean {
  if (!action) {
    return false;
  }

  // Prevent path traversal
  if (action.includes('..') || action.includes('/') || action.includes('\\')) {
    return false;
  }

  // Must be in allow-list
  return allowedActions.includes(action);
}

/**
 * Safely encode URL parameter (prevents injection)
 */
export function safeEncodeParam(value: string): string {
  // Use encodeURIComponent to properly encode
  // This prevents injection of special characters that could alter the URL
  return encodeURIComponent(value);
}

/**
 * Build safe URL with validated parameters
 */
export function buildSafeUrl(
  baseUrl: string,
  path: string,
  params: Record<string, string>
): string {
  // Validate base URL is in allow-list
  const isValidBase = Object.values(ALLOWED_API_BASES).some(allowed => baseUrl.startsWith(allowed));
  if (!isValidBase) {
    throw new Error('Base URL not in allow-list');
  }

  // Build URL safely
  const url = new URL(path, baseUrl);
  
  // Add parameters with proper encoding
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, safeEncodeParam(value));
  });

  return url.toString();
}

