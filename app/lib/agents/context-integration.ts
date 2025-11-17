/**
 * Context Integration for AI Agents
 * Integrates context management into agent responses
 * Uses GET requests to retrieve context before generating responses
 */

import { ContextManagerAgent, APIContextStorage, LocalStorageContextStorage } from './context-manager';

/**
 * Context-Aware Agent Base Class
 * All agents should extend this to have context capabilities
 */
export class ContextAwareAgent {
  protected contextManager: ContextManagerAgent;
  protected agentId: string;
  protected sessionId: string;

  constructor(
    agentId: string,
    sessionId: string,
    useAPI: boolean = true
  ) {
    this.agentId = agentId;
    this.sessionId = sessionId;
    
    // Use API storage for server-side, LocalStorage for client-side
    const storage = useAPI && typeof window === 'undefined'
      ? new APIContextStorage('/api/context')
      : new LocalStorageContextStorage();
    
    this.contextManager = new ContextManagerAgent(storage);
  }

  /**
   * Get context before processing request
   * Uses GET request to fetch state
   */
  async getContextForModel(): Promise<string> {
    try {
      // GET request to retrieve context
      const context = await this.contextManager.aggregateContextForModel(
        this.agentId,
        this.sessionId
      );
      return context;
    } catch (error) {
      console.error('Failed to retrieve context:', error);
      return '{}'; // Return empty context on error
    }
  }

  /**
   * Save context after processing
   */
  async saveContext(
    contextData: Record<string, any>,
    tags: string[] = [],
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<void> {
    await this.contextManager.saveContext(
      this.agentId,
      this.sessionId,
      contextData,
      {
        tags,
        priority,
      }
    );
  }

  /**
   * Enhanced AI response with context
   */
  async generateResponseWithContext(
    userMessage: string,
    generateResponse: (message: string, context: string) => Promise<string>
  ): Promise<string> {
    // 1. Get context via GET request
    const context = await this.getContextForModel();
    
    // 2. Generate response with context
    const response = await generateResponse(userMessage, context);
    
    // 3. Save interaction to context
    await this.saveContext({
      userMessage,
      response,
      timestamp: new Date().toISOString(),
    }, ['interaction', 'conversation']);
    
    return response;
  }

  /**
   * Get context summary (lightweight)
   */
  async getContextSummary() {
    return await this.contextManager.getContextSummary(
      this.agentId,
      this.sessionId
    );
  }
}

/**
 * Context Helper for Master AI
 * Provides context aggregation across all agents
 */
export class MasterContextAggregator {
  private contextManager: ContextManagerAgent;

  constructor(contextManager: ContextManagerAgent) {
    this.contextManager = contextManager;
  }

  /**
   * Aggregate context from multiple agents
   * Uses GET requests to fetch from each agent
   */
  async aggregateAllAgentContexts(
    sessionId: string,
    agentIds: string[]
  ): Promise<string> {
    const contexts: any[] = [];

    // Fetch context from each agent via GET requests
    for (const agentId of agentIds) {
      try {
        const agentContexts = await this.contextManager.getAgentContexts(
          agentId,
          sessionId
        );
        contexts.push(...agentContexts);
      } catch (error) {
        console.error(`Failed to get context for ${agentId}:`, error);
      }
    }

    // Sort by timestamp
    contexts.sort((a, b) => 
      b.timestamp.getTime() - a.timestamp.getTime()
    );

    // Format for model consumption
    return JSON.stringify({
      sessionId,
      totalContexts: contexts.length,
      agents: agentIds,
      contexts: contexts.slice(0, 20).map(ctx => ({
        agentId: ctx.agentId,
        timestamp: ctx.timestamp.toISOString(),
        data: ctx.contextData,
        tags: ctx.metadata.tags,
        priority: ctx.metadata.priority,
      })),
    }, null, 2);
  }

  /**
   * Get cross-agent context summary
   */
  async getCrossAgentSummary(sessionId: string, agentIds: string[]) {
    const summaries = await Promise.all(
      agentIds.map(async (agentId) => {
        try {
          return await this.contextManager.getContextSummary(
            agentId,
            sessionId
          );
        } catch {
          return null;
        }
      })
    );

    return summaries.filter(s => s !== null);
  }
}

/**
 * Context Health Monitor
 * Monitors context storage health and capacity
 */
export class ContextHealthMonitor {
  private contextManager: ContextManagerAgent;
  private maxContextsPerAgent: number = 100;
  private maxTotalContexts: number = 1000;

  constructor(contextManager: ContextManagerAgent) {
    this.contextManager = contextManager;
  }

  /**
   * Check context health
   */
  async checkHealth(): Promise<ContextHealth> {
    const allContexts = await this.contextManager.queryContexts({});
    const agentCounts = new Map<string, number>();

    // Count contexts per agent
    for (const context of allContexts) {
      const count = agentCounts.get(context.agentId) || 0;
      agentCounts.set(context.agentId, count + 1);
    }

    // Check for agents exceeding limits
    const overLimit: string[] = [];
    for (const [agentId, count] of Array.from(agentCounts.entries())) {
      if (count > this.maxContextsPerAgent) {
        overLimit.push(agentId);
      }
    }

    const health: ContextHealth = {
      totalContexts: allContexts.length,
      agentCounts: Object.fromEntries(Array.from(agentCounts.entries())),
      overLimitAgents: overLimit,
      isHealthy: allContexts.length < this.maxTotalContexts && overLimit.length === 0,
      recommendations: [],
    };

    // Generate recommendations
    if (allContexts.length > this.maxTotalContexts * 0.8) {
      health.recommendations.push('Consider cleaning up old contexts');
    }

    if (overLimit.length > 0) {
      health.recommendations.push(
        `Agents ${overLimit.join(', ')} have too many contexts. Consider cleanup.`
      );
    }

    return health;
  }

  /**
   * Cleanup old contexts
   */
  async cleanup(): Promise<CleanupResult> {
    const cleaned = await this.contextManager.cleanupExpiredContexts();
    
    // Also clean oldest contexts if still over limit
    const allContexts = await this.contextManager.queryContexts({});
    let additionalCleaned = 0;

    if (allContexts.length > this.maxTotalContexts) {
      const sorted = allContexts.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );
      
      const toRemove = sorted.slice(0, allContexts.length - this.maxTotalContexts);
      for (const context of toRemove) {
        // Delete via storage
        additionalCleaned++;
      }
    }

    return {
      expiredCleaned: cleaned,
      overflowCleaned: additionalCleaned,
      totalCleaned: cleaned + additionalCleaned,
    };
  }
}

export interface ContextHealth {
  totalContexts: number;
  agentCounts: Record<string, number>;
  overLimitAgents: string[];
  isHealthy: boolean;
  recommendations: string[];
}

export interface CleanupResult {
  expiredCleaned: number;
  overflowCleaned: number;
  totalCleaned: number;
}

