# Arbitrage Scanning Results Schema

## Overview

This document describes the JSON schema for structured output from AI models analyzing arbitrage scanning results. The schema tracks opportunities, executions, failures, and financial outcomes across Solana and TON chains.

## Quick Reference

### Main Schema Location
- **TypeScript/Zod**: `app/lib/arbitrage/arbitrage-result-schema.ts`
- **JSON Schema**: Exported as `ArbitrageResultsJSONSchema`
- **Types**: All TypeScript types are exported

## Schema Structure

### Top-Level Object

```typescript
{
  scanId: string;                    // Unique scan session ID
  scanStartTime: string;             // ISO 8601 timestamp
  scanEndTime: string;               // ISO 8601 timestamp
  scanDuration?: number;             // Duration in seconds
  
  probableTrades: ProbableTrade[];    // Opportunities found
  tradesExecuted: ExecutedTrade[];    // Successful trades
  tradesFailed: FailedTrade[];        // Failed attempts
  tradesMissed: MissedTrade[];        // Missed opportunities
  
  financialSummary: FinancialSummary; // Financial totals
  solanaDeposits?: Transaction[];     // SOL deposits
  tonTransactions?: TONTransaction[]; // TON chain txs
  
  chainsScanned: ('solana' | 'ton')[];
  poolsScanned?: number;
  opportunitiesFound?: number;
  executionRate?: number;            // 0-1 success rate
  
  shouldRepeat: boolean;             // Continue scanning?
  repeatReason?: string;             // Why repeat?
  
  errors?: Error[];                  // Errors encountered
}
```

## Core Types

### ProbableTrade (Opportunity Found)

```typescript
{
  id: string;
  type: 'simple' | 'multi_hop' | 'wrap_unwrap' | 'cross_protocol' | 'flash_loan' | 'mev';
  path: ArbitragePathStep[];
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  estimatedOutput: number;
  estimatedProfit: number;        // SOL
  profitPercent: number;
  estimatedGasFee: number;         // SOL
  netProfit: number;              // SOL
  confidence: number;              // 0-1
  expiresAt?: string;             // ISO 8601
  riskLevel: 'low' | 'medium' | 'high';
  chain: 'solana' | 'ton' | 'cross_chain';
  detectedAt: string;             // ISO 8601
}
```

### ExecutedTrade (Successful Trade)

```typescript
{
  id: string;
  opportunityId?: string;         // Link to ProbableTrade
  signature: string;               // Transaction signature
  chain: 'solana' | 'ton';
  type: 'simple' | 'multi_hop' | ...;
  path: ArbitragePathStep[];
  inputToken: string;
  outputToken: string;
  inputAmount: number;
  outputAmount: number;
  profit: number;                  // Actual profit in SOL
  profitPercent: number;
  gasFee: number;                 // Actual gas paid in SOL
  netProfit: number;              // Net after fees
  slippage?: number;
  executedAt: string;             // ISO 8601
  status: 'confirmed' | 'pending' | 'failed';
  tokensReceived?: TokenAmount[];
}
```

### FailedTrade

```typescript
{
  id: string;
  opportunityId?: string;
  signature?: string;
  chain: 'solana' | 'ton';
  type: string;
  reason: 'insufficient_balance' | 'slippage_exceeded' | 
          'transaction_failed' | 'opportunity_expired' |
          'gas_estimation_failed' | 'network_error' |
          'pool_liquidity_changed' | 'frontrun_detected' | 'other';
  errorMessage?: string;
  attemptedAt: string;            // ISO 8601
  estimatedProfit?: number;        // Profit that was missed
  gasFeeLost?: number;            // Gas fee wasted
}
```

### MissedTrade

```typescript
{
  id: string;
  opportunityId: string;
  type: string;
  reason: 'below_threshold' | 'insufficient_balance' | 
          'manual_skip' | 'risk_too_high' | 
          'system_busy' | 'expired' | 'other';
  estimatedProfit: number;        // Profit that was missed
  detectedAt: string;             // ISO 8601
  expiredAt?: string;             // ISO 8601
}
```

### FinancialSummary

```typescript
{
  solMade: number;                // Total SOL profit
  solDeposited: number;           // Total SOL deposited
  solWithdrawn?: number;          // Total SOL withdrawn
  gasFeesPaid: number;            // Total gas fees in SOL
  netSolProfit: number;           // Net profit (profit - fees)
  specialTokensMade: TokenAmount[]; // Rare/special tokens
  nftsAcquired: NFTAsset[];        // NFTs acquired
  totalValueUSD?: number;         // Total portfolio value
}
```

## Usage Examples

### With LM Studio (Structured Output)

