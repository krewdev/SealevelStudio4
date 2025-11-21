# Solana Agent Kit Integration Guide

Complete guide for using autonomous AI agents with DeFi plugins in Sealevel Studio.

## Overview

Sealevel Studio now includes a comprehensive Solana Agent Kit framework that enables:

- **Autonomous AI Agents**: Deploy agents that run 24/7, scanning for opportunities and executing trades
- **DeFi Plugins**: Extensible plugin system for Jupiter swaps, arbitrage detection, portfolio analytics, and more
- **LLM Integration**: Use local or cloud LLMs for intelligent decision-making
- **Backtesting**: Test strategies on historical data before deploying
- **Real-time Execution**: Atomic swaps via Jupiter aggregator

## Architecture

### Core Components

1. **BaseSolanaAgent**: Abstract base class for all agents
2. **Agent Plugins**: Extensible DeFi functionality
3. **LLM Providers**: AI reasoning for agent decisions
4. **Agent Registry**: Centralized agent management

### Agent Types

- **ArbitrageAgent**: Scans and executes arbitrage opportunities
- **PortfolioRebalancingAgent**: Automatically rebalances portfolio
- **LiquidityScanningAgent**: Continuously monitors liquidity pools
- **AIEnhancedAgent**: Combines LLM reasoning with logic-based rules

## Quick Start

### 1. Create an Arbitrage Agent

```typescript
import { ArbitrageAgent, AgentConfig } from '@/app/lib/agents/solana-agent-kit';
import { agentRegistry } from '@/app/lib/agents/solana-agent-kit';

const config: AgentConfig = {
  name: 'My Arbitrage Bot',
  enabled: true,
  strategy: 'arbitrage',
  riskTolerance: 'medium',
  maxPositionSize: 1.0, // 1 SOL max
  minProfitThreshold: 0.01, // 0.01 SOL minimum profit
  slippageTolerance: 0.5, // 0.5%
  priorityFee: 10000,
  useJito: false,
};

const agent = new ArbitrageAgent(connection, config);
agentRegistry.register(agent);
await agent.start();
```

### 2. Create an AI-Enhanced Agent with Local LLM

```typescript
import { AIEnhancedAgent } from '@/app/lib/agents/agentipy-integration';
import { LocalLLMProvider } from '@/app/lib/agents/agentipy-integration';

// Use your LM Studio instance
const llmProvider = new LocalLLMProvider(
  'http://172.20.20.20:1234',
  'llama-3.2-3b-instruct'
);

const agent = new AIEnhancedAgent(connection, config, undefined, llmProvider);
await agent.start();
```

### 3. Use DeFi Plugins

```typescript
import { JupiterSwapPlugin, defiPlugins } from '@/app/lib/agents/defi-plugins';

// Register plugins with agent
const jupiterPlugin = defiPlugins.find(p => p.id === 'jupiter-swap');
if (jupiterPlugin) {
  agent.registerPlugin(jupiterPlugin);
}

// Execute plugin
const context = {
  connection,
  agentWallet: agent.getAgentWallet(),
  agentKeypair: agent.getAgentKeypair(),
  config: {
    ...agentConfig,
    inputMint: 'So11111111111111111111111111111111111111112', // SOL
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    amount: '1000000000', // 1 SOL
    slippageBps: 50,
  },
};

const result = await jupiterPlugin.execute(context);
if (result.success) {
  console.log('Swap executed:', result.signature);
}
```

## Agent Strategies

### Arbitrage Strategy

Automatically finds and executes arbitrage opportunities across DEXs:

```typescript
const config: AgentConfig = {
  strategy: 'arbitrage',
  minProfitThreshold: 0.05, // 0.05 SOL minimum
  riskTolerance: 'medium',
  // ... other config
};
```

### Portfolio Rebalancing

Maintains target token allocations:

```typescript
import { PortfolioRebalancingAgent } from '@/app/lib/agents/solana-agent-kit';

const agent = new PortfolioRebalancingAgent(connection, config);

// Set target allocations (percentages)
const allocations = new Map([
  ['So11111111111111111111111111111111111111112', 40], // 40% SOL
  ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 30], // 30% USDC
  ['Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 30], // 30% USDT
]);

agent.setTargetAllocations(allocations);
await agent.start();
```

### Market Making

Provides liquidity and earns fees:

```typescript
const config: AgentConfig = {
  strategy: 'market-making',
  riskTolerance: 'low',
  maxPositionSize: 5.0,
  // ... other config
};
```

## DeFi Plugins

### Available Plugins

1. **JupiterSwapPlugin**: Execute swaps via Jupiter aggregator
2. **ArbitrageDetectionPlugin**: Scan for arbitrage opportunities
3. **PortfolioAnalyticsPlugin**: Analyze portfolio performance
4. **RiskAssessmentPlugin**: Assess risk for opportunities
5. **MarketDataPlugin**: Fetch real-time market data

### Creating Custom Plugins

```typescript
import { AgentPlugin, AgentContext, PluginResult } from '@/app/lib/agents/solana-agent-kit';

export class MyCustomPlugin implements AgentPlugin {
  id = 'my-custom-plugin';
  name = 'My Custom Plugin';
  version = '1.0.0';

  async execute(context: AgentContext): Promise<PluginResult> {
    // Your custom logic here
    return {
      success: true,
      data: { /* your data */ },
    };
  }

  validate(context: AgentContext): boolean {
    // Validate context
    return true;
  }
}

// Register with agent
agent.registerPlugin(new MyCustomPlugin());
```

## LLM Integration

### Using Local LLM (LM Studio)

