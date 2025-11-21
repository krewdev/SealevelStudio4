/**
 * Agent Control API
 * Start, stop, and manage agents
 */

import { NextRequest, NextResponse } from 'next/server';
import { agentRegistry, BaseSolanaAgent } from '@/app/lib/agents/solana-agent-kit';
import { agentStorage } from '@/app/lib/agents/storage';

export const dynamic = 'force-dynamic';

/**
 * Control agent (start/stop)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, wallet } = body;

    if (!action || !wallet) {
      return NextResponse.json(
        { error: 'Missing required fields: action, wallet' },
        { status: 400 }
      );
    }

    // Try to get agent from registry first
    let agent = agentRegistry.get(wallet);
    
    // If not in registry, try to get from storage and re-register
    if (!agent) {
      const stored = agentStorage.get(wallet);
      if (stored && stored.agent) {
        agent = stored.agent;
        if (agent) {
          agentRegistry.register(agent);
        }
      }
    }
    
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found. The agent may have been lost due to server restart. Please recreate it.' },
        { status: 404 }
      );
    }

    switch (action) {
      case 'start':
        await agent.start();
        return NextResponse.json({
          success: true,
          message: 'Agent started',
          status: await agent.getStatus(),
        });

      case 'stop':
        await agent.stop();
        return NextResponse.json({
          success: true,
          message: 'Agent stopped',
          status: await agent.getStatus(),
        });

      case 'status':
        return NextResponse.json({
          success: true,
          status: await agent.getStatus(),
        });

      case 'execute':
        const result = await agent.execute();
        return NextResponse.json({
          success: true,
          result,
        });

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Agent control error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