```typescript
import { ArbitrageResultsJSONSchema, validateArbitrageResults } from '@/lib/arbitrage/arbitrage-result-schema';

// In your AI prompt
const prompt = `Analyze these arbitrage opportunities and return results in JSON format matching this schema:
${JSON.stringify(ArbitrageResultsJSONSchema, null, 2)}

Scan data: ${scanData}`;

// Call LM Studio with structured output
const response = await fetch('http://localhost:1234/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'local-model',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_schema', schema: ArbitrageResultsJSONSchema },
    temperature: 0.3, // Lower for structured output
  }),
});

const data = await response.json();
const results = validateArbitrageResults(JSON.parse(data.choices[0].message.content));
```

### With Zod Validation

```typescript
import { ArbitrageScanningResultsSchema } from '@/lib/arbitrage/arbitrage-result-schema';

try {
  const results = ArbitrageScanningResultsSchema.parse(aiResponse);
  console.log(`Found ${results.probableTrades.length} opportunities`);
  console.log(`Executed ${results.tradesExecuted.length} trades`);
  console.log(`Net profit: ${results.financialSummary.netSolProfit} SOL`);
} catch (error) {
  console.error('Invalid schema:', error);
}
```

### Example Response

```json
{
  "scanId": "scan-2024-01-15-123456",
  "scanStartTime": "2024-01-15T10:00:00Z",
  "scanEndTime": "2024-01-15T10:05:00Z",
  "scanDuration": 300,
  "probableTrades": [
    {
      "id": "opp-001",
      "type": "simple",
      "path": [
        {
          "dex": "Raydium",
          "poolAddress": "ABC123...",
          "inputToken": "SOL",
          "outputToken": "USDC",
          "inputAmount": 10,
          "outputAmount": 1500,
          "fee": 0.003
        }
      ],
      "inputToken": "SOL",
      "outputToken": "USDC",
      "inputAmount": 10,
      "estimatedOutput": 1500,
      "estimatedProfit": 0.5,
      "profitPercent": 5.0,
      "estimatedGasFee": 0.001,
      "netProfit": 0.499,
      "confidence": 0.85,
      "riskLevel": "low",
      "chain": "solana",
      "detectedAt": "2024-01-15T10:01:00Z"
    }
  ],
  "tradesExecuted": [
    {
      "id": "exec-001",
      "opportunityId": "opp-001",
      "signature": "5KJp...",
      "chain": "solana",
      "type": "simple",
      "path": [...],
      "inputToken": "SOL",
      "outputToken": "USDC",
      "inputAmount": 10,
      "outputAmount": 1498,
      "profit": 0.48,
      "profitPercent": 4.8,
      "gasFee": 0.001,
      "netProfit": 0.479,
      "slippage": 0.13,
      "executedAt": "2024-01-15T10:01:05Z",
      "status": "confirmed"
    }
  ],
  "tradesFailed": [],
  "tradesMissed": [],
  "financialSummary": {
    "solMade": 0.48,
    "solDeposited": 10,
    "gasFeesPaid": 0.001,
    "netSolProfit": 0.479,
    "specialTokensMade": [],
    "nftsAcquired": []
  },
  "chainsScanned": ["solana"],
  "shouldRepeat": false
}
```

## Integration with AI Models

### OpenAI Function Calling

```typescript
const functions = [{
  name: 'report_arbitrage_results',
  description: 'Report arbitrage scanning results',
  parameters: ArbitrageResultsJSONSchema,
}];
```

### Anthropic Structured Outputs

```typescript
const response = await anthropic.messages.create({
  model: 'claude-3-5-sonnet-20241022',
  messages: [{ role: 'user', content: prompt }],
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'arbitrage_results',
      schema: ArbitrageResultsJSONSchema,
    },
  },
});
```

### LM Studio (OpenAI-compatible)

```typescript
const response = await fetch('http://localhost:1234/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'local-model',
    messages: [{ role: 'user', content: prompt }],
    response_format: {
      type: 'json_schema',
      json_schema: ArbitrageResultsJSONSchema,
    },
  }),
});
```

## Validation

All schemas use Zod for runtime validation. Import and use:

```typescript
import { validateArbitrageResults } from '@/lib/arbitrage/arbitrage-result-schema';

const results = validateArbitrageResults(data); // Throws if invalid
```

## Notes

- All timestamps use ISO 8601 format
- All amounts are in native units (SOL, TON) unless specified
- USD values are optional but recommended
- The `shouldRepeat` flag allows the AI to indicate if scanning should continue
- All arrays can be empty if no items found
- Optional fields can be omitted

## Questions?

If you need to modify the schema or add fields, update `arbitrage-result-schema.ts` and regenerate the JSON schema.

