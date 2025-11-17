/**
 * Context Manager System
 * Dedicated agents and infrastructure for maintaining agent context and memory
 * Uses GET requests to communicate state back to the model
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Context Types
 */
export interface AgentContext {
  agentId: string;
  sessionId: string;
  userId?: string;
  walletAddress?: string;
  timestamp: Date;
  contextData: Record<string, any>;
  metadata: ContextMetadata;
}

export interface ContextMetadata {
  version: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  ttl?: number; // Time to live in seconds
  tags: string[];
  relatedContexts: string[]; // IDs of related contexts
}

export interface ContextQuery {
  agentId?: string;
  sessionId?: string;
  userId?: string;
  walletAddress?: string;
  tags?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  limit?: number;
}

/**
 * Context Storage Backend
 * Can use: LocalStorage, IndexedDB, Vector DB, or custom API
 */
export interface ContextStorage {
  save(context: AgentContext): Promise<string>; // Returns context ID
  get(contextId: string): Promise<AgentContext | null>;
  query(query: ContextQuery): Promise<AgentContext[]>;
  delete(contextId: string): Promise<boolean>;
  update(contextId: string, updates: Partial<AgentContext>): Promise<boolean>;
}

/**
 * Context Manager Agent (Tier 1)
 * Dedicated agent for managing all agent contexts
 */
export class ContextManagerAgent {
  private storage: ContextStorage;
  private contextCache: Map<string, AgentContext> = new Map();
  private contextIndex: Map<string, string[]> = new Map(); // agentId -> contextIds[]

  constructor(storage: ContextStorage) {
    this.storage = storage;
  }

  /**
   * Save context for an agent
   */
  async saveContext(
    agentId: string,
    sessionId: string,
    contextData: Record<string, any>,
    metadata?: Partial<ContextMetadata>
  ): Promise<string> {
    const context: AgentContext = {
      agentId,
      sessionId,
      timestamp: new Date(),
      contextData,
      metadata: {
        version: '1.0',
        priority: metadata?.priority || 'medium',
        ttl: metadata?.ttl,
        tags: metadata?.tags || [],
        relatedContexts: metadata?.relatedContexts || [],
      },
    };

    const contextId = await this.storage.save(context);
    this.contextCache.set(contextId, context);
    
    // Update index
    if (!this.contextIndex.has(agentId)) {
      this.contextIndex.set(agentId, []);
    }
    this.contextIndex.get(agentId)!.push(contextId);

    return contextId;
  }

  /**
   * Retrieve context for an agent
   * Uses GET request pattern to fetch state
   */
  async getContext(contextId: string): Promise<AgentContext | null> {
    // Check cache first
    if (this.contextCache.has(contextId)) {
      return this.contextCache.get(contextId)!;
    }

    // Fetch from storage (GET request)
    const context = await this.storage.get(contextId);
    if (context) {
      this.contextCache.set(contextId, context);
    }
    return context;
  }

  /**
   * Query contexts (GET request pattern)
   */
  async queryContexts(query: ContextQuery): Promise<AgentContext[]> {
    return await this.storage.query(query);
  }

  /**
   * Get all contexts for an agent session
   */
  async getAgentContexts(
    agentId: string,
    sessionId?: string
  ): Promise<AgentContext[]> {
    const query: ContextQuery = {
      agentId,
      sessionId,
    };
    return await this.queryContexts(query);
  }

  /**
   * Aggregate context for AI model consumption
   * Formats context as GET request response
   */
  async aggregateContextForModel(
    agentId: string,
    sessionId: string,
    maxContexts: number = 10
  ): Promise<string> {
    const contexts = await this.getAgentContexts(agentId, sessionId);
    
    // Sort by timestamp (most recent first)
    const sorted = contexts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxContexts);

    // Format as JSON for model consumption
    const aggregated = {
      agentId,
      sessionId,
      contextCount: sorted.length,
      contexts: sorted.map(ctx => ({
        timestamp: ctx.timestamp.toISOString(),
        data: ctx.contextData,
        tags: ctx.metadata.tags,
        priority: ctx.metadata.priority,
      })),
    };

