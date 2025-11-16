// Next.js API route to proxy Birdeye historical price requests
// Get historical price data for tokens

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, validateNumeric, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';

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
    const type = searchParams.get('type') || '1D';
    const timeFrom = searchParams.get('time_from');
    const timeTo = searchParams.get('time_to');

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

    // Validate time_from and time_to if provided
    if (timeFrom) {
      const timeFromValidation = validateNumeric(timeFrom, 0);
      if (!timeFromValidation.valid) {
        return NextResponse.json(
          { error: `Invalid time_from: ${timeFromValidation.error}` },
          { status: 400 }
        );
      }
    }

    if (timeTo) {
      const timeToValidation = validateNumeric(timeTo, 0);
      if (!timeToValidation.valid) {
        return NextResponse.json(
          { error: `Invalid time_to: ${timeToValidation.error}` },
          { status: 400 }
        );
      }
    }

    // Build URL
    const params = new URLSearchParams();
    params.append('address', address);
    params.append('type', type);

    if (timeFrom) {
      params.append('time_from', timeFrom);
    }
    if (timeTo) {
      params.append('time_to', timeTo);
    }

    const url = `${BIRDEYE_API_BASE}/defi/price_history?${params.toString()}`;

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
    console.error('Birdeye price history proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

