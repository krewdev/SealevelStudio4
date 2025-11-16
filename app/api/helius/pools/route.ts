// Next.js API route to proxy Helius pool data requests

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const HELIUS_API_BASE = 'https://api.helius.xyz/v0';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const apiKey = process.env.HELIUS_API_KEY || searchParams.get('apiKey');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Helius API key required. Set HELIUS_API_KEY environment variable or pass as query param.' },
        { status: 400 }
      );
    }

    const dex = searchParams.get('dex') || 'all';
    const limit = searchParams.get('limit') || '100';

    // Helius DEX API endpoint for pool data
    const url = `${HELIUS_API_BASE}/token-metadata?api-key=${apiKey}`;
    
    // For pool data, we'll use Helius's enhanced RPC methods
    // This is a simplified version - in production, use Helius's DEX-specific endpoints
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getProgramAccounts',
        params: [
          dex === 'raydium' ? '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' :
          dex === 'orca' ? 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc' :
          null,
          {
            filters: [{ dataSize: 752 }],
            encoding: 'jsonParsed',
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
  } catch (error) {
    console.error('Helius pools proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

