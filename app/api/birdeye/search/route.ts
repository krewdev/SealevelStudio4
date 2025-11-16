// Next.js API route to proxy Birdeye search requests
// Search for tokens and markets by pattern or address

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';

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

    const query = searchParams.get('query');
    const limit = searchParams.get('limit') || '10';

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Validate limit (1-50)
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return NextResponse.json(
        { error: 'Invalid limit. Must be between 1 and 50' },
        { status: 400 }
      );
    }

    // If query looks like a Solana address, validate it
    if (query.length >= 32 && query.length <= 44) {
      const addressValidation = validateSolanaAddress(query);
      // Don't fail if it's not a valid address - might be a symbol/name search
    }

    // Build URL
    const params = new URLSearchParams();
    params.append('query', query);
    params.append('limit', limit);

    const url = `${BIRDEYE_API_BASE}/defi/search?${params.toString()}`;

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
    console.error('Birdeye search proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