    return JSON.stringify(aggregated, null, 2);
  }

  /**
   * Get context summary (lightweight for model)
   */
  async getContextSummary(
    agentId: string,
    sessionId: string
  ): Promise<ContextSummary> {
    const contexts = await this.getAgentContexts(agentId, sessionId);
    
    return {
      agentId,
      sessionId,
      totalContexts: contexts.length,
      recentContexts: contexts
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5)
        .map(ctx => ({
          timestamp: ctx.timestamp.toISOString(),
          tags: ctx.metadata.tags,
          priority: ctx.metadata.priority,
          dataKeys: Object.keys(ctx.contextData),
        })),
      lastUpdated: contexts.length > 0
        ? contexts[0].timestamp.toISOString()
        : null,
    };
  }

  /**
   * Clean up old contexts (TTL management)
   */
  async cleanupExpiredContexts(): Promise<number> {
    const allContexts = await this.queryContexts({});
    const now = Date.now();
    let cleaned = 0;

    for (const context of allContexts) {
      if (context.metadata.ttl) {
        const expiresAt = context.timestamp.getTime() + (context.metadata.ttl * 1000);
        if (now > expiresAt) {
          await this.storage.delete(context.agentId + '_' + context.sessionId);
          this.contextCache.delete(context.agentId + '_' + context.sessionId);
          cleaned++;
        }
      }
    }

    return cleaned;
  }
}

export interface ContextSummary {
  agentId: string;
  sessionId: string;
  totalContexts: number;
  recentContexts: Array<{
    timestamp: string;
    tags: string[];
    priority: string;
    dataKeys: string[];
  }>;
  lastUpdated: string | null;
}

/**
 * Memory Agent (Tier 2)
 * Specialized agent for maintaining long-term memory
 */
export class MemoryAgent {
  private contextManager: ContextManagerAgent;
  private memoryStore: Map<string, any> = new Map();

  constructor(contextManager: ContextManagerAgent) {
    this.contextManager = contextManager;
  }

  /**
   * Store long-term memory
   */
  async remember(
    key: string,
    value: any,
    agentId: string,
    sessionId: string,
    tags: string[] = []
  ): Promise<void> {
    this.memoryStore.set(key, value);
    
    await this.contextManager.saveContext(agentId, sessionId, {
      memory: { [key]: value },
    }, {
      tags: ['memory', ...tags],
      priority: 'high',
      ttl: undefined, // Permanent memory
    });
  }

  /**
   * Recall from memory
   */
  async recall(key: string): Promise<any> {
    return this.memoryStore.get(key);
  }

  /**
   * Search memory by tags
   */
  async searchMemory(tags: string[]): Promise<any[]> {
    const results: any[] = [];
    for (const [key, value] of Array.from(this.memoryStore.entries())) {
      // Simple tag matching (can be enhanced with vector search)
      if (tags.some(tag => key.includes(tag))) {
        results.push({ key, value });
      }
    }
    return results;
  }
}

/**
 * Context API Endpoint
 * Provides GET endpoints for context retrieval
 */
export class ContextAPI {
  private contextManager: ContextManagerAgent;

  constructor(contextManager: ContextManagerAgent) {
    this.contextManager = contextManager;
  }

