# Context Management System

## Overview

The Context Management System dedicates agent resources to maintain context and memory across agent interactions. It uses **GET requests** to communicate state back to the AI model, providing a lightweight and efficient way to maintain conversation history and agent state.

## Architecture

```
┌─────────────────────────────────────────────────┐
│     CONTEXT MANAGER AGENT (Tier 1)              │
│  • Manages all agent contexts                   │
│  • Provides GET endpoints for state retrieval   │
│  • Handles context storage and retrieval         │
└─────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
    ┌───▼───┐   ┌───▼───┐   ┌───▼───┐
    │Memory │   │Context│   │Health │
    │Agent  │   │API    │   │Monitor│
    └───────┘   └───────┘   └───────┘
```

## Key Components

### 1. Context Manager Agent (Tier 1)

**Purpose:** Centralized context management for all agents

**Functions:**
- Save agent contexts
- Retrieve contexts via GET requests
- Query contexts with filters
- Aggregate contexts for AI model consumption
- Clean up expired contexts

**API Endpoints:**
- `GET /api/context?agentId=X&sessionId=Y` - Get full context
- `GET /api/context?agentId=X&sessionId=Y&action=summary` - Get summary
- `GET /api/context/query?agentId=X&tags=Y` - Query contexts
- `POST /api/context` - Save context
- `PATCH /api/context?contextId=X` - Update context
- `DELETE /api/context?contextId=X` - Delete context

### 2. Memory Agent (Tier 2)

**Purpose:** Long-term memory storage

**Functions:**
- Store permanent memories
- Recall memories by key
- Search memories by tags
- Maintain user preferences
- Store learned patterns

### 3. Context Storage

**Client-side:** LocalStorage (browser)
**Server-side:** API endpoints (database-backed)

**Features:**
- Automatic TTL management
- Tag-based organization
- Priority levels
- Related context linking

## Usage

### Saving Context

```typescript
import { ContextManagerAgent, LocalStorageContextStorage } from './context-manager';

const storage = new LocalStorageContextStorage();
const contextManager = new ContextManagerAgent(storage);

// Save context
await contextManager.saveContext(
  'trading-strategist',
  'session-123',
  {
    lastAnalysis: 'SOL/USDC',
    opportunities: [...],
  },
  {
    tags: ['trading', 'analysis'],
    priority: 'high',
    ttl: 3600, // 1 hour
  }
);
```

### Retrieving Context (GET Request)

```typescript
// Get full context for model
const context = await contextManager.aggregateContextForModel(
  'trading-strategist',
  'session-123'
);

// Use in AI prompt
const prompt = `Previous context:\n${context}\n\nUser: ${userMessage}`;
```

### Using Context-Aware Agents

```typescript
import { ContextAwareAgent } from './context-integration';

class TradingAgent extends ContextAwareAgent {
  async handleRequest(userMessage: string) {
    // Automatically gets context via GET request
    return await this.generateResponseWithContext(
      userMessage,
      async (message, context) => {
        // Generate AI response with context
        return await aiModel.generate(message, context);
      }
    );
  }
}
```

## GET Request Pattern

The system uses GET requests to communicate state:

```
AI Model → GET /api/context?agentId=X&sessionId=Y
         ← JSON response with context
         
AI Model → Process with context
         → POST /api/context (save new context)
```

**Benefits:**
- Lightweight (no request body)
- Cacheable
- Easy to debug
- RESTful pattern
- Works with any HTTP client

## Context Health Management

The system monitors context health:

```typescript
const monitor = new ContextHealthMonitor(contextManager);

// Check health
const health = await monitor.checkHealth();
// Returns: total contexts, agent counts, recommendations

// Cleanup if needed
if (!health.isHealthy) {
  const result = await monitor.cleanup();
}
```

**Health Metrics:**
- Total contexts stored
- Contexts per agent
- Over-limit agents
- Recommendations

## Integration with Master AI

```typescript
const aggregator = new MasterContextAggregator(contextManager);

// Get context from all agents
const allContext = await aggregator.aggregateAllAgentContexts(
  'session-123',
  ['trading-strategist', 'blockchain-analyst', 'security-auditor']
);

// Use in Master AI prompt
const masterPrompt = `Agent Contexts:\n${allContext}\n\nUser: ${userMessage}`;
```

## Storage Backends

### LocalStorage (Client-side)
- Fast access
- No server required
- Limited to ~5-10MB
- Browser-specific

### API Storage (Server-side)
- Unlimited capacity
- Shared across devices
- Database-backed
- Requires server

### Future: Vector Database
- Semantic search
- Similarity matching
- Better context retrieval
- Advanced memory

## Best Practices

1. **Tag your contexts** - Makes querying easier
2. **Set appropriate TTL** - Don't keep everything forever
3. **Use priorities** - Mark important contexts as 'high'
4. **Link related contexts** - Use `relatedContexts` field
5. **Monitor health** - Clean up regularly
6. **Use summaries** - For lightweight context checks

## Performance

- **GET requests:** < 50ms (cached)
- **Context retrieval:** < 100ms (localStorage)
- **Context aggregation:** < 200ms (10 agents)
- **Storage overhead:** ~1-5KB per context

## Future Enhancements

1. **Vector Search** - Semantic context matching
2. **Context Compression** - Reduce storage size
3. **Distributed Storage** - Multi-server support
4. **Context Versioning** - Track context changes
5. **Context Analytics** - Usage patterns and insights

