// API route to query Solana program accounts
// GET /api/solana/program/accounts?programId=<address>&filters=<json>&encoding=<encoding>

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateSolanaAddress } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

/**
 * Query accounts owned by a Solana program
 * 
 * Query params:
 * - programId: Program address (required)
 * - filters: JSON string of filters (optional)
 * - encoding: 'base58' | 'base64' | 'jsonParsed' | 'base64+zstd' (default: 'base64')
 * - dataSize: Filter by account data size (optional)
 * - memcmp: Filter by data comparison (optional, JSON: {offset: number, bytes: string})
 * - limit: Maximum number of accounts (default: 100, max: 10000)
 * - commitment: 'finalized' | 'confirmed' | 'processed' (default: 'confirmed')
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const programIdParam = searchParams.get('programId');
    const filtersParam = searchParams.get('filters');
    const encoding = searchParams.get('encoding') || 'base64';
    const dataSizeParam = searchParams.get('dataSize');
    const memcmpParam = searchParams.get('memcmp');
    const limitParam = searchParams.get('limit');
    const commitment = (searchParams.get('commitment') || 'confirmed') as 'finalized' | 'confirmed' | 'processed';

    // Validate program ID
    if (!programIdParam) {
      return NextResponse.json(
        { error: 'programId is required' },
        { status: 400 }
      );
    }

    const programIdValidation = validateSolanaAddress(programIdParam);
    if (!programIdValidation.valid) {
      return NextResponse.json(
        { error: programIdValidation.error || 'Invalid program ID format' },
        { status: 400 }
      );
    }

    const programId = new PublicKey(programIdParam);

    // Validate encoding
    const validEncodings = ['base58', 'base64', 'jsonParsed', 'base64+zstd'];
    if (!validEncodings.includes(encoding)) {
      return NextResponse.json(
        { error: `Invalid encoding. Must be one of: ${validEncodings.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse limit
    const limit = limitParam ? Math.min(parseInt(limitParam, 10), 10000) : 100;
    if (isNaN(limit) || limit < 1) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be a positive number <= 10000' },
        { status: 400 }
      );
    }

    // Get RPC connection
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 
                   (process.env.NEXT_PUBLIC_HELIUS_API_KEY 
                     ? `https://rpc.helius.xyz/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
                     : 'https://api.mainnet-beta.solana.com');
    
    const connection = new Connection(rpcUrl, commitment);

    // Build filters
    const filters: any[] = [];

    // Data size filter
    if (dataSizeParam) {
      const dataSize = parseInt(dataSizeParam, 10);
      if (!isNaN(dataSize) && dataSize > 0) {
        filters.push({ dataSize });
      }
    }

    // Memcmp filter
    if (memcmpParam) {
      try {
        const memcmp = JSON.parse(memcmpParam);
        if (memcmp.offset !== undefined && memcmp.bytes) {
          filters.push({
            memcmp: {
              offset: parseInt(memcmp.offset, 10),
              bytes: memcmp.bytes,
            },
          });
        }
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid memcmp filter format. Expected JSON: {offset: number, bytes: string}' },
          { status: 400 }
        );
      }
    }

    // Parse additional filters from JSON string
    if (filtersParam) {
      try {
        const additionalFilters = JSON.parse(filtersParam);
        if (Array.isArray(additionalFilters)) {
          filters.push(...additionalFilters);
        } else if (typeof additionalFilters === 'object') {
          filters.push(additionalFilters);
        }
      } catch (e) {
        return NextResponse.json(
          { error: 'Invalid filters format. Expected JSON array or object' },
          { status: 400 }
        );
      }
    }

    // Query program accounts
    const accounts = await connection.getProgramAccounts(programId, {
      encoding: encoding as any,
      filters: filters.length > 0 ? filters : undefined,
      commitment,
    });

    // Limit results
    const limitedAccounts = accounts.slice(0, limit);

    return NextResponse.json({
      success: true,
      programId: programId.toString(),
      total: accounts.length,
      returned: limitedAccounts.length,
      accounts: limitedAccounts.map(acc => ({
        pubkey: acc.pubkey.toString(),
        account: {
          lamports: acc.account.lamports,
          owner: acc.account.owner.toString(),
          executable: acc.account.executable,
          rentEpoch: acc.account.rentEpoch,
          data: acc.account.data,
        },
      })),
    });
  } catch (error) {
    console.error('Error querying program accounts:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to query program accounts',
        details: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