  /**
   * GET /api/context/:agentId/:sessionId
   * Returns context for agent session
   */
  async getContextEndpoint(
    agentId: string,
    sessionId: string
  ): Promise<Response> {
    const context = await this.contextManager.aggregateContextForModel(
      agentId,
      sessionId
    );
    
    return new Response(context, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * GET /api/context/:agentId/:sessionId/summary
   * Returns lightweight context summary
   */
  async getContextSummaryEndpoint(
    agentId: string,
    sessionId: string
  ): Promise<Response> {
    const summary = await this.contextManager.getContextSummary(
      agentId,
      sessionId
    );
    
    return new Response(JSON.stringify(summary), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * GET /api/context/query
   * Query contexts with filters
   */
  async queryContextsEndpoint(query: ContextQuery): Promise<Response> {
    const contexts = await this.contextManager.queryContexts(query);
    
    return new Response(JSON.stringify(contexts), {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

/**
 * LocalStorage-based Context Storage (Client-side)
 */
export class LocalStorageContextStorage implements ContextStorage {
  private prefix = 'agent_context_';

  async save(context: AgentContext): Promise<string> {
    const contextId = `${context.agentId}_${context.sessionId}_${Date.now()}`;
    const key = this.prefix + contextId;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(context));
    }
    
    return contextId;
  }

  async get(contextId: string): Promise<AgentContext | null> {
    if (typeof window === 'undefined') return null;
    
    const key = this.prefix + contextId;
    const data = localStorage.getItem(key);
    
    if (!data) return null;
    
    try {
      const context = JSON.parse(data);
      context.timestamp = new Date(context.timestamp);
      return context;
    } catch {
      return null;
    }
  }

  async query(query: ContextQuery): Promise<AgentContext[]> {
    if (typeof window === 'undefined') return [];
    
    const results: AgentContext[] = [];
    const keys = Object.keys(localStorage);
    
    for (const key of keys) {
      if (!key.startsWith(this.prefix)) continue;
      
      try {
        const data = localStorage.getItem(key);
        if (!data) continue;
        
        const context: AgentContext = JSON.parse(data);
        context.timestamp = new Date(context.timestamp);
        
        // Apply filters
        if (query.agentId && context.agentId !== query.agentId) continue;
        if (query.sessionId && context.sessionId !== query.sessionId) continue;
        if (query.userId && context.userId !== query.userId) continue;
        if (query.walletAddress && context.walletAddress !== query.walletAddress) continue;
        
        if (query.tags && query.tags.length > 0) {
          const hasTag = query.tags.some(tag => context.metadata.tags.includes(tag));
          if (!hasTag) continue;
        }
        
        if (query.timeRange) {
          const time = context.timestamp.getTime();
          if (time < query.timeRange.start.getTime() || time > query.timeRange.end.getTime()) {
            continue;
          }
        }
        
        results.push(context);
      } catch {
        // Skip invalid entries
      }
    }
    
    // Sort by timestamp
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Apply limit
    if (query.limit) {
      return results.slice(0, query.limit);
    }
    
    return results;
  }

  async delete(contextId: string): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    
    const key = this.prefix + contextId;
    localStorage.removeItem(key);
    return true;
  }

  async update(contextId: string, updates: Partial<AgentContext>): Promise<boolean> {
    const existing = await this.get(contextId);
    if (!existing) return false;
    
    const updated = { ...existing, ...updates };
    const key = this.prefix + contextId;
    
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(updated));
      return true;
    }
    
    return false;
  }
}

/**
 * API-based Context Storage (Server-side)
 * Uses GET requests to communicate state
 */
export class APIContextStorage implements ContextStorage {
  private baseURL: string;

  constructor(baseURL: string = '/api/context') {
    this.baseURL = baseURL;
  }

  async save(context: AgentContext): Promise<string> {
    const response = await fetch(`${this.baseURL}/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });
    
    const result = await response.json();
    return result.contextId;
  }

  async get(contextId: string): Promise<AgentContext | null> {
    // GET request to retrieve context
    const response = await fetch(`${this.baseURL}/${contextId}`, {
      method: 'GET',
    });
    
    if (!response.ok) return null;
    
    const context = await response.json();
    context.timestamp = new Date(context.timestamp);
    return context;
  }

  async query(query: ContextQuery): Promise<AgentContext[]> {
    // GET request with query parameters
    const params = new URLSearchParams();
    if (query.agentId) params.append('agentId', query.agentId);
    if (query.sessionId) params.append('sessionId', query.sessionId);
    if (query.userId) params.append('userId', query.userId);
    if (query.walletAddress) params.append('walletAddress', query.walletAddress);
    if (query.tags) query.tags.forEach(tag => params.append('tags', tag));
    if (query.limit) params.append('limit', query.limit.toString());
    
    const response = await fetch(`${this.baseURL}/query?${params.toString()}`, {
      method: 'GET',
    });
    
    if (!response.ok) return [];
    
    const contexts = await response.json();
    return contexts.map((ctx: any) => ({
      ...ctx,
      timestamp: new Date(ctx.timestamp),
    }));
  }

  async delete(contextId: string): Promise<boolean> {
    const response = await fetch(`${this.baseURL}/${contextId}`, {
      method: 'DELETE',
    });
    return response.ok;
  }

  async update(contextId: string, updates: Partial<AgentContext>): Promise<boolean> {
    const response = await fetch(`${this.baseURL}/${contextId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return response.ok;
  }
}

