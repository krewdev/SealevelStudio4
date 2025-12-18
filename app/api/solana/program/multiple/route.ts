// API route to get multiple accounts at once
// POST /api/solana/program/multiple
// Body: { addresses: string[], encoding?: string, commitment?: string }

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateSolanaAddress } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

/**
 * Get multiple account information at once
 * 
 * Body:
 * - addresses: Array of account addresses (required, max 100)
 * - encoding: 'base58' | 'base64' | 'jsonParsed' | 'base64+zstd' (default: 'base64')
 * - commitment: 'finalized' | 'confirmed' | 'processed' (default: 'confirmed')
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses, encoding = 'base64', commitment = 'confirmed' } = body;

    // Validate addresses
    if (!addresses || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'addresses array is required' },
        { status: 400 }
      );
    }

    if (addresses.length === 0) {
      return NextResponse.json(
        { error: 'At least one address is required' },
        { status: 400 }
      );
    }

    if (addresses.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 addresses allowed per request' },
        { status: 400 }
      );
    }

    // Validate all addresses
    const publicKeys: PublicKey[] = [];
    for (const addr of addresses) {
      const validation = validateSolanaAddress(addr);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `Invalid address: ${addr}. ${validation.error}` },
          { status: 400 }
        );
      }
      publicKeys.push(new PublicKey(addr));
    }

    // Validate encoding
    const validEncodings = ['base58', 'base64', 'jsonParsed', 'base64+zstd'];
    if (!validEncodings.includes(encoding)) {
      return NextResponse.json(
        { error: `Invalid encoding. Must be one of: ${validEncodings.join(', ')}` },
        { status: 400 }
      );
    }

    // Get RPC connection - use devnet for demo
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_RPC_URL || 
                   (process.env.NEXT_PUBLIC_HELIUS_API_KEY 
                     ? `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
                     : 'https://api.devnet.solana.com');
    
    const connection = new Connection(rpcUrl, commitment as any);

    // Get multiple accounts
    const accounts = await connection.getMultipleAccountsInfo(publicKeys, commitment as any);

    return NextResponse.json({
      success: true,
      requested: addresses.length,
      returned: accounts.length,
      accounts: accounts.map((accountInfo, index) => ({
        address: addresses[index],
        found: accountInfo !== null,
        account: accountInfo ? {
          lamports: accountInfo.lamports,
          owner: accountInfo.owner.toString(),
          executable: accountInfo.executable,
          rentEpoch: accountInfo.rentEpoch,
          data: accountInfo.data,
        } : null,
      })),
    });
  } catch (error) {
    console.error('Error fetching multiple accounts:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch accounts',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

