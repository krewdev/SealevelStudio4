// Next.js API route to proxy Dune Analytics queries

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DUNE_API_BASE = 'https://api.dune.com/api/v1';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    // Security: API keys should only come from environment variables, never from query parameters
    const apiKey = process.env.DUNE_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Dune API key required. Set DUNE_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const queryId = searchParams.get('queryId');
    const action = searchParams.get('action') || 'results'; // results, execute, status

    // Validate queryId: must be strictly numeric or valid UUID (no extra characters)
    function isValidQueryId(qid: string | null): boolean {
      if (!qid) return false;
      // strictly numeric (disallow leading zeros if desired)
      const isNumericId = /^[0-9]+$/.test(qid);
      // strictly UUID v4, case-insensitive but exactly formatted
      const isUUID = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(qid);
      return isNumericId || isUUID;
    }

    if ((action === 'results') && !queryId) {
      return NextResponse.json(
        { error: 'Query ID required for results' },
        { status: 400 }
      );
    }

    if (!isValidQueryId(queryId)) {
      return NextResponse.json(
    // By this point, queryId is guaranteed safe for interpolation.
        { error: 'Invalid query ID format.' },
        { status: 400 }
      );
    }

    let url = '';
    
    switch (action) {
      case 'results':
        url = `${DUNE_API_BASE}/query/${queryId}/results`;
        break;
      case 'execute':
        url = `${DUNE_API_BASE}/query/${queryId}/execute`;
        break;
      case 'status':
        url = `${DUNE_API_BASE}/execution/${queryId}/status`;
        break;
      default:
        url = `${DUNE_API_BASE}/query/${queryId}/results`;
    }

    const response = await fetch(url, {
      headers: {
        'X-Dune-API-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Dune API error: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Dune Analytics proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

