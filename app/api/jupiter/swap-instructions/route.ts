import { NextRequest, NextResponse } from 'next/server';
import { ALLOWED_API_BASES } from '@/app/lib/security/validation';

const JUPITER_SWAP_INSTRUCTIONS = `${ALLOWED_API_BASES.JUPITER}/swap/v1/swap-instructions`;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.JUPITER_API_KEY;
    const body = await request.json();

    if (!body?.quoteResponse || !body?.userPublicKey) {
      return NextResponse.json(
        { error: 'Missing quoteResponse or userPublicKey' },
        { status: 400 }
      );
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const response = await fetch(JUPITER_SWAP_INSTRUCTIONS, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        quoteResponse: body.quoteResponse,
        userPublicKey: body.userPublicKey,
        wrapAndUnwrapSol: body.wrapAndUnwrapSol !== false,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: body.prioritizationFeeLamports ?? 'auto',
      }),
    });

    const text = await response.text();
    if (!response.ok) {
      return NextResponse.json(
        { error: `Jupiter swap-instructions failed: ${response.status}`, details: text.slice(0, 800) },
        { status: response.status }
      );
    }

    return NextResponse.json(JSON.parse(text));
  } catch (error) {
    console.error('Jupiter swap-instructions proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
