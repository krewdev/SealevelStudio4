# Complete Agent Hierarchy with Context Management

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MASTER AI ORCHESTRATOR                            │
│  • Task Routing & Delegation                                        │
│  • Context Aggregation (via GET requests)                           │
│  • Multi-Agent Coordination                                         │
│  • Performance Monitoring                                           │
└─────────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┬─────────────────┐
        │                     │                     │                 │
    ┌───▼────┐          ┌──────▼──────┐        ┌─────▼─────┐    ┌─────▼──────┐
    │TIER 1  │          │  TIER 1     │        │  TIER 1   │    │  TIER 1    │
    │TRADING │          │ BLOCKCHAIN  │        │ SECURITY  │    │  GAMING   │
    │STRATEGY│          │  ANALYST    │        │  AUDITOR  │    │  MANAGER  │
    └───┬────┘          └──────┬──────┘        └─────┬─────┘    └─────┬──────┘
        │                      │                      │                │
    ┌───▼────┐          ┌──────▼──────┐        ┌─────▼─────┐    ┌─────▼──────┐
    │TIER 2  │          │  TIER 2     │        │  TIER 2   │    │  TIER 2    │
    │AGENTS  │          │  AGENTS     │        │  AGENTS   │    │  AGENTS    │
    └────────┘          └────────────┘        └───────────┘    └────────────┘
        │                      │                      │                │
    ┌───▼────┐          ┌──────▼──────┐        ┌─────▼─────┐    ┌─────▼──────┐
    │TIER 3  │          │  TIER 3     │        │  TIER 3   │    │  TIER 3    │
    │EXEC    │          │  EXEC       │        │  EXEC     │    │  EXEC      │
    └────────┘          └────────────┘        └───────────┘    └────────────┘
        │                      │                      │                │
        └──────────────────────┼──────────────────────┘                │
                              │                                        │
                    ┌─────────▼─────────┐                    ┌─────────▼─────────┐
                    │ CONTEXT MANAGER   │                    │  QUALITY CONTROL  │
                    │    (TIER 1)       │                    │     (TIER 1)     │
                    │                   │                    │                   │
                    │ • Save Context    │                    │ • Monitor Agents  │
                    │ • GET /api/context│                    │ • Validate Output │
                    │ • Query Contexts  │                    │ • Health Checks   │
                    │ • Aggregate State│                    │ • Error Handling  │
                    └─────────┬─────────┘                    └───────────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  MEMORY AGENT     │
                    │    (TIER 2)       │
                    │                   │
                    │ • Long-term Memory│
                    │ • Recall by Key   │
                    │ • Search by Tags  │
                    └───────────────────┘
```

## Complete Agent Registry

### Tier 1: Strategic Agents (5)

1. **Trading Strategist**
   - Market analysis
   - Strategy selection
   - Risk assessment
   - Portfolio optimization

2. **Blockchain Analyst**
   - Transaction analysis
   - Account monitoring
   - Protocol analysis
   - Smart contract analysis

3. **Security Auditor**
   - Transaction security
   - Vulnerability detection
   - Risk assessment
   - Security recommendations

4. **Gaming Manager** (NEW)
   - PvP game management
   - PvH game management
   - Wagering & escrow
   - Tournament systems

5. **Context Manager** (NEW)
   - Context storage
   - GET request endpoints
   - Context aggregation
   - Memory management

### Tier 2: Execution Agents (12)

**Under Trading Strategist:**
- Arbitrage Hunter
- Market Maker
- Position Manager

**Under Blockchain Analyst:**
- Transaction Builder
- Pool Scanner
- Wallet Inspector

**Under Security Auditor:**
- Vulnerability Scanner
- Risk Assessor

**Under Gaming Manager:**
- Game Engine
- Escrow Manager
- House AI (PvH)
- Matchmaker (PvP)

### Tier 3: Specialized Agents (3)

**Under Game Engine:**
- Dice Game Engine
- Card Game Engine
- Prediction Market Engine

### Support Agents

- **Quality Controller** (Tier 1)
  - Monitors all agents
  - Validates outputs
  - Health checks
  - Error handling

- **Memory Agent** (Tier 2)
  - Long-term memory
  - Context recall
  - Pattern learning

**Total: 1 Master + 6 Tier 1 + 13 Tier 2 + 3 Tier 3 = 23 Agents**

## Context Management System

### How It Works

1. **Agent Saves Context**
   ```
   Agent → POST /api/context
         → Context stored
   ```

2. **AI Model Retrieves Context (GET Request)**
   ```
   AI Model → GET /api/context?agentId=X&sessionId=Y
            ← JSON response with context
   ```

3. **AI Model Uses Context**
   ```
   AI Model → Process with context
            → Generate response
            → Save new context
   ```

### Context Storage

- **Client-side:** LocalStorage (browser)
- **Server-side:** API endpoints (database-backed)
- **Future:** Vector database for semantic search

### Benefits

- ✅ **Lightweight:** GET requests are fast and cacheable
- ✅ **RESTful:** Standard HTTP pattern
- ✅ **Scalable:** Can handle thousands of contexts
- ✅ **Efficient:** Only fetches what's needed
- ✅ **Debuggable:** Easy to inspect via browser/API

## Agent Health & Context Allocation

Each agent dedicates a portion of its "health" (resources) to context management:

- **Context Storage:** ~1-5KB per context
- **GET Request Overhead:** < 50ms
- **Context Retrieval:** < 100ms
- **Total Overhead:** < 5% of agent capacity

### Health Monitoring

The Quality Controller monitors:
- Context storage usage per agent
- GET request performance
- Context retrieval times
- Storage health

## Usage Example

```typescript
// Agent saves context
await contextManager.saveContext(
  'trading-strategist',
  'session-123',
  {
    lastAnalysis: 'SOL/USDC',
    opportunities: [...],
  }
);

// AI Model retrieves context (GET request)
const context = await fetch('/api/context?agentId=trading-strategist&sessionId=session-123');
const contextData = await context.json();

// Use in AI prompt
const prompt = `Previous context:\n${JSON.stringify(contextData)}\n\nUser: ${userMessage}`;
```

## Next Steps

1. ✅ Context Manager Agent created
2. ✅ Memory Agent created
3. ✅ GET API endpoints created
4. ✅ Context storage implemented
5. ⏳ Integrate with existing agents
6. ⏳ Add to Cyber Playground UI
7. ⏳ Implement vector search (future)

