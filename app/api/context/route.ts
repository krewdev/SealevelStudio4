import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Context API Endpoint
 * Provides GET endpoints for context retrieval
 * Uses GET requests to communicate state back to the model
 */

// In-memory storage (in production, use database)
const contextStore = new Map<string, any>();

/**
 * GET /api/context/:agentId/:sessionId
 * Returns context for agent session
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    const sessionId = searchParams.get('sessionId');
    const contextId = searchParams.get('contextId');
    const action = searchParams.get('action') || 'get';

    // GET /api/context?agentId=X&sessionId=Y
    if (agentId && sessionId) {
      const key = `${agentId}_${sessionId}`;
      const contexts = Array.from(contextStore.values())
        .filter((ctx: any) => ctx.agentId === agentId && ctx.sessionId === sessionId)
        .sort((a: any, b: any) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

      if (action === 'summary') {
        // Lightweight summary
        return NextResponse.json({
          agentId,
          sessionId,
          totalContexts: contexts.length,
          recentContexts: contexts.slice(0, 5).map((ctx: any) => ({
            timestamp: ctx.timestamp,
            tags: ctx.metadata?.tags || [],
            priority: ctx.metadata?.priority || 'medium',
            dataKeys: Object.keys(ctx.contextData || {}),
          })),
          lastUpdated: contexts.length > 0 ? contexts[0].timestamp : null,
        });
      }

      // Full context aggregation
      return NextResponse.json({
        agentId,
        sessionId,
        contextCount: contexts.length,
        contexts: contexts.map((ctx: any) => ({
          timestamp: ctx.timestamp,
          data: ctx.contextData,
          tags: ctx.metadata?.tags || [],
          priority: ctx.metadata?.priority || 'medium',
        })),
      });
    }

    // GET /api/context?contextId=X
    if (contextId) {
      const context = contextStore.get(contextId);
      if (!context) {
        return NextResponse.json(
          { error: 'Context not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(context);
    }

    // GET /api/context/query?agentId=X&tags=Y
    const queryAgentId = searchParams.get('agentId');
    const queryTags = searchParams.getAll('tags');
    const limit = searchParams.get('limit');

    if (queryAgentId || queryTags.length > 0) {
      let results = Array.from(contextStore.values());

      if (queryAgentId) {
        results = results.filter((ctx: any) => ctx.agentId === queryAgentId);
      }

      if (queryTags.length > 0) {
        results = results.filter((ctx: any) =>
          queryTags.some(tag => ctx.metadata?.tags?.includes(tag))
        );
      }

      // Sort by timestamp
      results.sort((a: any, b: any) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply limit
      if (limit) {
        results = results.slice(0, parseInt(limit));
      }

      return NextResponse.json(results);
    }

    return NextResponse.json(
      { error: 'Missing required parameters' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Context API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/context
 * Save context
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, sessionId, contextData, metadata } = body;

    if (!agentId || !sessionId || !contextData) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, sessionId, contextData' },
        { status: 400 }
      );
    }

    const contextId = `${agentId}_${sessionId}_${Date.now()}`;
    const context = {
      contextId,
      agentId,
      sessionId,
      timestamp: new Date().toISOString(),
      contextData,
      metadata: {
        version: '1.0',
        priority: metadata?.priority || 'medium',
        ttl: metadata?.ttl,
        tags: metadata?.tags || [],
        relatedContexts: metadata?.relatedContexts || [],
        ...metadata,
      },
    };

    contextStore.set(contextId, context);

    return NextResponse.json({
      success: true,
      contextId,
    });
  } catch (error) {
    console.error('Context save error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/context/:contextId
 * Update context
 */
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');

    if (!contextId) {
      return NextResponse.json(
        { error: 'Missing contextId' },
        { status: 400 }
      );
    }

    const existing = contextStore.get(contextId);
    if (!existing) {
      return NextResponse.json(
        { error: 'Context not found' },
        { status: 404 }
      );
    }

    const updates = await request.json();
    const updated = { ...existing, ...updates };
    contextStore.set(contextId, updated);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Context update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/context/:contextId
 * Delete context
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contextId = searchParams.get('contextId');

    if (!contextId) {
      return NextResponse.json(
        { error: 'Missing contextId' },
        { status: 400 }
      );
    }

    const deleted = contextStore.delete(contextId);
    return NextResponse.json({ success: deleted });
  } catch (error) {
    console.error('Context delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

