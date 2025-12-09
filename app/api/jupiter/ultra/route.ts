// Next.js API route to proxy Jupiter Ultra API requests
// Ultra API simplifies swap execution by handling quote + execution in one call

import { NextRequest, NextResponse } from 'next/server';
import { validateSolanaAddress, validateNumeric, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';
import { withRateLimit, RATE_LIMIT_CONFIGS } from '@/app/lib/security/rate-limit-middleware';

const JUPITER_ULTRA_BASE = `${ALLOWED_API_BASES.JUPITER_ULTRA}/ultra`;

export const dynamic = 'force-dynamic';

/**
 * POST /api/jupiter/ultra
 * Execute a swap using Jupiter Ultra API (quote + execute in one call)
 * 
 * Request body:
 * {
 *   inputMint: string,
 *   outputMint: string,
 *   amount: string (in lamports),
 *   taker: string (wallet public key),
 *   slippageBps?: number (optional, default: 50),
 *   priorityFee?: number (optional),
 *   wrapAndUnwrapSol?: boolean (optional, default: true)
 * }
 */
export async function POST(request: NextRequest) {
  // Rate limiting
  const rateLimitResponse = withRateLimit(request, RATE_LIMIT_CONFIGS.proxy);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Security: API keys should only come from environment variables
    const apiKey = process.env.JUPITER_API_KEY;
    
    const body = await request.json();
    
    // Validate required fields
    const { inputMint, outputMint, amount, taker } = body;
    
    if (!inputMint || !outputMint || !amount || !taker) {
      return NextResponse.json(
        { error: 'Missing required fields: inputMint, outputMint, amount, taker' },
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

    const takerValidation = validateSolanaAddress(taker);
    if (!takerValidation.valid) {
      return NextResponse.json(
        { error: `Invalid taker: ${takerValidation.error}` },
        { status: 400 }
      );
    }

    // Validate amount (must be numeric, positive)
    const amountStr = String(amount);
    const amountValidation = validateNumeric(amountStr, 1);
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: `Invalid amount: ${amountValidation.error}` },
        { status: 400 }
      );
    }

    // Prepare Ultra API request body
    const ultraRequest: any = {
      input_mint: inputMint,
      output_mint: outputMint,
      amount: amountStr,
      taker: taker,
    };

    // Optional parameters
    if (body.slippageBps !== undefined) {
      const slippageValidation = validateNumeric(String(body.slippageBps), 0, 10000);
      if (!slippageValidation.valid) {
        return NextResponse.json(
          { error: `Invalid slippageBps: ${slippageValidation.error}` },
          { status: 400 }
        );
      }
      ultraRequest.slippage_bps = body.slippageBps;
    } else {
      ultraRequest.slippage_bps = 50; // Default 0.5%
    }

    if (body.priorityFee !== undefined) {
      ultraRequest.priority_fee = body.priorityFee;
    }

    if (body.wrapAndUnwrapSol !== undefined) {
      ultraRequest.wrap_and_unwrap_sol = body.wrapAndUnwrapSol;
    } else {
      ultraRequest.wrap_and_unwrap_sol = true; // Default true
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
    
    // Call Jupiter Ultra API (order and execute in one call)
    const response = await fetch(`${JUPITER_ULTRA_BASE}/order`, {
      method: 'POST',
      headers,
      body: JSON.stringify(ultraRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      return NextResponse.json(
        { 
          error: `Jupiter Ultra API error: ${response.statusText}`,
          details: errorData,
          status: response.status
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    // Ultra API returns the transaction signature if successful
    // Format: { status: "Success" | "Failed", signature?: string, error?: string }
    return NextResponse.json(data);
  } catch (error) {
    console.error('Jupiter Ultra API proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jupiter/ultra
 * Get quote using Ultra API (alternative to /quote endpoint)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
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

    // Validate inputs
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

    const amountValidation = validateNumeric(amount, 1);
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: `Invalid amount: ${amountValidation.error}` },
        { status: 400 }
      );
    }

    const slippageValidation = validateNumeric(slippageBps, 0, 10000);
    if (!slippageValidation.valid) {
      return NextResponse.json(
        { error: `Invalid slippageBps: ${slippageValidation.error}` },
        { status: 400 }
      );
    }

    // Prepare headers
    const headers: HeadersInit = {
      'Accept': 'application/json',
    };
    
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    
    // Ultra API quote endpoint
    const url = `${JUPITER_ULTRA_BASE}/quote?input_mint=${safeEncodeParam(inputMint)}&output_mint=${safeEncodeParam(outputMint)}&amount=${safeEncodeParam(amount)}&slippage_bps=${safeEncodeParam(slippageBps)}`;
    
    const response = await fetch(url, { headers });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Jupiter Ultra API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Jupiter Ultra quote proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

