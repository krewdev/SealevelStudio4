// API route to decode account data using Anchor IDL
// POST /api/solana/program/decode
// Body: { accountData: string (base64), idl?: object, accountType?: string }

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateSolanaAddress } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

/**
 * Decode account data
 * 
 * Body:
 * - accountData: Base64 encoded account data OR account address (required)
 * - idl: Anchor IDL JSON (optional, for Anchor program decoding)
 * - accountType: Account type name from IDL (optional)
 * - programId: Program ID if using account address instead of raw data (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountData, idl, accountType, programId: programIdParam } = body;

    if (!accountData) {
      return NextResponse.json(
        { error: 'accountData is required (base64 string or account address)' },
        { status: 400 }
      );
    }

    let decodedData: any;
    let rawData: Buffer;

    // Check if accountData is an address (fetch from chain) or raw base64 data
    const addressValidation = validateSolanaAddress(accountData);
    if (addressValidation.valid && programIdParam) {
      // Fetch account from chain
      const programIdValidation = validateSolanaAddress(programIdParam);
      if (!programIdValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid programId format' },
          { status: 400 }
        );
      }

      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 
                     (process.env.NEXT_PUBLIC_HELIUS_API_KEY 
                       ? `https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
                       : 'https://api.mainnet-beta.solana.com');
      
      const connection = new Connection(rpcUrl, 'confirmed');
      const accountInfo = await connection.getAccountInfo(new PublicKey(accountData));

      if (!accountInfo) {
        return NextResponse.json(
          { error: 'Account not found' },
          { status: 404 }
        );
      }

      rawData = Buffer.from(accountInfo.data);
    } else {
      // Assume it's base64 encoded data
      try {
        rawData = Buffer.from(accountData, 'base64');
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid accountData format. Must be base64 string or valid Solana address' },
          { status: 400 }
        );
      }
    }

    // If IDL is provided, try to decode using Anchor
    if (idl && accountType) {
      try {
        // This would require @coral-xyz/anchor
        // For now, return the raw data with a note
        decodedData = {
          note: 'Anchor IDL decoding requires @coral-xyz/anchor library. Raw data provided.',
          rawData: rawData.toString('base64'),
          hex: rawData.toString('hex'),
          length: rawData.length,
        };
      } catch (error) {
        decodedData = {
          error: 'Failed to decode with IDL',
          rawData: rawData.toString('base64'),
          hex: rawData.toString('hex'),
          length: rawData.length,
        };
      }
    } else {
      // Return raw decoded data
      decodedData = {
        raw: rawData.toString('base64'),
        hex: rawData.toString('hex'),
        utf8: rawData.toString('utf8').replace(/[^\x20-\x7E]/g, '.'), // Only printable ASCII
        length: rawData.length,
        // Try to parse as JSON if possible
        json: (() => {
          try {
            return JSON.parse(rawData.toString('utf8'));
          } catch {
            return null;
          }
        })(),
      };
    }

    return NextResponse.json({
      success: true,
      decoded: decodedData,
      metadata: {
        dataLength: rawData.length,
        hasIdl: !!idl,
        accountType: accountType || null,
      },
    });
  } catch (error) {
    console.error('Error decoding account data:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to decode account data',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

