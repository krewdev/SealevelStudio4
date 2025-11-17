/**
 * Master AI Orchestrator
 * Central brain that coordinates all agents
 * Uses context management and GET requests for state communication
 */

import { ContextManagerAgent } from '../agents/context-manager';
import { MasterContextAggregator } from '../agents/context-integration';

export interface AgentTask {
  id: string;
  assignedTo: string;
  assignedBy: string;
  task: string;
  context: Record<string, any>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: Date;
}

export interface AgentResponse {
  agentId: string;
  response: string;
  context?: Record<string, any>;
  suggestions?: any[];
  confidence?: number;
}

/**
 * Master AI Orchestrator
 * Routes tasks to appropriate agents and aggregates responses
 */
export class MasterAIOrchestrator {
  private contextManager: ContextManagerAgent;
  private contextAggregator: MasterContextAggregator;
  private taskQueue: AgentTask[] = [];
  private activeTasks: Map<string, AgentTask> = new Map();
  private agentRegistry: Map<string, any> = new Map();

  constructor(contextManager: ContextManagerAgent) {
    this.contextManager = contextManager;
    this.contextAggregator = new MasterContextAggregator(contextManager);
  }

  /**
   * Register an agent
   */
  registerAgent(agentId: string, agent: any): void {
    this.agentRegistry.set(agentId, agent);
  }

  /**
   * Route user query to appropriate agent(s)
   */
  async routeQuery(
    userQuery: string,
    sessionId: string,
    userId?: string,
    walletAddress?: string
  ): Promise<AgentResponse> {
    // 1. Analyze user intent
    const intent = await this.analyzeIntent(userQuery);

    // 2. Get context from all agents via GET requests
    const allContext = await this.contextAggregator.aggregateAllAgentContexts(
      sessionId,
      Array.from(this.agentRegistry.keys())
    );

    // 3. Determine which Tier 1 agent should handle
    const tier1Agent = this.selectTier1Agent(intent);

    // 4. Save context
    await this.contextManager.saveContext(
      'master',
      sessionId,
      {
        query: userQuery,
        intent,
        selectedAgent: tier1Agent,
        timestamp: new Date().toISOString(),
      },
      {
        tags: ['user-query', 'routing', intent.category],
        priority: 'high',
      }
    );

    // 5. Delegate to Tier 1 agent
    const agent = this.agentRegistry.get(tier1Agent);
    if (!agent) {
      throw new Error(`Agent ${tier1Agent} not found`);
    }

    // 6. Get agent's context via GET request
    const agentContext = await this.getAgentContext(tier1Agent, sessionId);

    // 7. Execute task
    const task: AgentTask = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assignedTo: tier1Agent,
      assignedBy: 'master',
      task: userQuery,
      context: {
        ...agentContext,
        allContext,
        intent,
        userId,
        walletAddress,
      },
      status: 'in_progress',
      timestamp: new Date(),
    };

    this.activeTasks.set(task.id, task);

    try {
      // Execute agent task
      const result = await agent.handleTask(userQuery, task.context);

      // Update task
      task.status = 'completed';
      task.result = result;

      // Save agent context
      await this.contextManager.saveContext(
        tier1Agent,
        sessionId,
        {
          query: userQuery,
          response: result,
          timestamp: new Date().toISOString(),
        },
        {
          tags: ['agent-response', intent.category],
          priority: 'medium',
        }
      );

      return {
        agentId: tier1Agent,
        response: result.response || result,
        context: result.context,
        suggestions: result.suggestions,
        confidence: result.confidence || 0.8,
      };
    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  /**
   * Analyze user intent
   */
  private async analyzeIntent(query: string): Promise<{
    category: string;
    confidence: number;
    keywords: string[];
  }> {
    const lowerQuery = query.toLowerCase();
    
    // Simple keyword-based intent detection
    // In production, use AI model for this
    const intents = [
      { category: 'trading', keywords: ['arbitrage', 'trade', 'swap', 'buy', 'sell', 'price', 'profit'] },
      { category: 'blockchain', keywords: ['transaction', 'account', 'wallet', 'analyze', 'inspect', 'monitor'] },
      { category: 'security', keywords: ['security', 'audit', 'vulnerability', 'risk', 'safe', 'secure'] },
      { category: 'gaming', keywords: ['game', 'wager', 'bet', 'pvp', 'pvh', 'tournament', 'match'] },
      { category: 'context', keywords: ['context', 'memory', 'remember', 'recall', 'history'] },
    ];

    for (const intent of intents) {
      const matches = intent.keywords.filter(keyword => lowerQuery.includes(keyword));
      if (matches.length > 0) {
        return {
          category: intent.category,
          confidence: matches.length / intent.keywords.length,
          keywords: matches,
        };
      }
    }

    return {
      category: 'general',
      confidence: 0.5,
      keywords: [],
    };
  }

  /**
   * Select appropriate Tier 1 agent
   */
  private selectTier1Agent(intent: { category: string }): string {
    const mapping: Record<string, string> = {
      trading: 'trading',
      blockchain: 'blockchain',
      security: 'security',
      gaming: 'gaming',
      context: 'context',
    };

    return mapping[intent.category] || 'trading';
  }

  /**
   * Get agent context via GET request
   */
  private async getAgentContext(agentId: string, sessionId: string): Promise<any> {
    try {
      const response = await fetch(
        `/api/context?agentId=${agentId}&sessionId=${sessionId}&action=summary`
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(`Failed to get context for ${agentId}:`, error);
    }
    return {};
  }

  /**
   * Get active tasks
   */
  getActiveTasks(): AgentTask[] {
    return Array.from(this.activeTasks.values());
  }

  /**
   * Get task queue
   */
  getTaskQueue(): AgentTask[] {
    return this.taskQueue;
  }
}

