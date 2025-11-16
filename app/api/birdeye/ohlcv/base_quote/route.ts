// Next.js API route to proxy Birdeye base_quote OHLCV requests
// Fetches OHLCV data for base/quote pairs

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, validateNumeric, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

const BIRDEYE_API_BASE = ALLOWED_API_BASES.BIRDEYE;

// Allowed OHLCV types (whitelist)
const ALLOWED_OHLCV_TYPES = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M', '15s'];

// Allowed UI amount modes
const ALLOWED_UI_AMOUNT_MODES = ['raw', 'ui', 'scaled'];

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

    const baseAddress = searchParams.get('base');
    const quoteAddress = searchParams.get('quote');
    const type = searchParams.get('type') || '1m';
    const uiAmountMode = searchParams.get('ui_amount_mode') || 'raw';
    const timeFrom = searchParams.get('time_from');
    const timeTo = searchParams.get('time_to');

    // Validate required parameters
    if (!baseAddress || !quoteAddress) {
      return NextResponse.json(
        { error: 'Both base and quote addresses are required' },
        { status: 400 }
      );
    }

    // Validate Solana addresses (prevents SSRF)
    const baseValidation = validateSolanaAddress(baseAddress);
    if (!baseValidation.valid) {
      return NextResponse.json(
        { error: `Invalid base address: ${baseValidation.error}` },
        { status: 400 }
      );
    }

    const quoteValidation = validateSolanaAddress(quoteAddress);
    if (!quoteValidation.valid) {
      return NextResponse.json(
        { error: `Invalid quote address: ${quoteValidation.error}` },
        { status: 400 }
      );
    }

    // Validate type (prevent injection)
    if (!ALLOWED_OHLCV_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${ALLOWED_OHLCV_TYPES.join(', ')}` },
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
    params.append('base', baseAddress);
    params.append('quote', quoteAddress);
    params.append('type', type);
    params.append('ui_amount_mode', uiAmountMode);

    if (timeFrom) {
      params.append('time_from', timeFrom);
    }
    if (timeTo) {
      params.append('time_to', timeTo);
    }

    const url = `${BIRDEYE_API_BASE}/defi/ohlcv/base_quote?${params.toString()}`;

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
    console.error('Birdeye base_quote OHLCV proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