```typescript
import { LocalLLMProvider } from '@/app/lib/agents/agentipy-integration';

const llmProvider = new LocalLLMProvider(
  process.env.LOCAL_AI_ENDPOINT || 'http://localhost:1234',
  process.env.LOCAL_AI_MODEL || 'llama-3.2-3b-instruct'
);

const agent = new AIEnhancedAgent(connection, config, undefined, llmProvider);
```

### Using Cloud LLM (Claude, GPT-4, Gemini)

```typescript
// Example: Cloud LLM provider (would need implementation)
class CloudLLMProvider implements LLMProvider {
  async generateResponse(prompt: string, context: any): Promise<string> {
    // Call cloud LLM API
  }
  
  async analyzeOpportunity(opportunity: any, marketData: any): Promise<AgentDecision> {
    // Analyze with cloud LLM
  }
}
```

## Logic-Based Trading Rules

Create rule-based trading strategies:

```typescript
import { LogicBasedTradingEngine, TradingRule } from '@/app/lib/agents/agentipy-integration';

const engine = new LogicBasedTradingEngine();

// Add custom rule
engine.addRule({
  name: 'high-profit-opportunity',
  condition: (ctx) => ctx.opportunity?.profit > 0.1,
  action: 'execute',
  confidence: 0.9,
  reasoning: 'High profit opportunity detected',
  parameters: { maxSlippage: 0.5 },
});

// Evaluate
const decision = engine.evaluate(tradingContext);
```

## Jupiter Integration

### Atomic Swaps

All agents use Jupiter Ultra API for atomic swap execution:

```typescript
// Automatically handled by JupiterSwapPlugin
// Or manually:
const response = await fetch('/api/jupiter/ultra', {
  method: 'POST',
  body: JSON.stringify({
    inputMint: 'So11111111111111111111111111111111111111112',
    outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amount: '1000000000',
    taker: agentWallet.toString(),
    slippageBps: 50,
  }),
});
```

### DEX Routing

Jupiter automatically finds the best route across all DEXs:
- Raydium
- Orca
- Meteora
- Lifinity
- And more...

## Agent Management

### Start/Stop Agents

```typescript
// Start all agents
await agentRegistry.startAll();

// Stop all agents
await agentRegistry.stopAll();

// Individual agent control
await agent.start();
await agent.stop();
```

### Monitor Agent Status

```typescript
const status = await agent.getStatus();
console.log('Agent Status:', {
  isRunning: status.isRunning,
  totalActions: status.totalActions,
  totalProfit: status.totalProfit,
  lastAction: status.lastAction,
});
```

## Security Best Practices

1. **Wallet Security**: Never expose agent keypairs in client code
2. **Position Limits**: Always set `maxPositionSize` to limit exposure
3. **Risk Tolerance**: Match risk tolerance to your strategy
4. **Slippage Protection**: Use appropriate slippage tolerance
5. **Monitoring**: Regularly check agent status and profits

## Example: Complete Autonomous Trading Bot

```typescript
import { ArbitrageAgent, AgentConfig, agentRegistry } from '@/app/lib/agents/solana-agent-kit';
import { JupiterSwapPlugin, RiskAssessmentPlugin } from '@/app/lib/agents/defi-plugins';
import { LocalLLMProvider, AIEnhancedAgent } from '@/app/lib/agents/agentipy-integration';

// Setup
const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Create agent config
const config: AgentConfig = {
  name: 'Autonomous Arbitrage Bot',
  enabled: true,
  strategy: 'arbitrage',
  riskTolerance: 'medium',
  maxPositionSize: 2.0,
  minProfitThreshold: 0.02,
  slippageTolerance: 0.5,
  priorityFee: 10000,
  useJito: false,
  plugins: ['jupiter-swap', 'risk-assessment'],
};

// Create agent with LLM
const llmProvider = new LocalLLMProvider(
  'http://172.20.20.20:1234',
  'llama-3.2-3b-instruct'
);

const agent = new AIEnhancedAgent(connection, config, undefined, llmProvider);

// Register plugins
agent.registerPlugin(new JupiterSwapPlugin());
agent.registerPlugin(new RiskAssessmentPlugin());

// Register and start
agentRegistry.register(agent);
await agent.start();

console.log('Agent started:', agent.getAgentWallet().toString());
```

## Integration with Existing Features

### Pool Scanner Integration

Agents automatically use the pool scanner for opportunity detection:

```typescript
// Agents will use pools from scanner
const pools = await poolScanner.scan();
// Agent context includes these pools
```

### Transaction Builder Integration

Agents can use the transaction builder for complex strategies:

```typescript
// Build custom transactions for agents
const transaction = await buildTransaction(instructions);
// Agent can execute via plugin
```

## Troubleshooting

### Agent Not Executing Trades

1. Check agent wallet has sufficient SOL
2. Verify `minProfitThreshold` isn't too high
3. Check `riskTolerance` settings
4. Ensure pools are being scanned

### LLM Not Responding

1. Verify LM Studio is running
2. Check endpoint URL is correct
3. Ensure model is loaded in LM Studio
4. Check network connectivity

### Jupiter Swaps Failing

1. Verify Jupiter API key is set (optional but recommended)
2. Check slippage tolerance
3. Ensure sufficient balance
4. Verify token addresses are correct

## Next Steps

- **Backtesting**: Implement backtesting engine for strategy validation
- **Multi-Agent Coordination**: Deploy multiple agents with different strategies
- **Portfolio Management**: Advanced portfolio analytics and rebalancing
- **MEV Protection**: Integrate Jito for MEV protection
- **Custom Strategies**: Build domain-specific trading strategies

## Resources

- [Jupiter API Docs](https://docs.jupiter.ag/)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [AgentiPy Patterns](https://github.com/agenti-py) (inspiration)
- [Solana Agent Kit](https://github.com/solana-labs/agent-kit) (reference)

