/**
 * Consensus API Route
 * Handles GET and POST requests for consensus queries
 */

import { NextRequest, NextResponse } from 'next/server';
import { executeConsensus, executeConsensusWithRetry } from '@/app/lib/ai/consensus/engine';
import { providerRegistry } from '@/app/lib/ai/consensus/providers/registry';
import { consensusCache } from '@/app/lib/ai/consensus/cache';
import { ConsensusQueryOptions } from '@/app/lib/ai/consensus/types';

/**
 * GET /api/ai/consensus
 * Get consensus result by ID or list providers
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');
  const id = searchParams.get('id');

  try {
    // Get consensus result by ID
    if (id) {
      // For now, we don't have persistent storage, so we can't retrieve by ID
      // In production, store results in database
      return NextResponse.json({
        error: 'Result retrieval by ID not yet implemented',
      }, { status: 501 });
    }

    // List providers
    if (action === 'providers') {
      const providers = providerRegistry.getAll();
      return NextResponse.json({
        providers: providers.map(p => ({
          id: p.id,
          name: p.name,
          enabled: p.enabled,
          health: p.getHealth(),
        })),
      });
    }

    // Get provider health
    if (action === 'health') {
      const providers = providerRegistry.getAll();
      const health = await Promise.all(
        providers.map(async p => ({
          id: p.id,
          name: p.name,
          health: await p.getHealth(),
        }))
      );
      return NextResponse.json({ health });
    }

    // Get cache stats
    if (action === 'cache') {
      const stats = consensusCache.getStats();
      return NextResponse.json({ cache: stats });
    }

    return NextResponse.json({
      error: 'Invalid action. Use ?action=providers|health|cache or ?id=<consensus-id>',
    }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({
      error: error.message || 'Failed to process GET request',
    }, { status: 500 });
  }
}

/**
 * POST /api/ai/consensus
 * Execute consensus query
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, options, config, retry } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({
        error: 'Prompt is required and must be a string',
      }, { status: 400 });
    }

    const queryOptions: ConsensusQueryOptions = {
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
      timeout: options?.timeout,
    };

    // Execute consensus (with or without retry)
    const result = retry
      ? await executeConsensusWithRetry(prompt, queryOptions, config)
      : await executeConsensus(prompt, queryOptions, config);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Consensus API error:', error);
    return NextResponse.json({
      error: error.message || 'Failed to execute consensus',
      details: error.stack,
    }, { status: 500 });
  }
}

