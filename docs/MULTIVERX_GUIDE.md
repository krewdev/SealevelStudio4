# MultiverX Blockchain Integration Guide

## Table of Contents

1. [Overview](#overview)
2. [What is MultiverX?](#what-is-multiverx)
3. [MultiverX Architecture](#multiverx-architecture)
4. [Integration in Sealevel Studio](#integration-in-sealevel-studio)
5. [Shard Simulator](#shard-simulator)
6. [Getting Started](#getting-started)
7. [API Reference](#api-reference)
8. [Examples](#examples)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

MultiverX (formerly Elrond) is a high-performance blockchain platform that uses adaptive state sharding to achieve high throughput and low latency. Sealevel Studio provides comprehensive support for MultiverX, including a shard transaction simulator that allows developers to test and understand how transactions work across sharded networks.

### Key Features

- ✅ **Full MultiverX Support**: Integrated as a first-class blockchain option
- ✅ **Shard Simulator**: Test transactions across shards before deployment
- ✅ **Cross-Shard Transactions**: Understand and simulate cross-shard operations
- ✅ **Adaptive Sharding**: Simulate dynamic shard reorganization
- ✅ **Transaction Builder**: Build MultiverX transactions visually
- ✅ **State Management**: Track state changes across shards

---

## What is MultiverX?

MultiverX (formerly Elrond Network) is a blockchain platform designed for high throughput and low latency through:

### Core Concepts

1. **Adaptive State Sharding**
   - The network dynamically splits into multiple shards
   - Each shard processes transactions independently
   - Shards can merge or split based on network load
   - Enables horizontal scaling

2. **Secure Proof of Stake (SPoS)**
   - Validators are selected based on stake and rating
   - Fast finality (6 seconds)
   - Energy efficient

3. **Native Token: EGLD**
   - Used for transaction fees
   - Staking rewards
   - Governance

4. **Smart Contracts**
   - WebAssembly (WASM) based
   - Rust, C/C++, TypeScript support
   - Gas-efficient execution

### Why MultiverX?

- **High Throughput**: 15,000+ TPS (theoretical)
- **Low Latency**: 6-second finality
- **Low Fees**: Fraction of a cent per transaction
- **Scalability**: Horizontal scaling through sharding
- **Developer Friendly**: Multiple programming languages

---

## MultiverX Architecture

### Sharding Model

MultiverX uses **adaptive state sharding** with three types of shards:

1. **Metachain Shard**
   - Coordinates the network
   - Handles cross-shard transactions
   - Manages validators

2. **Execution Shards**
   - Process transactions
   - Maintain state
   - Run smart contracts
   - Typically 3 shards (can adapt)

3. **Shard Assignment**
   - Addresses are assigned to shards via hash
   - Same shard = faster transactions
   - Different shards = cross-shard (higher latency)

### Transaction Types

#### Intra-Shard Transactions
- **Definition**: Both sender and receiver are in the same shard
- **Latency**: ~50-100ms
- **Cost**: Lower gas fees
- **Example**: Alice (Shard 0) → Bob (Shard 0)

#### Cross-Shard Transactions
- **Definition**: Sender and receiver are in different shards
- **Latency**: ~100-200ms (includes cross-shard message)
- **Cost**: Higher gas fees
- **Process**:
  1. Transaction processed on source shard
  2. Cross-shard message sent
  3. Transaction processed on destination shard
  4. Confirmation sent back
- **Example**: Alice (Shard 0) → Bob (Shard 1)

### Adaptive Sharding

MultiverX can dynamically adjust the number of shards:

- **Shard Splitting**: When load increases, shards can split
- **Shard Merging**: When load decreases, shards can merge
- **Automatic**: Network adapts based on transaction volume
- **Benefits**: Optimal resource utilization

---

## Integration in Sealevel Studio

### Blockchain Selection

MultiverX is available as a blockchain option in Sealevel Studio:

```typescript
// In LandingPage.tsx
export type BlockchainType = 
  | 'polkadot' 
  | 'solana' 
  | 'ethereum' 
  | 'multiverx'  // ← MultiverX support
  | ...;
```

### Configuration

MultiverX is configured with:

- **Name**: MultiversX
- **Status**: Available
- **Features**: 
  - Transaction Builder
  - Shard Simulator
  - Cross-Shard support
  - Full Support

### Storage

MultiverX selection is persisted in localStorage:

```typescript
localStorage.setItem('sealevel-blockchain', 'multiverx');
```

---

## Shard Simulator

The Shard Transaction Simulator is a core feature that allows you to:

1. **Test Transactions**: Simulate transactions before deploying
2. **Understand Sharding**: See how shards affect transaction processing
3. **Optimize**: Identify which shards your addresses belong to
4. **Debug**: Understand cross-shard transaction flow

### Architecture

The simulator implements MultiverX's sharding model:

```
┌─────────────────────────────────────────┐
│      Shard Transaction Simulator        │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐ │
│  │ Shard 0 │  │ Shard 1 │  │ Shard 2 │ │
│  │         │  │         │  │         │ │
│  │ Nodes:  │  │ Nodes:  │  │ Nodes:  │ │
│  │ 50-100  │  │ 50-100  │  │ 50-100  │ │
│  │ TPS:    │  │ TPS:    │  │ TPS:    │ │
│  │ 1000+   │  │ 1000+   │  │ 1000+   │ │
│  └─────────┘  └─────────┘  └─────────┘ │
│      │            │            │       │
│      └────────────┼────────────┘       │
│                   │                    │
│         Cross-Shard Messages           │
│                                         │
└─────────────────────────────────────────┘
```

### Key Components

1. **ShardTransactionSimulator**: Main simulator class
2. **ShardConfig**: Configuration for each shard
3. **ShardTransaction**: Transaction to simulate
4. **ShardSimulationResult**: Results of simulation

---

## Getting Started

### Installation

The shard simulator is already included in Sealevel Studio. No additional installation needed.

### Basic Usage

```typescript
import { ShardTransactionSimulator } from '@/app/lib/shard-simulator/simulator';
import type { ShardTransaction } from '@/app/lib/shard-simulator/types';

// Create simulator with 3 shards
const simulator = new ShardTransactionSimulator({
  shardCount: 3,
  enableAdaptiveSharding: true,
  crossShardLatency: 100, // milliseconds
});

// Create a transaction
const transaction: ShardTransaction = {
  from: 'erd1testfrom123456789',
  to: 'erd1testto987654321',
  amount: '100',
  gasEstimate: 70000,
} as ShardTransaction;

// Simulate the transaction
const result = await simulator.simulateTransaction(transaction);

console.log('Success:', result.success);
console.log('Time:', result.time, 'ms');
console.log('Type:', transaction.type); // 'intra-shard' or 'cross-shard'
```

### Configuration Options

```typescript
interface ShardSimulationOptions {
  shardCount?: number;              // Number of shards (default: 3)
  enableAdaptiveSharding?: boolean;  // Enable adaptive sharding (default: true)
  crossShardLatency?: number;       // Cross-shard message latency in ms (default: 100)
  nodeReshuffleEpoch?: number;      // Epoch for node reshuffling (default: 1000)
  simulateNetworkDelay?: boolean;   // Simulate network delays (default: true)
  maxTransactionsPerShard?: number; // Max transactions per shard (default: 1000)
}
```

---

## API Reference

### ShardTransactionSimulator

#### Constructor

```typescript
new ShardTransactionSimulator(options?: ShardSimulationOptions)
```

Creates a new shard simulator instance.

**Parameters:**
- `options` (optional): Configuration options

**Example:**
```typescript
const simulator = new ShardTransactionSimulator({
  shardCount: 3,
  enableAdaptiveSharding: true,
});
```

#### Methods

##### `simulateTransaction(transaction: ShardTransaction)`

Simulates a single transaction across shards.

**Parameters:**
- `transaction`: The transaction to simulate

**Returns:**
```typescript
Promise<{
  success: boolean;
  time: number;      // Processing time in milliseconds
  errors: string[];  // Any errors encountered
}>
```

**Example:**
```typescript
const result = await simulator.simulateTransaction(transaction);
if (result.success) {
  console.log(`Transaction completed in ${result.time}ms`);
} else {
  console.error('Transaction failed:', result.errors);
}
```

##### `simulateTransactions(transactions: ShardTransaction[], options?: ShardSimulationOptions)`

Simulates multiple transactions in batch.

**Parameters:**
- `transactions`: Array of transactions to simulate
- `options` (optional): Override default options

**Returns:**
```typescript
Promise<ShardSimulationResult> {
  success: boolean;
  totalTime: number;
  shardResults: ShardResult[];
  crossShardMessages: CrossShardMessage[];
  stateChanges: StateChange[];
  errors: string[];
  warnings: string[];
  totalGas: number;
  throughput: number; // transactions per second
}
```

**Example:**
```typescript
const transactions: ShardTransaction[] = [
  { from: 'erd1...', to: 'erd1...', amount: '100', gasEstimate: 70000 },
  { from: 'erd1...', to: 'erd1...', amount: '200', gasEstimate: 70000 },
];

const result = await simulator.simulateTransactions(transactions);
console.log(`Processed ${transactions.length} transactions`);
console.log(`Throughput: ${result.throughput} TPS`);
```

##### `getShards()`

Returns the current shard configuration.

**Returns:**
```typescript
ShardConfig[] {
  id: number;
  name: string;
  nodeCount: number;
  throughput: number;  // TPS
  latency: number;     // milliseconds
  stateSize: number;   // bytes
}
```

**Example:**
```typescript
const shards = simulator.getShards();
shards.forEach(shard => {
  console.log(`${shard.name}: ${shard.throughput} TPS`);
});
```

##### `simulateAdaptiveSharding(newShardCount: number)`

Simulates adaptive sharding (shard merging/splitting).

**Parameters:**
- `newShardCount`: New number of shards (1-10)

**Example:**
```typescript
// Split shards (increase from 3 to 5)
simulator.simulateAdaptiveSharding(5);

// Merge shards (decrease from 5 to 2)
simulator.simulateAdaptiveSharding(2);
```

##### `getShardStatistics(transactions: ShardTransaction[])`

Returns statistics about shard distribution.

**Parameters:**
- `transactions`: Array of transactions to analyze

**Returns:**
```typescript
{
  shardDistribution: Record<number, number>;  // Transactions per shard
  crossShardRatio: number;                    // Ratio of cross-shard transactions
  averageLatency: number;                     // Average latency in ms
}
```

**Example:**
```typescript
const stats = simulator.getShardStatistics(transactions);
console.log('Shard distribution:', stats.shardDistribution);
console.log('Cross-shard ratio:', stats.crossShardRatio);
console.log('Average latency:', stats.averageLatency, 'ms');
```

### Types

#### ShardTransaction

```typescript
interface ShardTransaction {
  id?: string;              // Optional transaction ID
  from: string;             // Sender address (erd1...)
  to: string;               // Receiver address (erd1...)
  amount: string;           // Amount to transfer
  shardFrom?: number;       // Auto-assigned: source shard
  shardTo?: number;         // Auto-assigned: destination shard
  type?: 'intra-shard' | 'cross-shard';  // Auto-determined
  timestamp?: number;       // Auto-assigned
  gasEstimate: number;      // Gas estimate
}
```

#### ShardConfig

```typescript
interface ShardConfig {
  id: number;               // Shard ID (0, 1, 2, ...)
  name: string;              // Shard name
  nodeCount: number;         // Number of nodes (50-100)
  throughput: number;         // Transactions per second (1000-1500)
  latency: number;           // Latency in milliseconds (50-100ms)
  stateSize: number;         // State size in bytes (1-1.5 MB)
}
```

#### ShardSimulationResult

```typescript
interface ShardSimulationResult {
  success: boolean;                    // Overall success
  totalTime: number;                   // Total simulation time (ms)
  shardResults: ShardResult[];         // Results per shard
  crossShardMessages: CrossShardMessage[];  // Cross-shard messages
  stateChanges: StateChange[];         // State changes
  errors: string[];                    // Errors encountered
  warnings: string[];                  // Warnings
  totalGas: number;                    // Total gas used
  throughput: number;                  // Transactions per second
}
```

---

## Examples

### Example 1: Basic Transaction Simulation

```typescript
import { ShardTransactionSimulator } from '@/app/lib/shard-simulator/simulator';

// Create simulator
const simulator = new ShardTransactionSimulator({
  shardCount: 3,
});

// Simulate a simple transfer
const transaction = {
  from: 'erd1testfrom123456789',
  to: 'erd1testto987654321',
  amount: '100',
  gasEstimate: 70000,
} as ShardTransaction;

const result = await simulator.simulateTransaction(transaction);

console.log('Transaction Type:', transaction.type);
console.log('Success:', result.success);
console.log('Processing Time:', result.time, 'ms');
console.log('From Shard:', transaction.shardFrom);
console.log('To Shard:', transaction.shardTo);
```

### Example 2: Batch Transaction Simulation

```typescript
// Simulate multiple transactions
const transactions: ShardTransaction[] = [
  { from: 'erd1alice', to: 'erd1bob', amount: '100', gasEstimate: 70000 },
  { from: 'erd1charlie', to: 'erd1dave', amount: '200', gasEstimate: 70000 },
  { from: 'erd1eve', to: 'erd1frank', amount: '50', gasEstimate: 70000 },
];

const result = await simulator.simulateTransactions(transactions);

console.log('Total Transactions:', transactions.length);
console.log('Successful:', result.success);
console.log('Total Time:', result.totalTime, 'ms');
console.log('Throughput:', result.throughput.toFixed(2), 'TPS');
console.log('Total Gas:', result.totalGas);

// Analyze shard distribution
result.shardResults.forEach(shard => {
  console.log(`Shard ${shard.shardId}: ${shard.transactionsProcessed} transactions`);
});
```

### Example 3: Cross-Shard Transaction Analysis

```typescript
// Analyze cross-shard transactions
const transactions: ShardTransaction[] = [
  // Intra-shard (same shard)
  { from: 'erd1aaaa', to: 'erd1bbbb', amount: '100', gasEstimate: 70000 },
  // Cross-shard (different shards)
  { from: 'erd1aaaa', to: 'erd1zzzz', amount: '200', gasEstimate: 70000 },
];

const result = await simulator.simulateTransactions(transactions);

// Count cross-shard messages
console.log('Cross-shard messages:', result.crossShardMessages.length);
result.crossShardMessages.forEach(msg => {
  console.log(`Shard ${msg.fromShard} → Shard ${msg.toShard}: ${msg.latency}ms`);
});

// Analyze state changes
result.stateChanges.forEach(change => {
  console.log(`Shard ${change.shardId}: ${change.account}`);
  console.log('  Before:', change.before);
  console.log('  After:', change.after);
});
```

### Example 4: Adaptive Sharding Simulation

```typescript
// Start with 3 shards
const simulator = new ShardTransactionSimulator({
  shardCount: 3,
  enableAdaptiveSharding: true,
});

console.log('Initial shards:', simulator.getShards().length);

// Simulate high load - split shards
simulator.simulateAdaptiveSharding(5);
console.log('After split:', simulator.getShards().length);

// Simulate low load - merge shards
simulator.simulateAdaptiveSharding(2);
console.log('After merge:', simulator.getShards().length);
```

### Example 5: Shard Statistics

```typescript
const transactions: ShardTransaction[] = [
  { from: 'erd1a', to: 'erd1b', amount: '100', gasEstimate: 70000 },
  { from: 'erd1c', to: 'erd1d', amount: '200', gasEstimate: 70000 },
  { from: 'erd1e', to: 'erd1f', amount: '50', gasEstimate: 70000 },
];

const stats = simulator.getShardStatistics(transactions);

console.log('Shard Distribution:');
Object.entries(stats.shardDistribution).forEach(([shard, count]) => {
  console.log(`  Shard ${shard}: ${count} transactions`);
});

console.log('Cross-shard Ratio:', (stats.crossShardRatio * 100).toFixed(2) + '%');
console.log('Average Latency:', stats.averageLatency.toFixed(2), 'ms');
```

---

## Best Practices

### 1. Shard Optimization

**Tip**: Design your application to minimize cross-shard transactions when possible.

```typescript
// ❌ Bad: Many cross-shard transactions
const transactions = addresses.map(addr => ({
  from: 'erd1sender',
  to: addr,  // Different shards = cross-shard
  amount: '10',
  gasEstimate: 70000,
}));

// ✅ Better: Batch transactions to same shard
const shardGroups = groupByShard(addresses);
shardGroups.forEach((addresses, shard) => {
  // Process all addresses in same shard together
});
```

### 2. Gas Estimation

Always provide accurate gas estimates:

```typescript
// Standard transfer: ~70,000 gas
const standardTransfer = {
  gasEstimate: 70000,
};

// Smart contract call: ~500,000+ gas
const contractCall = {
  gasEstimate: 500000,
};
```

### 3. Error Handling

Always check for errors:

```typescript
const result = await simulator.simulateTransaction(transaction);

if (!result.success) {
  console.error('Transaction failed:', result.errors);
  // Handle errors appropriately
} else {
  console.log('Transaction succeeded in', result.time, 'ms');
}
```

### 4. Batch Processing

Use batch simulation for multiple transactions:

```typescript
// ✅ Good: Batch simulation
const result = await simulator.simulateTransactions(transactions);

// ❌ Bad: Sequential simulation
for (const tx of transactions) {
  await simulator.simulateTransaction(tx);
}
```

### 5. Monitoring

Monitor shard statistics:

```typescript
const stats = simulator.getShardStatistics(transactions);

if (stats.crossShardRatio > 0.5) {
  console.warn('High cross-shard ratio - consider optimization');
}

if (stats.averageLatency > 150) {
  console.warn('High latency detected');
}
```

---

## Troubleshooting

### Common Issues

#### Issue: Transaction always fails

**Solution**: Check gas estimate and balance:

```typescript
// Ensure sufficient gas
const transaction = {
  gasEstimate: 70000,  // Minimum for standard transfer
  // ...
};

// Check if addresses are valid
if (!transaction.from.startsWith('erd1')) {
  throw new Error('Invalid MultiverX address format');
}
```

#### Issue: High cross-shard ratio

**Solution**: Optimize address distribution:

```typescript
// Analyze shard distribution
const stats = simulator.getShardStatistics(transactions);

if (stats.crossShardRatio > 0.3) {
  // Consider grouping transactions by shard
  // Or use a different address generation strategy
}
```

#### Issue: Simulator not initializing

**Solution**: Check configuration:

```typescript
// Ensure valid shard count
const simulator = new ShardTransactionSimulator({
  shardCount: 3,  // Must be between 1 and 10
});
```

### Performance Tips

1. **Use Batch Simulation**: Process multiple transactions together
2. **Cache Shard Assignments**: Don't recalculate shard for same address
3. **Monitor Statistics**: Use `getShardStatistics()` to optimize
4. **Adaptive Sharding**: Enable for realistic simulation

---

## Additional Resources

### MultiverX Official Documentation

- [MultiverX Documentation](https://docs.multiversx.com/)
- [MultiverX Developer Portal](https://devnet-wallet.multiversx.com/)
- [MultiverX GitHub](https://github.com/multiversx)

### Sealevel Studio Resources

- [Shard Simulator Source Code](../app/lib/shard-simulator/)
- [MultiverX Test Suite](../scripts/test-multiverx.ts)
- [Test Results](../TEST_RESULTS_MULTIVERX.md)

---

## Conclusion

MultiverX integration in Sealevel Studio provides powerful tools for:

- ✅ Understanding sharded blockchain architecture
- ✅ Testing transactions before deployment
- ✅ Optimizing cross-shard operations
- ✅ Simulating adaptive sharding behavior

The shard simulator is a valuable tool for developers working with MultiverX, providing insights into how transactions are processed across shards and helping optimize application performance.

For questions or issues, please refer to the troubleshooting section or check the test suite for examples.

---

**Last Updated**: 2026-01-23  
**Version**: 1.0.0
