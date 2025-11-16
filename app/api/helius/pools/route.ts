// Next.js API route to proxy Helius pool data requests

import { NextRequest, NextResponse } from 'next/server';
import { validateNumeric, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

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

    const dex = searchParams.get('dex') || 'all';
    const limit = searchParams.get('limit') || '100';

    // Validate dex parameter (whitelist only)
    const ALLOWED_DEX = ['all', 'raydium', 'orca'];
    if (!ALLOWED_DEX.includes(dex)) {
      return NextResponse.json(
        { error: `Invalid dex. Must be one of: ${ALLOWED_DEX.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate limit (must be numeric, 1-1000)
    const limitValidation = validateNumeric(limit, 1, 1000);
    if (!limitValidation.valid) {
      return NextResponse.json(
        { error: `Invalid limit: ${limitValidation.error}` },
        { status: 400 }
      );
    }

    // Helius DEX API endpoint for pool data
    // Use validated base URL from allow-list
    const url = `${ALLOWED_API_BASES.HELIUS}/v0/token-metadata?api-key=${safeEncodeParam(apiKey)}`;
    
    // For pool data, we'll use Helius's enhanced RPC methods
    // This is a simplified version - in production, use Helius's DEX-specific endpoints
    // Program IDs are hardcoded (whitelist) - prevents SSRF
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

