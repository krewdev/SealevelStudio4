// Next.js API route to proxy Birdeye price data requests

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, validateEndpoint, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

const BIRDEYE_API_BASE = ALLOWED_API_BASES.BIRDEYE;

// Allowed types (whitelist)
const ALLOWED_TYPES = ['price', 'volume', 'pairs'];

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // Security: API keys should only come from environment variables, never from query parameters
    const apiKey = process.env.BIRDEYE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Birdeye API key required. Set BIRDEYE_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const address = searchParams.get('address');
    const type = searchParams.get('type') || 'price';

    // Validate type (prevent path traversal)
    const typeValidation = validateEndpoint(type, ALLOWED_TYPES);
    if (!typeValidation.valid) {
      return NextResponse.json(
        { error: typeValidation.error || 'Invalid type' },
        { status: 400 }
      );
    }

    if (!address && type === 'price') {
      return NextResponse.json(
        { error: 'Token address required for price lookup' },
        { status: 400 }
      );
    }

    // Validate Solana address if provided (prevents SSRF)
    if (address) {
      const addressValidation = validateSolanaAddress(address);
      if (!addressValidation.valid) {
        return NextResponse.json(
          { error: addressValidation.error || 'Invalid address format' },
          { status: 400 }
        );
      }
    }

    // Build URL safely with validated and encoded parameters
    const encodedAddress = address ? safeEncodeParam(address) : '';
    let url = '';
    
    switch (type) {
      case 'price':
        url = `${BIRDEYE_API_BASE}/defi/price?address=${encodedAddress}`;
        break;
      case 'volume':
        url = `${BIRDEYE_API_BASE}/defi/token_overview?address=${encodedAddress}`;
        break;
      case 'pairs':
        url = `${BIRDEYE_API_BASE}/defi/pairs?address=${encodedAddress}`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid type' },
          { status: 400 }
        );
    }

    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Birdeye API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Birdeye prices proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

