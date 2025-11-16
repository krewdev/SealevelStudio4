// Next.js API route to proxy Dune Analytics queries

import { NextRequest, NextResponse } from 'next/server';
import { validateNumeric, validateUUID, validateAction, safeEncodeParam, ALLOWED_API_BASES } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

const DUNE_API_BASE = `${ALLOWED_API_BASES.DUNE}/api/v1`;

// Allowed actions (whitelist)
const ALLOWED_ACTIONS = ['results', 'execute', 'status'];

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
    const action = searchParams.get('action') || 'results';

    // Validate action (prevent path traversal)
    if (!validateAction(action, ALLOWED_ACTIONS)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be one of: results, execute, status' },
        { status: 400 }
      );
    }

    if (!queryId && action === 'results') {
      return NextResponse.json(
        { error: 'Query ID required for results' },
        { status: 400 }
      );
    }

    // Validate queryId - must be strictly numeric or valid UUID (prevents SSRF)
    if (queryId) {
      const numericValidation = validateNumeric(queryId, 1);
      const uuidValidation = validateUUID(queryId);
      
      if (!numericValidation.valid && !uuidValidation.valid) {
        return NextResponse.json(
          { error: 'Invalid query ID format. Must be numeric or UUID' },
          { status: 400 }
        );
      }

      // Ensure queryId doesn't contain path traversal characters
      if (queryId.includes('..') || queryId.includes('/') || queryId.includes('\\')) {
        return NextResponse.json(
          { error: 'Invalid query ID format' },
          { status: 400 }
        );
      }
    }

    // Build URL safely - use validated queryId directly in path (already validated)
    // No need to encode as it's already validated as numeric or UUID
    let url = '';
    const safeQueryId = queryId || '';
    
    switch (action) {
      case 'results':
        url = `${DUNE_API_BASE}/query/${safeQueryId}/results`;
        break;
      case 'execute':
        url = `${DUNE_API_BASE}/query/${safeQueryId}/execute`;
        break;
      case 'status':
        url = `${DUNE_API_BASE}/execution/${safeQueryId}/status`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
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

