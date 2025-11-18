# Enhanced API Documentation

## Overview

This document describes the enhanced API suite for pool monitoring, imbalance detection, MEV signals, and predictive analytics.

---

## Pool Monitoring APIs

### 1. `/api/pools/monitor`

**Purpose:** Real-time pool monitoring with enhanced caching

**Method:** GET

**Parameters:**
- `pools` (optional): Comma-separated pool IDs
- `enhanced` (optional): Enable enhanced features

**Response:**
```json
{
  "success": true,
  "pools": [...],
  "cached": false,
  "totalPools": 1247,
  "cacheStats": {
    "hits": 150,
    "misses": 50,
    "hitRate": 0.75,
    "size": 200
  }
}
```

---

### 2. `/api/pools/imbalance`

**Purpose:** Detect price/liquidity imbalances with risk analysis

**Method:** GET

**Parameters:**
- `types` (optional): Comma-separated signal types
- `severity` (optional): Minimum severity (low/medium/high/critical)
- `enhanced` (optional): Enable predictive analytics

**Response:**
```json
{
  "success": true,
  "signals": [
    {
      "type": "price_deviation",
      "severity": "high",
      "poolId": "raydium_123",
      "tokenPair": "SOL/USDC",
      "currentPrice": 100.50,
      "expectedPrice": 102.00,
      "deviation": 1.5,
      "opportunity": {
        "profit": 0.05,
        "confidence": 0.85,
        "executionProbability": 0.78,
        "riskScore": 0.3,
        "recommendation": "execute",
        "predictedPrice": 102.50,
        "predictionConfidence": 0.85,
        "historicalMatches": 3
      }
    }
  ],
  "totalPools": 1247,
  "enhanced": true
}
```

---

### 3. `/api/pools/predict`

**Purpose:** Predict future price movements

**Method:** GET

**Parameters:**
- `pools` (optional): Comma-separated pool IDs
- `timeHorizon` (optional): Prediction horizon in seconds (default: 60)

**Response:**
```json
{
  "success": true,
  "predictions": [
    {
      "poolId": "pool_123",
      "tokenPair": "SOL/USDC",
      "currentPrice": 100.00,
      "predictedPrice": 102.50,
      "confidence": 0.85,
      "timeHorizon": 60,
      "direction": "up",
      "magnitude": 2.5,
      "factors": ["uptrend", "volume_increase", "pattern_match"]
    }
  ],
  "anomalies": [...]
}
```

---

### 4. `/api/pools/graph`

**Purpose:** Graph-based multi-hop opportunity detection

**Method:** GET

**Parameters:**
- `startToken` (optional): Starting token mint (default: SOL)
- `maxHops` (optional): Maximum hops (default: 5)
- `minProfit` (optional): Minimum profit percentage (default: 0.1)

**Response:**
```json
{
  "success": true,
  "opportunities": [
    {
      "path": {...},
      "profit": 0.05,
      "profitPercent": 1.2,
      "confidence": 0.8,
      "complexity": "moderate",
      "estimatedExecutionTime": 1.5
    }
  ],
  "graphStats": {
    "nodes": 500,
    "edges": 2000,
    "pools": 1247
  }
}
```

---

### 5. `/api/pools/patterns`

**Purpose:** Historical pattern matching

**Method:** GET

**Parameters:**
- `poolId` (optional): Specific pool to analyze

**Response:**
```json
{
  "success": true,
  "poolId": "pool_123",
  "currentOpportunity": {...},
  "matches": [
    {
      "historicalPattern": {...},
      "similarity": 0.92,
      "predictedOutcome": {
        "profit": 0.08,
        "successProbability": 0.88
      }
    }
  ],
  "stats": {
    "totalPatterns": 5000,
    "successRate": 0.65,
    "averageProfit": 0.05
  }
}
```

---

### 6. `/api/pools/analyze`

**Purpose:** Risk analysis and execution probability

**Method:** GET

**Parameters:**
- `opportunityId` (optional): Specific opportunity to analyze
- `minProfit` (optional): Minimum profit filter (default: 0.01)

**Response:**
```json
{
  "success": true,
  "analyses": [
    {
      "opportunity": {...},
      "executionProbability": 0.78,
      "riskScore": 0.3,
      "competitionLevel": "medium",
      "factors": {
        "liquidity": "sufficient",
        "slippage": "low",
        "gasCost": "low",
        "competition": "medium",
        "timeWindow": "narrow"
      },
      "recommendation": "execute",
      "reasoning": "High execution probability, low risk profile"
    }
  ]
}
```

