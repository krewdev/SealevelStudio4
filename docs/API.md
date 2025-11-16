# Sealevel Studio API Documentation

## Overview

This document describes all API endpoints available in Sealevel Studio. All endpoints are Next.js API routes located in the `app/api` directory.

---

## Table of Contents

- [Jupiter API](#jupiter-api)
- [Helius API](#helius-api)
- [Birdeye API](#birdeye-api)
- [Dune Analytics API](#dune-analytics-api)
- [Solscan API](#solscan-api)
- [VeriSol API](#verisol-api)

---

## Jupiter API

### GET `/api/jupiter/quote`

Get a swap quote from Jupiter aggregator.

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
- `type` (required): Data type - `price` or `pairs`

**Example:**
```
GET /api/birdeye/prices?address=So11111111111111111111111111111111111111112&type=price
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

