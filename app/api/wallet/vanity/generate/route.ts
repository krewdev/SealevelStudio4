// Vanity Address Generation API
// Generates Solana addresses that start with a user-specified prefix

import { NextRequest, NextResponse } from 'next/server';
import { Keypair, PublicKey } from '@solana/web3.js';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Generate vanity addresses that start with a given prefix
 * POST /api/wallet/vanity/generate
 * Body: { prefix: string, count?: number, maxAttempts?: number }
 * 
 * Returns: { addresses: Array<{ address: string, publicKey: string }> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { prefix, count = 5, maxAttempts = 100000 } = body;

    if (!prefix || typeof prefix !== 'string') {
      return NextResponse.json(
        { error: 'Prefix is required and must be a string', success: false },
        { status: 400 }
      );
    }

    // Validate prefix format (Base58 characters only, uppercase)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
    const normalizedPrefix = prefix.toUpperCase().trim();

    if (!base58Regex.test(normalizedPrefix)) {
      return NextResponse.json(
        { error: 'Prefix contains invalid characters. Use only Base58 characters (no 0, O, I, l).', success: false },
        { status: 400 }
      );
    }

    if (normalizedPrefix.length < 1 || normalizedPrefix.length > 8) {
      return NextResponse.json(
        { error: 'Prefix must be between 1 and 8 characters', success: false },
        { status: 400 }
      );
    }

    if (count < 1 || count > 20) {
      return NextResponse.json(
        { error: 'Count must be between 1 and 20', success: false },
        { status: 400 }
      );
    }

    const addresses: Array<{ address: string; publicKey: string }> = [];
    let attempts = 0;

    // Generate addresses until we have enough matches
    while (addresses.length < count && attempts < maxAttempts) {
      attempts++;

      // Generate a random keypair
      const keypair = Keypair.generate();
      const address = keypair.publicKey.toBase58();

      // Check if address starts with the prefix (case-insensitive)
      if (address.toUpperCase().startsWith(normalizedPrefix)) {
        addresses.push({
          address,
          publicKey: keypair.publicKey.toString(),
        });
      }
    }

    // If we didn't find enough addresses, return what we have
    if (addresses.length === 0) {
      return NextResponse.json({
        success: true,
        addresses: [],
        attempts,
        message: `No addresses found starting with "${normalizedPrefix}" after ${attempts} attempts. Try a shorter prefix or increase maxAttempts.`,
      });
    }

    return NextResponse.json({
      success: true,
      addresses,
      attempts,
      prefix: normalizedPrefix,
      message: `Found ${addresses.length} address${addresses.length === 1 ? '' : 'es'} starting with "${normalizedPrefix}"`,
    });
  } catch (error) {
    console.error('Vanity address generation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate vanity addresses',
        success: false,
      },
      { status: 500 }
    );
  }
}

