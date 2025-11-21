# API Testing Guide

Complete guide for testing the Agent APIs and Pool Scanning API.

## Overview

We provide multiple testing approaches:
1. **Jest-style tests** - Unit tests for API routes
2. **Shell scripts** - Quick manual testing
3. **cURL examples** - Direct API testing

## Prerequisites

1. **Start the dev server**:
   ```bash
   npm run dev
   ```

2. **Ensure environment variables are set** (optional but recommended):
   - `NEXT_PUBLIC_SOLANA_RPC_MAINNET` - Mainnet RPC endpoint
   - `NEXT_PUBLIC_HELIUS_API_KEY` - Helius API key (for enhanced pool scanning)
   - `LOCAL_AI_ENDPOINT` - LM Studio endpoint (for AI-enhanced agents)

## Testing Agent APIs

### Using Shell Scripts

```bash
# Test agent creation, listing, and control
./scripts/test-agents-api.sh
```

This script tests:
- ✅ Creating arbitrage agents
- ✅ Listing all agents
- ✅ Starting/stopping agents
- ✅ Getting agent status

### Manual Testing with cURL

#### 1. Create an Arbitrage Agent

```bash
curl -X POST http://localhost:3000/api/agents/create \
  -H "Content-Type: application/json" \
  -d '{
    "type": "arbitrage",
    "config": {
      "name": "My Arbitrage Bot",
      "strategy": "arbitrage",
      "riskTolerance": "medium",
      "maxPositionSize": 1.0,
      "minProfitThreshold": 0.01,
      "slippageTolerance": 0.5,
      "priorityFee": 10000
    }
  }'
```

**Response:**
```json
{
  "success": true,
  "agent": {
    "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    "type": "arbitrage",
    "config": { ... },
    "status": { ... }
  }
}
```

#### 2. Create an AI-Enhanced Agent

```bash
curl -X POST http://localhost:3000/api/agents/create \
  -H "Content-Type: application/json" \
  -d '{
    "type": "ai-enhanced",
    "config": {
      "name": "AI Trading Bot",
      "strategy": "arbitrage",
      "riskTolerance": "medium",
      "maxPositionSize": 1.0,
      "minProfitThreshold": 0.02,
      "plugins": ["jupiter-swap", "risk-assessment"]
    }
  }'
```

#### 3. List All Agents

```bash
curl http://localhost:3000/api/agents/list
```

#### 4. Start an Agent

```bash
curl -X POST http://localhost:3000/api/agents/control \
  -H "Content-Type: application/json" \
  -d '{
    "action": "start",
    "wallet": "YOUR_AGENT_WALLET_ADDRESS"
  }'
```

#### 5. Get Agent Status

```bash
curl -X POST http://localhost:3000/api/agents/control \
  -H "Content-Type: application/json" \
  -d '{
    "action": "status",
    "wallet": "YOUR_AGENT_WALLET_ADDRESS"
  }'
```

#### 6. Stop an Agent

```bash
curl -X POST http://localhost:3000/api/agents/control \
  -H "Content-Type: application/json" \
  -d '{
    "action": "stop",
    "wallet": "YOUR_AGENT_WALLET_ADDRESS"
  }'
```

## Testing Pool Scanning API

### Using Shell Scripts

```bash
# Test pool scanning functionality
./scripts/test-pools-api.sh
```

This script tests:
- ✅ Scanning all pools from all DEXs
- ✅ Filtering by specific DEXes
- ✅ Filtering by minimum liquidity
- ✅ Searching for specific token pairs
- ✅ Including arbitrage opportunities

### Manual Testing with cURL

#### 1. Scan All Pools

```bash
curl "http://localhost:3000/api/pools/scan?network=mainnet"
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalPools": 150,
    "poolsByDex": {
      "orca": 45,
      "raydium": 60,
      "meteora": 30,
      "lifinity": 15
    },
    "totalLiquidity": 1250000.50,
    "scanDuration": 3500,
    "network": "mainnet",
    "timestamp": "2024-01-01T00:00:00.000Z"
  },
  "pools": [ ... ],
  "poolsByDex": { ... }
}
```

