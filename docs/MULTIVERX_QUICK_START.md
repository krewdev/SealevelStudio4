# MultiverX Quick Start Guide

## 5-Minute Quick Start

Get started with MultiverX in Sealevel Studio in just 5 minutes!

### Step 1: Select MultiverX

1. Open Sealevel Studio
2. On the landing page, select **MultiversX** from the blockchain selector
3. Click "Get Started"

### Step 2: Use the Shard Simulator

```typescript
import { ShardTransactionSimulator } from '@/app/lib/shard-simulator/simulator';

// Create simulator
const simulator = new ShardTransactionSimulator();

// Simulate a transaction
const result = await simulator.simulateTransaction({
  from: 'erd1testfrom123456789',
  to: 'erd1testto987654321',
  amount: '100',
  gasEstimate: 70000,
});

console.log('Success:', result.success);
console.log('Time:', result.time, 'ms');
```

### Step 3: Understand Results

- **Intra-Shard**: Same shard = faster (~50-100ms)
- **Cross-Shard**: Different shards = slower (~100-200ms)
- **Success**: Transaction succeeded
- **Time**: Processing time in milliseconds

## Common Use Cases

### 1. Test Transaction Before Sending

```typescript
const simulator = new ShardTransactionSimulator();
const result = await simulator.simulateTransaction(transaction);

if (result.success) {
  // Safe to send
  await sendTransaction(transaction);
} else {
  // Check errors
  console.error(result.errors);
}
```

### 2. Optimize Shard Distribution

```typescript
const stats = simulator.getShardStatistics(transactions);

if (stats.crossShardRatio > 0.3) {
  // Too many cross-shard transactions
  // Consider grouping by shard
}
```

### 3. Batch Process Transactions

```typescript
const result = await simulator.simulateTransactions(transactions);
console.log('Throughput:', result.throughput, 'TPS');
```

## Key Concepts

### Shards
- **3 Shards**: Default configuration
- **Each Shard**: Processes transactions independently
- **Shard Assignment**: Based on address hash

### Transaction Types
- **Intra-Shard**: Same shard (faster)
- **Cross-Shard**: Different shards (slower)

### Adaptive Sharding
- **Automatic**: Shards adjust based on load
- **Splitting**: More shards when busy
- **Merging**: Fewer shards when quiet

## Next Steps

- 📖 Read the [Full MultiverX Guide](./MULTIVERX_GUIDE.md)
- 🏗️ Explore [MultiverX Architecture](./MULTIVERX_ARCHITECTURE.md)
- 🧪 Run the [Test Suite](../scripts/test-multiverx.ts)

## Need Help?

- Check the [Troubleshooting](./MULTIVERX_GUIDE.md#troubleshooting) section
- Review [Examples](./MULTIVERX_GUIDE.md#examples)
- See [API Reference](./MULTIVERX_GUIDE.md#api-reference)

---

**Ready to dive deeper?** → [MultiverX Guide](./MULTIVERX_GUIDE.md)
