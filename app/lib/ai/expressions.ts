/**
 * AI Expression System
 * Unified way to share agent state, decisions, and proofs
 * Uses GET requests for lightweight, cacheable communication
 */

export type ExpressionType =
  | 'agent.state'
  | 'agent.task.assigned'
  | 'agent.task.completed'
  | 'agent.decision'
  | 'consensus.requested'
  | 'consensus.reached'
  | 'attestation.generated'
  | 'platform.update'
  | 'model.response';

export interface Expression {
  id: string;
  type: ExpressionType;
  agentId?: string;
  fromAgent?: string;
  toAgent?: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: {
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    ttl?: number; // Time to live in seconds
    tags?: string[];
    consensusId?: string;
    attestationId?: string;
  };
}

export interface AgentExpression extends Expression {
  type: 'agent.state' | 'agent.task.assigned' | 'agent.task.completed' | 'agent.decision';
  agentId: string;
  state?: {
    status: 'idle' | 'active' | 'processing' | 'error';
    health: number;
    contextCount: number;
    lastActivity: Date;
  };
  task?: {
    id: string;
    description: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
  };
  decision?: {
    action: string;
    reasoning: string;
    confidence: number;
    consensusId?: string;
  };
}

export interface ConsensusExpression extends Expression {
  type: 'consensus.requested' | 'consensus.reached';
  consensusId: string;
  prompt?: string;
  result?: {
    consensus: boolean;
    confidence: number;
    agreement: number;
    majority: string;
    responses: Array<{
      provider: string;
      response: string;
    }>;
  };
}

export interface AttestationExpression extends Expression {
  type: 'attestation.generated';
  attestationId: string;
  consensusId: string;
  proof: {
    hash: string;
    signature?: string;
    timestamp: Date;
    verifiable: boolean;
  };
}

/**
 * Expression Factory
 * Creates typed expressions with proper structure
 */
export class ExpressionFactory {
  static createAgentState(
    agentId: string,
    state: AgentExpression['state'],
    metadata?: Expression['metadata']
  ): AgentExpression {
    return {
      id: `expr-${Date.now()}-${Math.random()}`,
      type: 'agent.state',
      agentId,
      timestamp: new Date(),
      state,
      data: { state },
      metadata,
    };
  }

  static createTaskAssigned(
    agentId: string,
    task: AgentExpression['task'],
    fromAgent?: string,
    metadata?: Expression['metadata']
  ): AgentExpression {
    return {
      id: `expr-${Date.now()}-${Math.random()}`,
      type: 'agent.task.assigned',
      agentId,
      fromAgent,
      timestamp: new Date(),
      task,
      data: { task, fromAgent },
      metadata,
    };
  }

  static createConsensusRequested(
    consensusId: string,
    prompt: string,
    agentId?: string,
    metadata?: Expression['metadata']
  ): ConsensusExpression {
    return {
      id: `expr-${Date.now()}-${Math.random()}`,
      type: 'consensus.requested',
      consensusId,
      agentId,
      timestamp: new Date(),
      prompt,
      data: { prompt, consensusId },
      metadata: {
        ...metadata,
        priority: metadata?.priority || 'high',
      },
    };
  }

  static createConsensusReached(
    consensusId: string,
    result: ConsensusExpression['result'],
    prompt?: string,
    metadata?: Expression['metadata']
  ): ConsensusExpression {
    return {
      id: `expr-${Date.now()}-${Math.random()}`,
      type: 'consensus.reached',
      consensusId,
      prompt,
      timestamp: new Date(),
      result,
      data: { result, prompt },
      metadata: {
        ...metadata,
        priority: 'high',
      },
    };
  }

  static createAttestation(
    attestationId: string,
    consensusId: string,
    proof: AttestationExpression['proof'],
    metadata?: Expression['metadata']
  ): AttestationExpression {
    return {
      id: `expr-${Date.now()}-${Math.random()}`,
      type: 'attestation.generated',
      attestationId,
      consensusId,
      timestamp: new Date(),
      proof,
      data: { proof, consensusId },
      metadata: {
        ...metadata,
        priority: 'high',
      },
    };
  }
}

/**
 * Expression Store
 * In-memory store for expressions (can be extended to use database)
 */
class ExpressionStore {
  private expressions: Map<string, Expression> = new Map();
  private byType: Map<ExpressionType, Set<string>> = new Map();
  private byAgent: Map<string, Set<string>> = new Map();

  add(expression: Expression): void {
    this.expressions.set(expression.id, expression);

    // Index by type
    if (!this.byType.has(expression.type)) {
      this.byType.set(expression.type, new Set());
    }
    this.byType.get(expression.type)!.add(expression.id);

    // Index by agent
    if (expression.agentId) {
      if (!this.byAgent.has(expression.agentId)) {
        this.byAgent.set(expression.agentId, new Set());
      }
      this.byAgent.get(expression.agentId)!.add(expression.id);
    }

    // Cleanup expired expressions
    if (expression.metadata?.ttl) {
      setTimeout(() => {
        this.delete(expression.id);
      }, expression.metadata.ttl * 1000);
    }
  }

  get(id: string): Expression | undefined {
    return this.expressions.get(id);
  }

  getByType(type: ExpressionType): Expression[] {
    const ids = this.byType.get(type);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.expressions.get(id))
      .filter((expr): expr is Expression => expr !== undefined);
  }

  getByAgent(agentId: string): Expression[] {
    const ids = this.byAgent.get(agentId);
    if (!ids) return [];
    return Array.from(ids)
      .map(id => this.expressions.get(id))
      .filter((expr): expr is Expression => expr !== undefined);
  }

  query(filters: {
    type?: ExpressionType;
    agentId?: string;
    fromAgent?: string;
    toAgent?: string;
    tags?: string[];
    since?: Date;
  }): Expression[] {
    let results: Expression[] = [];

    // Start with type filter if provided
    if (filters.type) {
      results = this.getByType(filters.type);
    } else {
      results = Array.from(this.expressions.values());
    }

    // Apply filters
    if (filters.agentId) {
      results = results.filter(expr => expr.agentId === filters.agentId);
    }
    if (filters.fromAgent) {
      results = results.filter(expr => (expr as AgentExpression).fromAgent === filters.fromAgent);
    }
    if (filters.toAgent) {
      results = results.filter(expr => (expr as AgentExpression).toAgent === filters.toAgent);
    }
    if (filters.tags && filters.tags.length > 0) {
      results = results.filter(expr =>
        expr.metadata?.tags?.some(tag => filters.tags!.includes(tag))
      );
    }
    if (filters.since) {
      results = results.filter(expr => expr.timestamp >= filters.since!);
    }

    return results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  delete(id: string): void {
    const expression = this.expressions.get(id);
    if (!expression) return;

    this.expressions.delete(id);
    this.byType.get(expression.type)?.delete(id);
    if (expression.agentId) {
      this.byAgent.get(expression.agentId)?.delete(id);
    }
  }

  clear(): void {
    this.expressions.clear();
    this.byType.clear();
    this.byAgent.clear();
  }
}

// Global expression store
export const expressionStore = new ExpressionStore();

