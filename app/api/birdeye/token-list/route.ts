// Next.js API route to proxy Birdeye token list requests
// Fetches lists of tokens with trading activity

import { NextRequest, NextResponse } from 'next/server';
import { validateNumeric, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

const BIRDEYE_API_BASE = ALLOWED_API_BASES.BIRDEYE;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const apiKey = process.env.BIRDEYE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Birdeye API key required. Set BIRDEYE_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const offset = searchParams.get('offset') || '0';
    const limit = searchParams.get('limit') || '50';
    const sortBy = searchParams.get('sort_by') || 'v24hUSD';
    const sortType = searchParams.get('sort_type') || 'desc';

    // Validate offset
    const offsetValidation = validateNumeric(offset, 0);
    if (!offsetValidation.valid) {
      return NextResponse.json(
        { error: `Invalid offset: ${offsetValidation.error}` },
        { status: 400 }
      );
    }

    // Validate limit (1-100)
    const limitValidation = validateNumeric(limit, 1, 100);
    if (!limitValidation.valid) {
      return NextResponse.json(
        { error: `Invalid limit: ${limitValidation.error}` },
        { status: 400 }
      );
    }

    // Build URL
    const params = new URLSearchParams();
    params.append('offset', offset);
    params.append('limit', limit);
    params.append('sort_by', sortBy);
    params.append('sort_type', sortType);

    const url = `${BIRDEYE_API_BASE}/defi/tokenlist?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
        'x-chain': 'solana',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Birdeye API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Birdeye token list proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

