// Next.js API route to proxy Birdeye v3 transactions requests
// Fetches transactions with advanced sorting and filtering

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, validateNumeric, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

const BIRDEYE_API_BASE = ALLOWED_API_BASES.BIRDEYE;

// Allowed transaction types (whitelist)
const ALLOWED_TX_TYPES = ['swap', 'transfer', 'all'];

// Allowed UI amount modes
const ALLOWED_UI_AMOUNT_MODES = ['raw', 'ui', 'scaled'];

// Allowed sort fields
const ALLOWED_SORT_BY = ['block_unix_time', 'amount', 'signature'];

// Allowed sort types
const ALLOWED_SORT_TYPES = ['asc', 'desc'];

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

    const offset = searchParams.get('offset') || '0';
    const limit = searchParams.get('limit') || '100';
    const sortBy = searchParams.get('sort_by') || 'block_unix_time';
    const sortType = searchParams.get('sort_type') || 'desc';
    const txType = searchParams.get('tx_type') || 'all';
    const uiAmountMode = searchParams.get('ui_amount_mode') || 'scaled';
    const address = searchParams.get('address'); // Optional: filter by token or pair address
    const timeFrom = searchParams.get('time_from');
    const timeTo = searchParams.get('time_to');

    // Validate offset (must be numeric, >= 0)
    const offsetValidation = validateNumeric(offset, 0);
    if (!offsetValidation.valid) {
      return NextResponse.json(
        { error: `Invalid offset: ${offsetValidation.error}` },
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

    // Validate sort_by
    if (!ALLOWED_SORT_BY.includes(sortBy)) {
      return NextResponse.json(
        { error: `Invalid sort_by. Must be one of: ${ALLOWED_SORT_BY.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate sort_type
    if (!ALLOWED_SORT_TYPES.includes(sortType)) {
      return NextResponse.json(
        { error: `Invalid sort_type. Must be one of: ${ALLOWED_SORT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate tx_type
    if (!ALLOWED_TX_TYPES.includes(txType)) {
      return NextResponse.json(
        { error: `Invalid tx_type. Must be one of: ${ALLOWED_TX_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate ui_amount_mode
    if (!ALLOWED_UI_AMOUNT_MODES.includes(uiAmountMode)) {
      return NextResponse.json(
        { error: `Invalid ui_amount_mode. Must be one of: ${ALLOWED_UI_AMOUNT_MODES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate address if provided (prevents SSRF)
    if (address) {
      const addressValidation = validateSolanaAddress(address);
      if (!addressValidation.valid) {
        return NextResponse.json(
          { error: addressValidation.error || 'Invalid address format' },
          { status: 400 }
        );
      }
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

    // Build URL with validated and encoded parameters
    const params = new URLSearchParams();
    params.append('offset', offset);
    params.append('limit', limit);
    params.append('sort_by', sortBy);
    params.append('sort_type', sortType);
    params.append('tx_type', txType);
    params.append('ui_amount_mode', uiAmountMode);

    if (address) {
      params.append('address', address);
    }
    if (timeFrom) {
      params.append('time_from', timeFrom);
    }
    if (timeTo) {
      params.append('time_to', timeTo);
    }

    const url = `${BIRDEYE_API_BASE}/defi/v3/txs?${params.toString()}`;

    // Fetch from Birdeye API
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
    console.error('Birdeye v3 transactions proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

