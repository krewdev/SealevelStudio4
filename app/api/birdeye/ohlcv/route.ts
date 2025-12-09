// Next.js API route to proxy Birdeye OHLCV (Open, High, Low, Close, Volume) data requests

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, validateNumeric, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/app/lib/security/rate-limit-middleware';

export const dynamic = 'force-dynamic';

const BIRDEYE_API_BASE = ALLOWED_API_BASES.BIRDEYE;

// Allowed OHLCV types (whitelist)
const ALLOWED_OHLCV_TYPES = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M', '15s'];

// Allowed modes (whitelist)
const ALLOWED_MODES = ['range', 'last'];

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = withRateLimit(request, RATE_LIMIT_CONFIGS.proxy);
  if (rateLimitResponse) return rateLimitResponse;

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
    const type = searchParams.get('type') || '15m';
    const timeFrom = searchParams.get('time_from');
    const timeTo = searchParams.get('time_to');
    const mode = searchParams.get('mode') || 'range';
    const padding = searchParams.get('padding') || 'false';
    const outlier = searchParams.get('outlier') || 'true';
    const inversion = searchParams.get('inversion') || 'false';

    // Validate required parameters
    if (!address) {
      return NextResponse.json(
        { error: 'Pair address is required' },
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

    // Validate type (prevent injection)
    if (!ALLOWED_OHLCV_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${ALLOWED_OHLCV_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate mode
    if (!ALLOWED_MODES.includes(mode)) {
      return NextResponse.json(
        { error: `Invalid mode. Must be one of: ${ALLOWED_MODES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate time_from and time_to for range mode
    if (mode === 'range') {
      if (!timeFrom || !timeTo) {
        return NextResponse.json(
          { error: 'time_from and time_to are required for range mode' },
          { status: 400 }
        );
      }

      const timeFromValidation = validateNumeric(timeFrom, 0);
      if (!timeFromValidation.valid) {
        return NextResponse.json(
          { error: `Invalid time_from: ${timeFromValidation.error}` },
          { status: 400 }
        );
      }

      const timeToValidation = validateNumeric(timeTo, 0);
      if (!timeToValidation.valid) {
        return NextResponse.json(
          { error: `Invalid time_to: ${timeToValidation.error}` },
          { status: 400 }
        );
      }

      // Ensure time_to > time_from
      if (parseInt(timeTo) <= parseInt(timeFrom)) {
        return NextResponse.json(
          { error: 'time_to must be greater than time_from' },
          { status: 400 }
        );
      }
    }

    // Validate boolean parameters
    const booleanParams = ['padding', 'outlier', 'inversion'];
    for (const param of booleanParams) {
      const value = searchParams.get(param);
      if (value && value !== 'true' && value !== 'false') {
        return NextResponse.json(
          { error: `${param} must be 'true' or 'false'` },
          { status: 400 }
        );
      }
    }

    // Build URL safely with validated and encoded parameters
    const params = new URLSearchParams();
    params.append('address', address);
    params.append('type', type);
    params.append('mode', mode);
    params.append('padding', padding);
    params.append('outlier', outlier);
    params.append('inversion', inversion);

    if (timeFrom) {
      params.append('time_from', timeFrom);
    }
    if (timeTo) {
      params.append('time_to', timeTo);
    }

    const url = `${BIRDEYE_API_BASE}/defi/v3/ohlcv/pair?${params.toString()}`;

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
    console.error('Birdeye OHLCV proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

