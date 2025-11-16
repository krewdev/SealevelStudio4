// Next.js API route to proxy Birdeye multi-price requests
// Fetches prices for multiple tokens in a single request

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

const BIRDEYE_API_BASE = ALLOWED_API_BASES.BIRDEYE;

export async function POST(request: NextRequest) {
  try {
    // Security: API keys should only come from environment variables, never from request body
    const apiKey = process.env.BIRDEYE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Birdeye API key required. Set BIRDEYE_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const listAddress = body.list_address;
    const uiAmountMode = body.ui_amount_mode || 'raw';

    // Validate required fields
    if (!listAddress) {
      return NextResponse.json(
        { error: 'Missing required field: list_address' },
        { status: 400 }
      );
    }

    // Validate ui_amount_mode
    const allowedModes = ['raw', 'ui'];
    if (!allowedModes.includes(uiAmountMode)) {
      return NextResponse.json(
        { error: `Invalid ui_amount_mode. Must be one of: ${allowedModes.join(', ')}` },
        { status: 400 }
      );
    }

    // Parse and validate addresses
    const addresses = listAddress.split(',').map((addr: string) => addr.trim()).filter(Boolean);
    
    if (addresses.length === 0) {
      return NextResponse.json(
        { error: 'list_address must contain at least one address' },
        { status: 400 }
      );
    }

    // Limit number of addresses to prevent abuse (Birdeye may have limits)
    const MAX_ADDRESSES = 100;
    if (addresses.length > MAX_ADDRESSES) {
      return NextResponse.json(
        { error: `Too many addresses. Maximum ${MAX_ADDRESSES} addresses allowed.` },
        { status: 400 }
      );
    }

    // Validate each address (prevents SSRF)
    const invalidAddresses: string[] = [];
    for (const address of addresses) {
      const validation = validateSolanaAddress(address);
      if (!validation.valid) {
        invalidAddresses.push(address);
      }
    }

    if (invalidAddresses.length > 0) {
      return NextResponse.json(
        { error: `Invalid addresses: ${invalidAddresses.join(', ')}` },
        { status: 400 }
      );
    }

    // Build request body for Birdeye API
    const birdeyeRequestBody = {
      list_address: addresses.join(','),
      ui_amount_mode: uiAmountMode,
    };

    // Build URL - Birdeye multi_price endpoint
    const url = `${BIRDEYE_API_BASE}/defi/multi_price?ui_amount_mode=${safeEncodeParam(uiAmountMode)}`;

    // Fetch from Birdeye API (POST method with body)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'x-chain': 'solana',
      },
      body: JSON.stringify(birdeyeRequestBody),
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
    console.error('Birdeye multi-price proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint - Birdeye multi_price supports GET with list_address in query params
 */
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

    const listAddress = searchParams.get('list_address');
    const uiAmountMode = searchParams.get('ui_amount_mode') || 'raw';

    // Validate ui_amount_mode
    const allowedModes = ['raw', 'ui'];
    if (!allowedModes.includes(uiAmountMode)) {
      return NextResponse.json(
        { error: `Invalid ui_amount_mode. Must be one of: ${allowedModes.join(', ')}` },
        { status: 400 }
      );
    }

    // Build URL with query parameters
    const params = new URLSearchParams();
    params.append('ui_amount_mode', uiAmountMode);
    
    if (listAddress) {
      // Parse and validate addresses
      const addresses = listAddress.split(',').map((addr: string) => addr.trim()).filter(Boolean);
      
      if (addresses.length > 0) {
        const MAX_ADDRESSES = 100;
        if (addresses.length > MAX_ADDRESSES) {
          return NextResponse.json(
            { error: `Too many addresses. Maximum ${MAX_ADDRESSES} addresses allowed.` },
            { status: 400 }
          );
        }

        // Validate each address
        const invalidAddresses: string[] = [];
        for (const address of addresses) {
          const validation = validateSolanaAddress(address);
          if (!validation.valid) {
            invalidAddresses.push(address);
          }
        }

        if (invalidAddresses.length > 0) {
          return NextResponse.json(
            { error: `Invalid addresses: ${invalidAddresses.join(', ')}` },
            { status: 400 }
          );
        }

        params.append('list_address', addresses.join(','));
      }
    }

    // Build URL - Birdeye multi_price can work with GET if list_address is in query params
    const url = `${BIRDEYE_API_BASE}/defi/multi_price?${params.toString()}`;

    // Fetch from Birdeye API using GET
    const response = await fetch(url, {
      method: 'GET',
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
    console.error('Birdeye multi-price proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

