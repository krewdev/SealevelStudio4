// Next.js API route to proxy Solscan API requests

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, validateEndpoint, validateAction, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/app/lib/security/rate-limit-middleware';

export const dynamic = 'force-dynamic';

const SOLSCAN_API_BASE = ALLOWED_API_BASES.SOLSCAN;

// Allowed endpoints (whitelist)
const ALLOWED_ENDPOINTS = ['account', 'token', 'market'];
const ALLOWED_ACTIONS = ['info', 'tokens', 'transactions'];

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = withRateLimit(request, RATE_LIMIT_CONFIGS.proxy);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    // Security: API keys should only come from environment variables, never from query parameters
    const apiKey = process.env.SOLSCAN_API_KEY;
    
    const endpoint = searchParams.get('endpoint') || 'account';
    const address = searchParams.get('address');
    const action = searchParams.get('action') || 'info';

    // Validate endpoint (prevent path traversal)
    const endpointValidation = validateEndpoint(endpoint, ALLOWED_ENDPOINTS);
    if (!endpointValidation.valid) {
      return NextResponse.json(
        { error: endpointValidation.error || 'Invalid endpoint' },
        { status: 400 }
      );
    }

    // Validate action (prevent path traversal)
    if (!validateAction(action, ALLOWED_ACTIONS)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    // Validate address if required
    if (endpoint === 'account' || endpoint === 'token' || endpoint === 'market') {
      if (!address) {
        return NextResponse.json(
          { error: 'Address required' },
          { status: 400 }
        );
      }

      // Validate Solana address format (prevents SSRF)
      const addressValidation = validateSolanaAddress(address);
      if (!addressValidation.valid) {
        return NextResponse.json(
          { error: addressValidation.error || 'Invalid address format' },
          { status: 400 }
        );
      }
    }

    // Build URL safely with validated parameters
    let url = '';
    const encodedAddress = address ? safeEncodeParam(address) : '';
    
    switch (endpoint) {
      case 'account':
        switch (action) {
          case 'info':
            url = `${SOLSCAN_API_BASE}/account?address=${encodedAddress}`;
            break;
          case 'tokens':
            url = `${SOLSCAN_API_BASE}/account/tokens?address=${encodedAddress}`;
            break;
          case 'transactions':
            url = `${SOLSCAN_API_BASE}/account/transactions?address=${encodedAddress}`;
            break;
          default:
            url = `${SOLSCAN_API_BASE}/account?address=${encodedAddress}`;
        }
        break;
      case 'token':
        url = `${SOLSCAN_API_BASE}/token/meta?tokenAddress=${encodedAddress}`;
        break;
      case 'market':
        url = `${SOLSCAN_API_BASE}/market/token/price?tokenAddress=${encodedAddress}`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid endpoint' },
          { status: 400 }
        );
    }

    const response = await fetch(url, {
      headers: {
        ...(apiKey ? { 'token': apiKey } : {}),
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Solscan API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Solscan proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

