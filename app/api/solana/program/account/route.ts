// API route to get a specific account info
// GET /api/solana/program/account?address=<address>&encoding=<encoding>

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateSolanaAddress } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

/**
 * Get account information for a specific address
 * 
 * Query params:
 * - address: Account address (required)
 * - encoding: 'base58' | 'base64' | 'jsonParsed' | 'base64+zstd' (default: 'base64')
 * - commitment: 'finalized' | 'confirmed' | 'processed' (default: 'confirmed')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const addressParam = searchParams.get('address');
    const encoding = searchParams.get('encoding') || 'base64';
    const commitment = (searchParams.get('commitment') || 'confirmed') as 'finalized' | 'confirmed' | 'processed';

    // Validate address
    if (!addressParam) {
      return NextResponse.json(
        { error: 'address is required' },
        { status: 400 }
      );
    }

    const addressValidation = validateSolanaAddress(addressParam);
    if (!addressValidation.valid) {
      return NextResponse.json(
        { error: addressValidation.error || 'Invalid address format' },
        { status: 400 }
      );
    }

    const address = new PublicKey(addressParam);

    // Validate encoding
    const validEncodings = ['base58', 'base64', 'jsonParsed', 'base64+zstd'];
    if (!validEncodings.includes(encoding)) {
      return NextResponse.json(
        { error: `Invalid encoding. Must be one of: ${validEncodings.join(', ')}` },
        { status: 400 }
      );
    }

    // Get RPC connection
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 
                   (process.env.NEXT_PUBLIC_HELIUS_API_KEY 
                     ? `https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
                     : 'https://api.mainnet-beta.solana.com');
    
    const connection = new Connection(rpcUrl, commitment);

    // Get account info
    const accountInfo = await connection.getAccountInfo(address, commitment);

    if (!accountInfo) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Account not found',
          address: address.toString(),
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      address: address.toString(),
      account: {
        lamports: accountInfo.lamports,
        owner: accountInfo.owner.toString(),
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
        data: accountInfo.data,
      },
    });
  } catch (error) {
    console.error('Error fetching account info:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch account info',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

