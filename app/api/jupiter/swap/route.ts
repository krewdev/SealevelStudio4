// Next.js API route to proxy Jupiter swap requests (fixes CORS issues and handles API key)

import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_API_BASES } from '@/app/lib/security/validation';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/app/lib/security/rate-limit-middleware';

const JUPITER_API_BASE = `${ALLOWED_API_BASES.JUPITER}/v6`;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = withRateLimit(request, RATE_LIMIT_CONFIGS.proxy);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Security: API keys should only come from environment variables, never from request body
    const apiKey = process.env.JUPITER_API_KEY;
    
    const body = await request.json();
    
    // Validate required fields
    if (!body.quoteResponse) {
      return NextResponse.json(
        { error: 'Missing required field: quoteResponse' },
        { status: 400 }
      );
    }

    // Prepare headers with API key if available
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    // Add API key to headers if configured
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Forward request to Jupiter swap API
    const response = await fetch(`${JUPITER_API_BASE}/swap`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Jupiter API error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Jupiter swap proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