#### 2. Filter by Specific DEXes

```bash
curl "http://localhost:3000/api/pools/scan?network=mainnet&dexes=orca,raydium"
```

#### 3. Filter by Minimum Liquidity

```bash
curl "http://localhost:3000/api/pools/scan?network=mainnet&minLiquidity=1000"
```

#### 4. Include Arbitrage Opportunities

```bash
curl "http://localhost:3000/api/pools/scan?network=mainnet&opportunities=true"
```

#### 5. Search Specific Token Pair

```bash
curl -X POST http://localhost:3000/api/pools/scan \
  -H "Content-Type: application/json" \
  -d '{
    "tokenA": "So11111111111111111111111111111111111111112",
    "tokenB": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "network": "mainnet"
  }'
```

**Response:**
```json
{
  "success": true,
  "tokenA": "So11111111111111111111111111111111111111112",
  "tokenB": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "pools": [
    {
      "id": "orca-sol-usdc",
      "dex": "orca",
      "tokenA": { ... },
      "tokenB": { ... },
      "price": 150.25,
      "liquidity": 50000
    }
  ],
  "count": 5,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Jest-Style Tests

### Running Tests

```bash
# Install Jest if not already installed
npm install --save-dev jest @types/jest ts-jest

# Run tests
npm test
```

### Test Files

- `__tests__/api/agents.test.ts` - Agent API tests
- `__tests__/api/pools.test.ts` - Pool scanning API tests

### Example Test

```typescript
describe('POST /api/agents/create', () => {
  it('should create an arbitrage agent', async () => {
    const response = await fetch('http://localhost:3000/api/agents/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'arbitrage',
        config: {
          name: 'Test Agent',
          strategy: 'arbitrage',
        },
      }),
    });

    expect(response.ok).toBe(true);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
```

## API Endpoints Summary

### Agent APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agents/create` | Create a new agent |
| GET | `/api/agents/list` | List all agents |
| POST | `/api/agents/control` | Start/stop/get status |

### Pool Scanning APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pools/scan` | Scan all pools (with filters) |
| POST | `/api/pools/scan` | Search pools for token pair |

## Query Parameters

### GET `/api/pools/scan`

- `network` (optional): `mainnet` or `devnet` (default: `mainnet`)
- `dexes` (optional): Comma-separated list of DEXes (e.g., `orca,raydium`)
- `minLiquidity` (optional): Minimum liquidity filter (number)
- `opportunities` (optional): Include arbitrage opportunities (`true`/`false`)

### POST `/api/pools/scan`

- `tokenA` (required): First token mint address
- `tokenB` (required): Second token mint address
- `network` (optional): `mainnet` or `devnet` (default: `mainnet`)

## Error Handling

All APIs return consistent error responses:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing/invalid parameters)
- `404` - Not Found (agent doesn't exist)
- `500` - Internal Server Error

## Performance Considerations

### Pool Scanning

- **Full scan**: Can take 5-30 seconds depending on network and DEX count
- **Filtered scan**: Faster when filtering by specific DEXes
- **Caching**: Results are cached in-memory for faster subsequent requests

### Agent Operations

- **Creation**: Instant (< 100ms)
- **Start/Stop**: Instant (< 100ms)
- **Status**: Instant (< 50ms)

## Troubleshooting

### Agent Creation Fails

1. Check RPC endpoint is accessible
2. Verify environment variables are set
3. Check server logs for detailed errors

### Pool Scanning Returns Empty Results

1. Verify RPC endpoint is working
2. Check if DEXes are enabled in config
3. Try filtering by specific DEXes first
4. Check network (mainnet vs devnet)

### Tests Fail

1. Ensure dev server is running (`npm run dev`)
2. Check that port 3000 is available
3. Verify environment variables are set
4. Check network connectivity

## Next Steps

- Add more comprehensive Jest tests
- Add integration tests
- Add performance benchmarks
- Add API rate limiting tests
- Add error scenario tests

