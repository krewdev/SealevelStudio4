# Sealevel Studio API Documentation

## Overview

This document describes all API endpoints available in Sealevel Studio. All endpoints are Next.js API routes located in the `app/api` directory.

---

## Table of Contents

- [Agent APIs](#agent-apis)
- [Pool Scanning API](#pool-scanning-api)
- [Jupiter API](#jupiter-api)
- [Helius API](#helius-api)
- [Birdeye API](#birdeye-api)
- [Dune Analytics API](#dune-analytics-api)
- [Solscan API](#solscan-api)
- [VeriSol API](#verisol-api)

---

## Agent APIs

### POST `/api/agents/create`

Create a new autonomous trading agent.

**Request Body:**
```json
{
  "type": "arbitrage" | "portfolio-rebalancing" | "liquidity-scanning" | "ai-enhanced",
  "config": {
    "name": "My Trading Bot",
    "strategy": "arbitrage",
    "riskTolerance": "low" | "medium" | "high",
    "maxPositionSize": 1.0,
    "minProfitThreshold": 0.01,
    "slippageTolerance": 0.5,
    "priorityFee": 10000,
    "useJito": false,
    "plugins": ["jupiter-swap", "risk-assessment"]
  },
  "agentWalletSeed": "optional-seed-for-deterministic-wallet"
}
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

### GET `/api/agents/list`

List all active agents.

**Response:**
```json
{
  "success": true,
  "agents": [
    {
      "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
      "type": "arbitrage",
      "status": { ... },
      "config": { ... }
    }
  ],
  "count": 1
}
```

### POST `/api/agents/control`

Control agent (start, stop, get status, execute).

**Request Body:**
```json
{
  "action": "start" | "stop" | "status" | "execute",
  "wallet": "agent_wallet_address"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Agent started",
  "status": {
    "isRunning": true,
    "agentWallet": "...",
    "strategy": "arbitrage",
    "totalActions": 5,
    "totalProfit": 0.15
  }
}
```

**Note:** See [Solana Agent Kit Guide](./SOLANA_AGENT_KIT.md) for detailed usage.

---

## Pool Scanning API

### GET `/api/pools/scan`

Scan and aggregate pools from all DEXs on-chain.

**Query Parameters:**
- `network` (optional): `mainnet` or `devnet` (default: `mainnet`)
- `dexes` (optional): Comma-separated list of DEXes (e.g., `orca,raydium,meteora`)
- `minLiquidity` (optional): Minimum liquidity filter (number)
- `opportunities` (optional): Include arbitrage opportunities (`true`/`false`)

**Example:**
```
GET /api/pools/scan?network=mainnet&dexes=orca,raydium&minLiquidity=1000&opportunities=true
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
  "poolsByDex": { ... },
  "opportunities": [ ... ],
  "errors": []
}
```

### POST `/api/pools/scan`

Search for pools containing a specific token pair.

**Request Body:**
```json
{
  "tokenA": "So11111111111111111111111111111111111111112",
  "tokenB": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "network": "mainnet"
}
```

**Response:**
```json
{
  "success": true,
  "tokenA": "So11111111111111111111111111111111111111112",
  "tokenB": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "pools": [ ... ],
  "count": 5,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**Note:** This API aggregates pools from:
- Raydium
- Orca
- Meteora
- Lifinity
- Jupiter (aggregator)
- Helius (if API key provided)
- Birdeye (if API key provided)

---

## Jupiter API

### GET `/api/jupiter/quote`

Get a swap quote from Jupiter aggregator.

**Query Parameters:**
- `inputMint` (required): Input token mint address
- `outputMint` (required): Output token mint address
- `amount` (required): Amount in lamports
- `slippageBps` (optional): Slippage in basis points (default: 50)

**Note:** Optional API key support. Set `JUPITER_API_KEY` environment variable for authenticated requests with higher rate limits.

### POST `/api/jupiter/swap`

Get swap transaction from Jupiter (requires quote first).

**Request Body:**
```json
{
  "quoteResponse": { ... },
  "userPublicKey": "wallet_address",
  "wrapAndUnwrapSol": true,
  "slippageBps": 50
}
```

### POST `/api/jupiter/ultra`

Execute a swap using Jupiter Ultra API (quote + execute in one call). Simplified API that handles the entire swap process.

**Request Body:**
```json
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "1000000000",
  "taker": "wallet_public_key",
  "slippageBps": 50,
  "priorityFee": 10000,
  "wrapAndUnwrapSol": true
}
```

**Response:**
```json
{
  "status": "Success",
  "signature": "transaction_signature"
}
```

**Benefits of Ultra API:**
- Simplified execution (quote + execute in one call)
- No need to manage RPC endpoints
- Direct transaction execution
- Better for automated trading and market making

### GET `/api/jupiter/ultra`

Get quote using Ultra API (alternative to `/quote` endpoint).

**Query Parameters:**
- `inputMint` (required): Input token mint address
- `outputMint` (required): Output token mint address
- `amount` (required): Amount in lamports
- `slippageBps` (optional): Slippage in basis points (default: 50)

**Example:**
```
GET /api/jupiter/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippageBps=50
```

**Response:**
```json
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "inAmount": "1000000000",
  "outAmount": "150000000",
  "priceImpactPct": "0.1",
  "route": { ... }
}
```

---

## Helius API

### GET `/api/helius/pools`

Get liquidity pool data from Helius API.

**Query Parameters:**
- `limit` (optional): Maximum number of pools to return (default: 100)

**Example:**
```
GET /api/helius/pools?limit=50
```

**Response:**
```json
{
  "pools": [
    {
      "id": "pool_id",
      "tokenA": { "mint": "...", "symbol": "SOL", "decimals": 9 },
      "tokenB": { "mint": "...", "symbol": "USDC", "decimals": 6 },
      "reserves": { "tokenA": "1000000000", "tokenB": "150000000" },
      "price": 150,
      "volume24h": 1000000,
      "tvl": 5000000
    }
  ]
}
```

**Note:** Requires `HELIUS_API_KEY` environment variable.

---

## Birdeye API

### GET `/api/birdeye/prices`

Get token price data from Birdeye.

**Query Parameters:**
- `address` (required): Token mint address
- `type` (required): Data type - `price`, `volume`, or `pairs`
- `ui_amount_mode` (optional): `raw` (lamports) or `ui` (human-readable, default: `raw`)

**Example:**
```
GET /api/birdeye/prices?address=So11111111111111111111111111111111111111112&type=price&ui_amount_mode=raw
```

**Response:**
```json
{
  "price": 150.25,
  "priceChange24h": 2.5,
  "volume24h": 1000000,
  "marketCap": 50000000
}
```

**Note:** Requires `BIRDEYE_API_KEY` environment variable.

### GET `/api/birdeye/ohlcv`

Get OHLCV (Open, High, Low, Close, Volume) data for a trading pair.

**Query Parameters:**
- `address` (required): Pair address (pool address)
- `type` (optional): Time interval - `15s`, `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M` (default: `15m`)
- `mode` (optional): `range` or `last` (default: `range`)
- `time_from` (required for range mode): Start timestamp (Unix seconds)
- `time_to` (required for range mode): End timestamp (Unix seconds)
- `padding` (optional): `true` or `false` (default: `false`)
- `outlier` (optional): `true` or `false` (default: `true`)
- `inversion` (optional): `true` or `false` (default: `false`)

**Example:**
```
GET /api/birdeye/ohlcv?address=4DoNfFBfF7UokCC2FQzriy7yHK6DY6NVdYpuekQ5pRgg&type=15s&time_from=1726700000&time_to=1726704000&mode=range&padding=false&outlier=true&inversion=false
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "unixTime": 1726700000,
        "open": 150.25,
        "high": 151.50,
        "low": 149.80,
        "close": 150.90,
        "volume": 1000000
      }
    ]
  }
}
```

**Note:** Requires `BIRDEYE_API_KEY` environment variable.

### POST `/api/birdeye/multi-price`

Get prices for multiple tokens in a single request.

**Request Body:**
```json
{
  "list_address": "So11111111111111111111111111111111111111112,DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "ui_amount_mode": "raw"
}
```

**Query Parameters (GET method also supported):**
- `list_address` (optional for GET): Comma-separated list of token mint addresses (can be in query params for GET or body for POST)
- `ui_amount_mode` (optional): `raw` (lamports) or `ui` (human-readable, default: `raw`)

**GET Example:**
```
GET /api/birdeye/multi-price?list_address=So11111111111111111111111111111111111111112,DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263&ui_amount_mode=raw
```

**Example:**
```
POST /api/birdeye/multi-price
Content-Type: application/json

{
  "list_address": "So11111111111111111111111111111111111111112,DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "ui_amount_mode": "raw"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "So11111111111111111111111111111111111111112": {
      "value": 150.25,
      "updateUnixTime": 1726700000,
      "updateHumanTime": "2024-09-18T12:00:00Z"
    },
    "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263": {
      "value": 0.0000125,
      "updateUnixTime": 1726700000,
      "updateHumanTime": "2024-09-18T12:00:00Z"
    }
  }
}
```

**Note:** 
- Requires `BIRDEYE_API_KEY` environment variable
- Maximum 100 addresses per request
- All addresses are validated for security

### GET `/api/birdeye/txs/token/seek_by_time`

Get token transactions sorted by time.

**Query Parameters:**
- `address` (required): Token mint address
- `offset` (optional): Pagination offset (default: 0)
- `limit` (optional): Number of transactions to return (default: 100, max: 1000)
- `tx_type` (optional): Transaction type - `swap`, `transfer`, or `all` (default: `all`)
- `ui_amount_mode` (optional): `raw`, `ui`, or `scaled` (default: `scaled`)
- `time_from` (optional): Start timestamp (Unix seconds)
- `time_to` (optional): End timestamp (Unix seconds)

**Example:**
```
GET /api/birdeye/txs/token/seek_by_time?address=So11111111111111111111111111111111111111112&offset=0&limit=100&tx_type=swap&ui_amount_mode=scaled
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "signature": "transaction_signature",
        "blockTime": 1726700000,
        "txType": "swap",
        "from": "wallet_address",
        "to": "wallet_address",
        "amountIn": "1000000000",
        "amountOut": "150000000",
        "tokenIn": "So11111111111111111111111111111111111111112",
        "tokenOut": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
      }
    ],
    "total": 1000
  }
}
```

**Note:** Requires `BIRDEYE_API_KEY` environment variable.

### GET `/api/birdeye/txs/pair/seek_by_time`

Get pair (pool) transactions sorted by time.

**Query Parameters:**
- `address` (required): Pair/pool address
- `offset` (optional): Pagination offset (default: 0)
- `limit` (optional): Number of transactions to return (default: 100, max: 1000)
- `tx_type` (optional): Transaction type - `swap`, `transfer`, or `all` (default: `all`)
- `ui_amount_mode` (optional): `raw`, `ui`, or `scaled` (default: `scaled`)
- `time_from` (optional): Start timestamp (Unix seconds)
- `time_to` (optional): End timestamp (Unix seconds)

**Example:**
```
GET /api/birdeye/txs/pair/seek_by_time?address=4DoNfFBfF7UokCC2FQzriy7yHK6DY6NVdYpuekQ5pRgg&offset=0&limit=100&tx_type=swap&ui_amount_mode=scaled
```

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "signature": "transaction_signature",
        "blockTime": 1726700000,
        "txType": "swap",
        "amountIn": "1000000000",
        "amountOut": "150000000"
      }
    ],
    "total": 500
  }
}
```

**Note:** Requires `BIRDEYE_API_KEY` environment variable.

### GET `/api/birdeye/ohlcv/base_quote`

Get OHLCV data for base/quote token pairs.

**Query Parameters:**
- `base` (required): Base token mint address
- `quote` (required): Quote token mint address
- `type` (optional): Time interval - `15s`, `1m`, `3m`, `5m`, `15m`, `30m`, `1h`, `2h`, `4h`, `6h`, `8h`, `12h`, `1d`, `3d`, `1w`, `1M` (default: `1m`)
- `ui_amount_mode` (optional): `raw`, `ui`, or `scaled` (default: `raw`)
- `time_from` (optional): Start timestamp (Unix seconds)
- `time_to` (optional): End timestamp (Unix seconds)

**Example:**
```
GET /api/birdeye/ohlcv/base_quote?base=So11111111111111111111111111111111111111112&quote=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&type=1m&ui_amount_mode=raw
```

**Note:** Requires `BIRDEYE_API_KEY` environment variable.

### GET `/api/birdeye/token-list`

Get list of tokens with trading activity.

**Query Parameters:**
- `offset` (optional): Pagination offset (default: 0)
- `limit` (optional): Number of tokens to return (default: 50, max: 100)
- `sort_by` (optional): Sort field (default: `v24hUSD`)
- `sort_type` (optional): `asc` or `desc` (default: `desc`)

**Example:**
```
GET /api/birdeye/token-list?offset=0&limit=50&sort_by=v24hUSD&sort_type=desc
```

**Note:** Requires `BIRDEYE_API_KEY` environment variable.

### GET `/api/birdeye/search`

Search for tokens and markets by pattern or address.

**Query Parameters:**
- `query` (required): Search query (token symbol, name, or address)
- `limit` (optional): Number of results (default: 10, max: 50)

**Example:**
```
GET /api/birdeye/search?query=SOL&limit=10
```

**Note:** Requires `BIRDEYE_API_KEY` environment variable.

### GET `/api/birdeye/token-overview`

Get detailed overview information about a specific token.

**Query Parameters:**
- `address` (required): Token mint address

**Example:**
```
GET /api/birdeye/token-overview?address=So11111111111111111111111111111111111111112
```

**Note:** Requires `BIRDEYE_API_KEY` environment variable.

### GET `/api/birdeye/token-security`

Get security-related information about a token.

**Query Parameters:**
- `address` (required): Token mint address

**Example:**
```
GET /api/birdeye/token-security?address=So11111111111111111111111111111111111111112
```

**Note:** Requires `BIRDEYE_API_KEY` environment variable.

### GET `/api/birdeye/price-history`

Get historical price data for a token.

**Query Parameters:**
- `address` (required): Token mint address
- `type` (optional): Time period type (default: `1D`)
- `time_from` (optional): Start timestamp (Unix seconds)
- `time_to` (optional): End timestamp (Unix seconds)

**Example:**
```
GET /api/birdeye/price-history?address=So11111111111111111111111111111111111111112&type=1D
```

**Note:** Requires `BIRDEYE_API_KEY` environment variable.

---

## Dune Analytics API

### GET `/api/dune/query`

Execute a Dune Analytics query.

**Query Parameters:**
- `queryId` (required): Dune query ID
- `parameters` (optional): JSON-encoded query parameters

**Example:**
```
GET /api/dune/query?queryId=12345&parameters={"start_date":"2024-01-01"}
```

**Response:**
```json
{
  "execution_id": "exec_123",
  "state": "QUERY_STATE_COMPLETED",
  "result": {
    "rows": [ ... ],
    "metadata": { ... }
  }
}
```

**Note:** Requires `DUNE_API_KEY` environment variable.

---

## Solscan API

### GET `/api/solscan`

Get data from Solscan API.

**Query Parameters:**
- `action` (required): API action (e.g., `token`, `account`, `transaction`)
- `address` (required): Address to query
- Additional parameters depend on the action

**Example:**
```
GET /api/solscan?action=token&address=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

**Response:**
```json
{
  "symbol": "USDC",
  "name": "USD Coin",
  "decimals": 6,
  "supply": "1000000000",
  "price": 1.0
}
```

**Note:** Requires `SOLSCAN_API_KEY` environment variable.

---

## VeriSol API

### GET `/api/verisol/check`

Check if a wallet has a VeriSol attestation cNFT.

**Query Parameters:**
- `wallet` (required): Wallet address to check

**Example:**
```
GET /api/verisol/check?wallet=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**Response:**
```json
{
  "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "hasAttestation": true,
  "attestationTxSignature": "5j7s8...",
  "attestationTimestamp": 1234567890000,
  "cNFTAddress": "cNFT_id_here",
  "metadata": {
    "name": "Sealevel Studio Beta Tester",
    "symbol": "BETA",
    "uri": "https://sealevel.studio/metadata/beta-tester.json"
  },
  "checkedAt": "2024-01-01T00:00:00.000Z"
}
```

### GET `/api/verisol/beta-tester/check`

Check if a wallet has a beta tester attestation in the beta tester merkle tree.

**Query Parameters:**
- `wallet` (required): Wallet address to check

**Example:**
```
GET /api/verisol/beta-tester/check?wallet=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

**Response:**
```json
{
  "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "hasAttestation": true,
  "attestationTxSignature": "5j7s8...",
  "attestationTimestamp": 1234567890000,
  "cNFTAddress": "cNFT_id_here",
  "metadata": {
    "name": "Sealevel Studio Beta Tester",
    "symbol": "BETA",
    "uri": "https://sealevel.studio/metadata/beta-tester.json",
    "compression": {
      "tree": "merkle_tree_address",
      "leaf_id": "leaf_id"
    }
  },
  "merkleTree": "merkle_tree_address",
  "checkedAt": "2024-01-01T00:00:00.000Z"
}
```

**How it works:**
1. **With Helius DAS API** (recommended): Queries `getAssetsByOwner` filtered by tree/collection
2. **Without API key** (fallback): Scans transaction history for VeriSol + Bubblegum interactions

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": "Error message description",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**
- `400`: Bad Request - Invalid parameters
- `401`: Unauthorized - Missing or invalid API key
- `429`: Rate Limit Exceeded
- `500`: Internal Server Error

---

## Rate Limiting

- Most endpoints have rate limiting to prevent abuse
- Rate limits vary by endpoint and API provider
- Rate limit headers are included in responses when applicable

---

## Authentication

- API keys are stored server-side in environment variables
- Never expose API keys in client-side code
- All API routes validate API keys before making external requests

---

## Security

- All user inputs are validated before use
- SSRF protection: URLs are validated against allow-lists
- API keys are never exposed in query parameters or responses
- CORS is properly configured for all endpoints

---

## Environment Variables

Required environment variables:

```bash
# Optional (enhanced features)
HELIUS_API_KEY=your_helius_key
BIRDEYE_API_KEY=your_birdeye_key
DUNE_API_KEY=your_dune_key
SOLSCAN_API_KEY=your_solscan_key

# VeriSol
NEXT_PUBLIC_VERISOL_PROGRAM_ID=mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6
NEXT_PUBLIC_VERISOL_MERKLE_TREE=your_merkle_tree_address
NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE=your_beta_tester_tree_address
NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID=your_collection_id
```

---

## Support

For API issues or questions, please contact support or check the main documentation.

