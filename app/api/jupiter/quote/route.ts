// Next.js API route to proxy Jupiter quote requests (fixes CORS issues)

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, validateNumeric, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/app/lib/security/rate-limit-middleware';

const JUPITER_API_BASE = `${ALLOWED_API_BASES.JUPITER}/v6`;

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = withRateLimit(request, RATE_LIMIT_CONFIGS.proxy);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const searchParams = request.nextUrl.searchParams;
    // Security: API keys should only come from environment variables, never from query parameters
    const apiKey = process.env.JUPITER_API_KEY;
    
    const inputMint = searchParams.get('inputMint');
    const outputMint = searchParams.get('outputMint');
    const amount = searchParams.get('amount');
    const slippageBps = searchParams.get('slippageBps') || '50';

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: inputMint, outputMint, amount' },
        { status: 400 }
      );
    }

    // Validate Solana addresses (prevents SSRF)
    const inputMintValidation = validateSolanaAddress(inputMint);
    if (!inputMintValidation.valid) {
      return NextResponse.json(
        { error: `Invalid inputMint: ${inputMintValidation.error}` },
        { status: 400 }
      );
    }

    const outputMintValidation = validateSolanaAddress(outputMint);
    if (!outputMintValidation.valid) {
      return NextResponse.json(
        { error: `Invalid outputMint: ${outputMintValidation.error}` },
        { status: 400 }
      );
    }

    // Validate amount (must be numeric, positive)
    const amountValidation = validateNumeric(amount, 1);
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: `Invalid amount: ${amountValidation.error}` },
        { status: 400 }
      );
    }

    // Validate slippage (0-10000 basis points, i.e., 0-100%)
    const slippageValidation = validateNumeric(slippageBps, 0, 10000);
    if (!slippageValidation.valid) {
      return NextResponse.json(
        { error: `Invalid slippageBps: ${slippageValidation.error}` },
        { status: 400 }
      );
    }

    // Build Jupiter API URL safely with encoded parameters
    const url = `${JUPITER_API_BASE}/quote?inputMint=${safeEncodeParam(inputMint)}&outputMint=${safeEncodeParam(outputMint)}&amount=${safeEncodeParam(amount)}&slippageBps=${safeEncodeParam(slippageBps)}`;
    
    // Prepare headers with API key if available
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };
    
    // Add API key to headers if configured (Jupiter API key is typically passed as a header)
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
      // Some Jupiter endpoints may use a different header format, adjust if needed
      // headers['X-API-Key'] = apiKey;
    }
    
    // Fetch from Jupiter API
    const response = await fetch(url, {
      headers,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Jupiter API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract price and fee from Jupiter response
    if (data && data.outAmount && data.inAmount) {
      const inAmount = BigInt(data.inAmount);
      const outAmount = BigInt(data.outAmount);
      const price = Number(outAmount) / Number(inAmount);
      
      // Estimate fee (Jupiter aggregates, so fee varies)
      const fee = data.routePlan?.[0]?.swapInfo?.feeAmount || 30;
      
      return NextResponse.json({
        price,
        fee,
        inAmount: data.inAmount,
        outAmount: data.outAmount,
        routePlan: data.routePlan,
      });
    }

    return NextResponse.json(
      { error: 'Invalid response from Jupiter API' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Jupiter quote proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
