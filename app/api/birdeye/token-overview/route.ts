// Next.js API route to proxy Birdeye token overview requests
// Get detailed information about a specific token

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, ALLOWED_API_BASES } from '@/app/lib/security/validation';

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

    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json(
        { error: 'Token address is required' },
        { status: 400 }
      );
    }

    // Validate Solana address (prevents SSRF)
    const addressValidation = validateSolanaAddress(address);
    if (!addressValidation.valid) {
      return NextResponse.json(
        { error: addressValidation.error || 'Invalid address format' },
        { status: 400 }
      );
    }

    const url = `${BIRDEYE_API_BASE}/defi/token_overview?address=${encodeURIComponent(address)}`;

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
    console.error('Birdeye token overview proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

