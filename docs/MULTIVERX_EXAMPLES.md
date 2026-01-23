# MultiverX Code Examples

## Table of Contents

1. [Basic Examples](#basic-examples)
2. [Advanced Examples](#advanced-examples)
3. [Real-World Scenarios](#real-world-scenarios)
4. [Integration Examples](#integration-examples)

---

## Basic Examples

### Example 1: Simple Transaction Simulation

```typescript
import { ShardTransactionSimulator } from '@/app/lib/shard-simulator/simulator';
import type { ShardTransaction } from '@/app/lib/shard-simulator/types';

// Initialize simulator
const simulator = new ShardTransactionSimulator({
  shardCount: 3,
});

// Create transaction
const transaction: ShardTransaction = {
  from: 'erd1testfrom123456789',
  to: 'erd1testto987654321',
  amount: '100',
  gasEstimate: 70000,
} as ShardTransaction;

// Simulate
const result = await simulator.simulateTransaction(transaction);

// Check results
console.log('Transaction Type:', transaction.type);
console.log('From Shard:', transaction.shardFrom);
console.log('To Shard:', transaction.shardTo);
console.log('Success:', result.success);
console.log('Processing Time:', result.time, 'ms');
```

### Example 2: Batch Transaction Processing

```typescript
// Create multiple transactions
const transactions: ShardTransaction[] = [
  {
    from: 'erd1alice',
    to: 'erd1bob',
    amount: '100',
    gasEstimate: 70000,
  },
  {
    from: 'erd1charlie',
    to: 'erd1dave',
    amount: '200',
    gasEstimate: 70000,
  },
  {
    from: 'erd1eve',
    to: 'erd1frank',
    amount: '50',
    gasEstimate: 70000,
  },
].map(tx => tx as ShardTransaction);

// Simulate batch
const result = await simulator.simulateTransactions(transactions);

// Analyze results
console.log('Total Transactions:', transactions.length);
console.log('Successful:', result.success);
console.log('Total Time:', result.totalTime, 'ms');
console.log('Throughput:', result.throughput.toFixed(2), 'TPS');
console.log('Total Gas:', result.totalGas);

// Per-shard analysis
result.shardResults.forEach(shard => {
  console.log(`Shard ${shard.shardId}:`);
  console.log(`  Transactions: ${shard.transactionsProcessed}`);
  console.log(`  Processing Time: ${shard.processingTime}ms`);
  console.log(`  Success: ${shard.success}`);
});
```

### Example 3: Shard Information

```typescript
// Get shard configuration
const shards = simulator.getShards();

shards.forEach(shard => {
  console.log(`${shard.name}:`);
  console.log(`  ID: ${shard.id}`);
  console.log(`  Nodes: ${shard.nodeCount}`);
  console.log(`  Throughput: ${shard.throughput} TPS`);
  console.log(`  Latency: ${shard.latency}ms`);
  console.log(`  State Size: ${(shard.stateSize / 1024 / 1024).toFixed(2)} MB`);
});
```

---

## Advanced Examples

### Example 4: Cross-Shard Transaction Analysis

```typescript
// Analyze cross-shard transactions
const transactions: ShardTransaction[] = [
  // Intra-shard (same shard)
  { from: 'erd1aaaa', to: 'erd1bbbb', amount: '100', gasEstimate: 70000 },
  // Cross-shard (different shards)
  { from: 'erd1aaaa', to: 'erd1zzzz', amount: '200', gasEstimate: 70000 },
  { from: 'erd1cccc', to: 'erd1dddd', amount: '50', gasEstimate: 70000 },
].map(tx => tx as ShardTransaction);

const result = await simulator.simulateTransactions(transactions);

// Analyze cross-shard messages
console.log('Cross-Shard Messages:', result.crossShardMessages.length);
result.crossShardMessages.forEach(msg => {
  console.log(`Shard ${msg.fromShard} → Shard ${msg.toShard}:`);
  console.log(`  Type: ${msg.messageType}`);
  console.log(`  Latency: ${msg.latency}ms`);
  console.log(`  Timestamp: ${new Date(msg.timestamp).toISOString()}`);
});

// Analyze state changes
console.log('\nState Changes:', result.stateChanges.length);
result.stateChanges.forEach(change => {
  console.log(`Shard ${change.shardId} - ${change.account}:`);
  console.log('  Before:', change.before);
  console.log('  After:', change.after);
});
```

### Example 5: Adaptive Sharding Simulation

```typescript
// Start with 3 shards
let simulator = new ShardTransactionSimulator({
  shardCount: 3,
  enableAdaptiveSharding: true,
});

console.log('Initial Configuration:');
console.log('  Shards:', simulator.getShards().length);

// Simulate high load - split shards
console.log('\nHigh Load Detected - Splitting Shards...');
simulator.simulateAdaptiveSharding(5);
console.log('  Shards after split:', simulator.getShards().length);

// Simulate transactions with more shards
const highLoadTransactions: ShardTransaction[] = Array.from({ length: 100 }, (_, i) => ({
  from: `erd1from${i}`,
  to: `erd1to${i}`,
  amount: '10',
  gasEstimate: 70000,
})).map(tx => tx as ShardTransaction);

const highLoadResult = await simulator.simulateTransactions(highLoadTransactions);
console.log('  Throughput:', highLoadResult.throughput.toFixed(2), 'TPS');

// Simulate low load - merge shards
console.log('\nLow Load Detected - Merging Shards...');
simulator.simulateAdaptiveSharding(2);
console.log('  Shards after merge:', simulator.getShards().length);
```

### Example 6: Shard Statistics and Optimization

```typescript
// Generate test transactions
const transactions: ShardTransaction[] = Array.from({ length: 50 }, (_, i) => ({
  from: `erd1sender${i}`,
  to: `erd1receiver${i}`,
  amount: '100',
  gasEstimate: 70000,
})).map(tx => tx as ShardTransaction);

// Get statistics
const stats = simulator.getShardStatistics(transactions);

console.log('Shard Distribution:');
Object.entries(stats.shardDistribution).forEach(([shard, count]) => {
  const percentage = ((count / transactions.length) * 100).toFixed(2);
  console.log(`  Shard ${shard}: ${count} transactions (${percentage}%)`);
});

console.log('\nCross-Shard Analysis:');
console.log(`  Cross-Shard Ratio: ${(stats.crossShardRatio * 100).toFixed(2)}%`);
console.log(`  Average Latency: ${stats.averageLatency.toFixed(2)}ms`);

// Optimization suggestions
if (stats.crossShardRatio > 0.3) {
  console.log('\n⚠️  Optimization Suggestion:');
  console.log('  High cross-shard ratio detected.');
  console.log('  Consider grouping transactions by shard to reduce latency.');
}

if (stats.averageLatency > 150) {
  console.log('\n⚠️  Performance Warning:');
  console.log('  High average latency detected.');
  console.log('  Consider optimizing transaction distribution.');
}
```

---

## Real-World Scenarios

### Example 7: Payment Processing System

```typescript
// Simulate a payment processing system
class PaymentProcessor {
  private simulator: ShardTransactionSimulator;

  constructor() {
    this.simulator = new ShardTransactionSimulator({
      shardCount: 3,
      enableAdaptiveSharding: true,
    });
  }

  async processPayments(payments: Array<{ from: string; to: string; amount: string }>) {
    // Convert to transactions
    const transactions: ShardTransaction[] = payments.map(payment => ({
      from: payment.from,
      to: payment.to,
      amount: payment.amount,
      gasEstimate: 70000,
    })).map(tx => tx as ShardTransaction);

    // Simulate
    const result = await this.simulator.simulateTransactions(transactions);

    // Analyze performance
    const stats = this.simulator.getShardStatistics(transactions);

    return {
      success: result.success,
      processed: transactions.length,
      throughput: result.throughput,
      averageLatency: stats.averageLatency,
      crossShardRatio: stats.crossShardRatio,
      errors: result.errors,
    };
  }

  async optimizePaymentBatch(payments: Array<{ from: string; to: string; amount: string }>) {
    // Group payments by destination shard
    const transactions: ShardTransaction[] = payments.map(p => ({
      from: p.from,
      to: p.to,
      amount: p.amount,
      gasEstimate: 70000,
    })).map(tx => tx as ShardTransaction);

    // Simulate to determine shards
    for (const tx of transactions) {
      await this.simulator.simulateTransaction(tx);
    }

    // Group by destination shard
    const byShard = new Map<number, ShardTransaction[]>();
    transactions.forEach(tx => {
      const shard = tx.shardTo!;
      if (!byShard.has(shard)) {
        byShard.set(shard, []);
      }
      byShard.get(shard)!.push(tx);
    });

    // Process each shard group
    const results = [];
    for (const [shard, txs] of byShard) {
      const result = await this.simulator.simulateTransactions(txs);
      results.push({ shard, result });
    }

    return results;
  }
}

// Usage
const processor = new PaymentProcessor();
const payments = [
  { from: 'erd1alice', to: 'erd1bob', amount: '100' },
  { from: 'erd1charlie', to: 'erd1dave', amount: '200' },
];

const result = await processor.processPayments(payments);
console.log('Payment Processing Results:', result);
```

### Example 8: DEX Aggregator Simulation

```typescript
// Simulate a DEX aggregator finding best routes
class DEXAggregator {
  private simulator: ShardTransactionSimulator;

  constructor() {
    this.simulator = new ShardTransactionSimulator({
      shardCount: 3,
    });
  }

  async findBestRoute(
    from: string,
    to: string,
    amount: string,
    routes: Array<{ intermediate: string; expectedOutput: string }>
  ) {
    // Simulate each route
    const routeResults = await Promise.all(
      routes.map(async (route, index) => {
        // Route: from -> intermediate -> to
        const tx1: ShardTransaction = {
          from,
          to: route.intermediate,
          amount,
          gasEstimate: 70000,
        } as ShardTransaction;

        const tx2: ShardTransaction = {
          from: route.intermediate,
          to,
          amount: route.expectedOutput,
          gasEstimate: 70000,
        } as ShardTransaction;

        const result1 = await this.simulator.simulateTransaction(tx1);
        const result2 = await this.simulator.simulateTransaction(tx2);

        return {
          route: index,
          intermediate: route.intermediate,
          totalTime: result1.time + result2.time,
          totalSuccess: result1.success && result2.success,
          output: route.expectedOutput,
          crossShard: tx1.type === 'cross-shard' || tx2.type === 'cross-shard',
        };
      })
    );

    // Find best route (highest output, lowest time, same shard preferred)
    const bestRoute = routeResults
      .filter(r => r.totalSuccess)
      .sort((a, b) => {
        // Prefer same-shard routes
        if (a.crossShard !== b.crossShard) {
          return a.crossShard ? 1 : -1;
        }
        // Then by output
        if (a.output !== b.output) {
          return parseFloat(b.output) - parseFloat(a.output);
        }
        // Finally by time
        return a.totalTime - b.totalTime;
      })[0];

    return bestRoute;
  }
}

// Usage
const aggregator = new DEXAggregator();
const routes = [
  { intermediate: 'erd1dex1', expectedOutput: '95' },
  { intermediate: 'erd1dex2', expectedOutput: '97' },
  { intermediate: 'erd1dex3', expectedOutput: '96' },
];

const bestRoute = await aggregator.findBestRoute(
  'erd1user',
  'erd1target',
  '100',
  routes
);

console.log('Best Route:', bestRoute);
```

---

## Integration Examples

### Example 9: React Component Integration

```typescript
import React, { useState } from 'react';
import { ShardTransactionSimulator } from '@/app/lib/shard-simulator/simulator';
import type { ShardTransaction } from '@/app/lib/shard-simulator/types';

export function MultiverXSimulator() {
  const [simulator] = useState(() => new ShardTransactionSimulator());
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleSimulate = async () => {
    setLoading(true);
    try {
      const transaction: ShardTransaction = {
        from: 'erd1testfrom123456789',
        to: 'erd1testto987654321',
        amount: '100',
        gasEstimate: 70000,
      } as ShardTransaction;

      const simResult = await simulator.simulateTransaction(transaction);
      setResult({ transaction, ...simResult });
    } catch (error) {
      console.error('Simulation failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={handleSimulate} disabled={loading}>
        {loading ? 'Simulating...' : 'Simulate Transaction'}
      </button>
      
      {result && (
        <div>
          <h3>Results</h3>
          <p>Type: {result.transaction.type}</p>
          <p>From Shard: {result.transaction.shardFrom}</p>
          <p>To Shard: {result.transaction.shardTo}</p>
          <p>Success: {result.success ? '✅' : '❌'}</p>
          <p>Time: {result.time}ms</p>
        </div>
      )}
    </div>
  );
}
```

### Example 10: API Route Integration

```typescript
// app/api/multiverx/simulate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ShardTransactionSimulator } from '@/app/lib/shard-simulator/simulator';
import type { ShardTransaction } from '@/app/lib/shard-simulator/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactions, options } = body;

    const simulator = new ShardTransactionSimulator(options || {});
    
    const shardTransactions: ShardTransaction[] = transactions.map((tx: any) => ({
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      gasEstimate: tx.gasEstimate || 70000,
    })) as ShardTransaction[];

    const result = await simulator.simulateTransactions(shardTransactions);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

---

## Best Practices from Examples

1. **Always Check Results**: Verify `success` before proceeding
2. **Handle Errors**: Check `errors` array for issues
3. **Monitor Performance**: Track `throughput` and `latency`
4. **Optimize Distribution**: Use `getShardStatistics()` to optimize
5. **Batch Processing**: Use `simulateTransactions()` for multiple transactions
6. **Adaptive Sharding**: Enable for realistic simulation

---

For more examples and use cases, see the [MultiverX Guide](./MULTIVERX_GUIDE.md).
