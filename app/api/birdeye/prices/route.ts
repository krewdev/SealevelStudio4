// Next.js API route to proxy Birdeye price data requests

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BIRDEYE_API_BASE = 'https://public-api.birdeye.so';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const apiKey = process.env.BIRDEYE_API_KEY || searchParams.get('apiKey');
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Birdeye API key required. Set BIRDEYE_API_KEY environment variable or pass as query param.' },
        { status: 400 }
      );
    }

    const address = searchParams.get('address');
    const type = searchParams.get('type') || 'price'; // price, volume, marketcap, etc.

    if (!address && type === 'price') {
      return NextResponse.json(
        { error: 'Token address required for price lookup' },
        { status: 400 }
      );
    }

    let url = '';
    
    switch (type) {
      case 'price':
        url = `${BIRDEYE_API_BASE}/defi/price?address=${address}`;
        break;
      case 'volume':
        url = `${BIRDEYE_API_BASE}/defi/token_overview?address=${address}`;
        break;
      case 'pairs':
        url = `${BIRDEYE_API_BASE}/defi/pairs?address=${address}`;
        break;
      default:
        url = `${BIRDEYE_API_BASE}/defi/price?address=${address}`;
    }

    const response = await fetch(url, {
      headers: {
        'X-API-KEY': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Birdeye API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Birdeye prices proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

