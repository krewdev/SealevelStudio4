// Next.js API route to proxy Helius pool data requests using getProgramAccountsV2 with pagination

import { NextRequest, NextResponse } from 'next/server';
import { validateNumeric, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';
import { fetchAllProgramAccountsV2 } from '@/app/lib/pools/fetchers/pagination';

export const dynamic = 'force-dynamic';

// Whitelist of allowed program IDs (prevents SSRF)
const ALLOWED_PROGRAM_IDS: Record<string, { programId: string; dataSize: number }> = {
  raydium: {
    programId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    dataSize: 752,
  },
  orca: {
    programId: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
    dataSize: 653,
  },
  meteora: {
    programId: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
    dataSize: 1024,
  },
  raydium_clmm: {
    programId: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
    dataSize: 800,
  },
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // Security: API keys should only come from environment variables, never from query parameters
    const apiKey = process.env.HELIUS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Helius API key required. Set HELIUS_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const dex = searchParams.get('dex') || 'raydium';
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    const page = searchParams.get('page'); // For manual pagination if needed
    const paginationKey = searchParams.get('paginationKey'); // For continuing pagination

    // Validate dex parameter (whitelist only)
    if (!ALLOWED_PROGRAM_IDS[dex]) {
      return NextResponse.json(
        { error: `Invalid dex. Must be one of: ${Object.keys(ALLOWED_PROGRAM_IDS).join(', ')}` },
        { status: 400 }
      );
    }

    // Validate limit (must be numeric, 1-10000)
    if (isNaN(limit) || limit < 1 || limit > 10000) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be between 1 and 10000' },
        { status: 400 }
      );
    }

    const programConfig = ALLOWED_PROGRAM_IDS[dex];
    const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${safeEncodeParam(apiKey)}`;

    // If paginationKey is provided, fetch single page
    if (paginationKey) {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getProgramAccountsV2',
          params: [
            programConfig.programId,
            {
              encoding: 'jsonParsed',
              limit: Math.min(limit, 10000),
              paginationKey,
              filters: [{ dataSize: programConfig.dataSize }],
            },
          ],
        }),
      });

      if (!response.ok) {
        return NextResponse.json(
          { error: `Helius API error: ${response.statusText}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json(data);
    }

    // Otherwise, fetch all accounts with pagination
    try {
      const accounts = await fetchAllProgramAccountsV2(
        rpcUrl,
        programConfig.programId,
        {
          limit: Math.min(limit, 10000),
          encoding: 'jsonParsed',
          filters: [{ dataSize: programConfig.dataSize }],
        }
      );

      return NextResponse.json({
        jsonrpc: '2.0',
        id: 1,
        result: {
          accounts: accounts.map(acc => ({
            pubkey: acc.pubkey,
            account: acc.account,
          })),
          total: accounts.length,
        },
      });
    } catch (error) {
      console.error('Pagination error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to fetch accounts with pagination' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Helius pools proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

