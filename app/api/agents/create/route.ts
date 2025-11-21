/**
 * API Route for Creating and Managing Autonomous Agents
 * POST /api/agents/create - Create a new agent
 * GET /api/agents/list - List all agents
 * POST /api/agents/start - Start an agent
 * POST /api/agents/stop - Stop an agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair } from '@solana/web3.js';
import {
  ArbitrageAgent,
  PortfolioRebalancingAgent,
  LiquidityScanningAgent,
  AgentConfig,
  agentRegistry,
} from '@/app/lib/agents/solana-agent-kit';
import { LocalLLMProvider, AIEnhancedAgent } from '@/app/lib/agents/agentipy-integration';
import { defiPlugins } from '@/app/lib/agents/defi-plugins';
import { agentStorage, storeAgent } from '@/app/lib/agents/storage';

export const dynamic = 'force-dynamic';

/**
 * Create a new agent
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, config, agentWalletSeed } = body;

    if (!type || !config) {
      return NextResponse.json(
        { error: 'Missing required fields: type, config' },
        { status: 400 }
      );
    }

    // Get RPC endpoint
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.mainnet-beta.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // Create agent based on type
    let agent;
    const agentConfig: AgentConfig = {
      name: config.name || 'Unnamed Agent',
      enabled: config.enabled !== false,
      strategy: config.strategy || 'arbitrage',
      riskTolerance: config.riskTolerance || 'medium',
      maxPositionSize: config.maxPositionSize || 1.0,
      minProfitThreshold: config.minProfitThreshold || 0.01,
      slippageTolerance: config.slippageTolerance || 0.5,
      priorityFee: config.priorityFee || 10000,
      useJito: config.useJito || false,
      plugins: config.plugins || [],
    };

    // Generate keypair from seed if provided
    let agentKeypair: Keypair | undefined;
    if (agentWalletSeed) {
      const seedBuffer = Buffer.from(agentWalletSeed, 'utf-8').slice(0, 32);
      agentKeypair = Keypair.fromSeed(seedBuffer);
    }

    switch (type) {
      case 'arbitrage':
        agent = new ArbitrageAgent(connection, agentConfig, agentKeypair);
        break;

      case 'portfolio-rebalancing':
        agent = new PortfolioRebalancingAgent(connection, agentConfig, agentKeypair);
        break;

      case 'liquidity-scanning':
        agent = new LiquidityScanningAgent(connection, agentConfig, agentKeypair);
        break;

      case 'ai-enhanced':
        // Use local LLM if available
        const llmEndpoint = process.env.LOCAL_AI_ENDPOINT;
        const llmModel = process.env.LOCAL_AI_MODEL;
        const llmProvider = llmEndpoint && llmModel
          ? new LocalLLMProvider(llmEndpoint, llmModel)
          : undefined;

        agent = new AIEnhancedAgent(connection, agentConfig, agentKeypair, llmProvider);
        break;

      default:
        return NextResponse.json(
          { error: `Unknown agent type: ${type}` },
          { status: 400 }
        );
    }

    // Register plugins
    if (agentConfig.plugins) {
      for (const pluginId of agentConfig.plugins) {
        const plugin = defiPlugins.find(p => p.id === pluginId);
        if (plugin) {
          agent.registerPlugin(plugin);
        }
      }
    }

    // Register agent
    agentRegistry.register(agent);
    
    // Store agent info and instance for persistence
    const agentWallet = agent.getAgentWallet().toString();
    storeAgent(agentWallet, {
      type,
      config: agentConfig,
      wallet: agentWallet,
      createdAt: new Date(),
      agent, // Store agent instance
    });

    // Start agent if enabled
    if (agentConfig.enabled) {
      await agent.start();
    }

    return NextResponse.json({
      success: true,
      agent: {
        wallet: agentWallet,
        type,
        config: agentConfig,
        status: await agent.getStatus(),
      },
    });
  } catch (error) {
    console.error('Agent creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * List all agents
 */
export async function GET(request: NextRequest) {
  try {
    const { getAllStoredAgents, getStoredAgent } = await import('@/app/lib/agents/storage');
    
    // Get agents from both registry and storage
    const registryAgents = agentRegistry.getAll();
    const storageAgents = getAllStoredAgents();
    
    // Combine both sources
    const allAgents = new Map<string, any>();
    
    // Add from registry
    for (const agent of registryAgents) {
      const wallet = agent.getAgentWallet().toString();
      const stored = getStoredAgent(wallet);
      allAgents.set(wallet, {
        agent,
        stored,
      });
    }
    
    // Add from storage (in case registry lost them)
    for (const stored of storageAgents) {
      if (!allAgents.has(stored.wallet)) {
        allAgents.set(stored.wallet, {
          agent: stored.agent,
          stored,
        });
      }
    }
    
    const agentList = await Promise.all(
      Array.from(allAgents.values()).map(async ({ agent, stored }) => {
        if (!agent) {
          // Agent instance lost, return stored info only
          return {
            wallet: stored.wallet,
            status: {
              isRunning: false,
              agentWallet: stored.wallet,
              strategy: stored.config.strategy,
              totalActions: 0,
              totalProfit: 0,
              uptime: 0,
              errors: ['Agent instance not available'],
            },
            config: stored.config,
            type: stored.type,
            createdAt: stored.createdAt,
          };
        }
        
        const wallet = agent.getAgentWallet().toString();
        return {
          wallet,
          status: await agent.getStatus(),
          config: stored?.config,
          type: stored?.type,
          createdAt: stored?.createdAt,
        };
      })
    );

    return NextResponse.json({
      success: true,
      agents: agentList,
      count: agentList.length,
    });
  } catch (error) {
    console.error('Agent listing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