---

### 7. `/api/pools/signals/prioritized`

**Purpose:** AI-powered signal prioritization

**Method:** GET

**Response:**
```json
{
  "success": true,
  "signals": [
    {
      "priority": 1,
      "score": 0.95,
      "opportunity": {...},
      "profit": 0.1,
      "executionProbability": 0.85,
      "riskScore": 0.2,
      "timeSensitivity": "critical",
      "aiReasoning": "High execution probability, low risk profile, high profit potential",
      "recommendedAction": "execute_immediately"
    }
  ],
  "recommendedAction": "execute_immediately"
}
```

---

## MEV APIs

### 8. `/api/mev/signals`

**Purpose:** MEV opportunity detection (requires Jito ShredStream)

**Method:** GET

**Parameters:**
- `types` (optional): Signal types to filter
- `severity` (optional): Minimum severity

**Response:**
```json
{
  "success": true,
  "signals": [
    {
      "type": "sandwich_opportunity",
      "severity": "high",
      "details": {
        "victimTx": "pending_tx_signature",
        "estimatedProfit": 0.25,
        "timeWindow": 2,
        "requiredTip": 50000
      },
      "action": "sandwich"
    }
  ]
}
```

---

## Whale Tracking APIs

### 9. `/api/whales/track`

**Purpose:** Track whale wallets and predict actions

**Method:** GET

**Parameters:**
- `address` (optional): Specific whale address
- `limit` (optional): Number of top whales (default: 10)

**Response:**
```json
{
  "success": true,
  "whales": [
    {
      "address": "whale_address",
      "totalValue": 50000,
      "behaviorPattern": "accumulator",
      "successRate": 0.75,
      "recentActivity": [...]
    }
  ],
  "predictions": [
    {
      "whale": {...},
      "predictedAction": "buy",
      "confidence": 0.8,
      "reasoning": "Whale is in accumulation phase",
      "opportunity": {
        "type": "follow_whale",
        "estimatedProfit": 0.05
      }
    }
  ]
}
```

---

## Perpetual Contracts APIs

### 10. `/api/perpetuals/monitor`

**Purpose:** Monitor perpetual contracts and detect arbitrage

**Method:** GET

**Parameters:**
- `protocol` (optional): Protocol name (drift/mango/zetamarkets/01)
- `market` (optional): Market name (e.g., SOL-PERP)

**Response:**
```json
{
  "success": true,
  "contracts": [
    {
      "protocol": "drift",
      "market": "SOL-PERP",
      "indexPrice": 100.00,
      "markPrice": 101.50,
      "fundingRate": 0.0005
    }
  ],
  "arbitrages": [
    {
      "type": "premium",
      "spotPrice": 100.00,
      "perpPrice": 101.50,
      "premium": 1.5,
      "estimatedProfit": 1.2,
      "action": "short_perp_long_spot",
      "confidence": 0.8
    }
  ]
}
```

---

## Usage Examples

### Example 1: Get Imbalance Signals
```bash
curl "http://localhost:3000/api/pools/imbalance?enhanced=true&severity=high"
```

### Example 2: Predict Prices
```bash
curl "http://localhost:3000/api/pools/predict?pools=pool1,pool2&timeHorizon=60"
```

### Example 3: Analyze Opportunity Risk
```bash
curl "http://localhost:3000/api/pools/analyze?opportunityId=opp_123"
```

### Example 4: Get Prioritized Signals
```bash
curl "http://localhost:3000/api/pools/signals/prioritized"
```

### Example 5: Track Whale
```bash
curl "http://localhost:3000/api/whales/track?address=whale_address"
```

---

## Performance Notes

- **Caching:** Enhanced cache with volatility-based TTL
- **Connection Pooling:** WebSocket connections are pooled for efficiency
- **Batch Processing:** Multiple pools processed in parallel
- **Smart Invalidation:** Cache invalidated on WebSocket updates

---

## Rate Limits

- Standard endpoints: 100 requests/minute
- Enhanced endpoints: 50 requests/minute
- WebSocket connections: 10 concurrent subscriptions

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message"
}
```

HTTP status codes:
- 200: Success
- 400: Bad request
- 404: Not found
- 500: Server error

