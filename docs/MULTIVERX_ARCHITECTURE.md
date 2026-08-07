# MultiverX Architecture Deep Dive

## Table of Contents

1. [Introduction](#introduction)
2. [Sharding Model](#sharding-model)
3. [Consensus Mechanism](#consensus-mechanism)
4. [Transaction Processing](#transaction-processing)
5. [State Management](#state-management)
6. [Adaptive Sharding](#adaptive-sharding)
7. [Security Model](#security-model)
8. [Performance Characteristics](#performance-characteristics)
9. [Comparison with Other Blockchains](#comparison-with-other-blockchains)

---

## Introduction

MultiverX (formerly Elrond Network) is a blockchain platform that achieves high throughput and low latency through innovative sharding technology. This document provides a deep dive into its architecture.

### Key Innovations

1. **Adaptive State Sharding**: Dynamic shard reorganization
2. **Secure Proof of Stake (SPoS)**: Fast, secure consensus
3. **Arbitrary Message Passing**: Efficient cross-shard communication
4. **WebAssembly Smart Contracts**: High-performance execution

---

## Sharding Model

### Three-Tier Architecture

MultiverX uses a three-tier sharding architecture:

```
┌─────────────────────────────────────────────────────┐
│              METACHAIN SHARD                        │
│  - Network coordination                             │
│  - Cross-shard transaction management              │
│  - Validator management                            │
└─────────────────────────────────────────────────────┘
                    │
        ┌───────────┼───────────┐
        │           │           │
┌───────▼───┐ ┌────▼────┐ ┌───▼──────┐
│ EXECUTION │ │EXECUTION│ │EXECUTION │
│  SHARD 0  │ │ SHARD 1 │ │ SHARD 2  │
│           │ │         │ │          │
│ - Process │ │ - Process│ │ - Process│
│   txs     │ │   txs   │ │   txs    │
│ - State   │ │ - State │ │ - State  │
│ - Smart   │ │ - Smart │ │ - Smart  │
│   contracts│ │ contracts│ │ contracts│
└───────────┘ └─────────┘ └──────────┘
```

### Shard Assignment

Addresses are assigned to shards using a deterministic hash function:

```typescript
function getShardForAddress(address: string, shardCount: number): number {
  // Hash the address
  let hash = 0;
  for (let i = 0; i < address.length; i++) {
    hash = ((hash << 5) - hash) + address.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Assign to shard
  return Math.abs(hash) % shardCount;
}
```

**Properties:**
- **Deterministic**: Same address always maps to same shard
- **Uniform Distribution**: Addresses evenly distributed across shards
- **Fast Lookup**: O(1) shard assignment

### Shard Configuration

Each shard typically has:
- **50-100 Validator Nodes**: Process transactions
- **1000-1500 TPS**: Throughput per shard
- **50-100ms Latency**: Transaction processing time
- **1-1.5 MB State**: Per shard state size

---

## Consensus Mechanism

### Secure Proof of Stake (SPoS)

MultiverX uses a custom consensus mechanism:

#### Key Features

1. **Rating System**
   - Validators have a rating score
   - Based on uptime, performance, stake
   - Higher rating = more selection probability

2. **Validator Selection**
   - Random selection weighted by rating
   - Reshuffled each epoch
   - Prevents validator collusion

3. **Fast Finality**
   - 6-second block time
   - Immediate finality
   - No forks

#### Consensus Process

```
1. Validator Selection
   └─> Random selection based on rating + stake

2. Block Proposal
   └─> Selected validator proposes block

3. Block Validation
   └─> Other validators validate block

4. Block Finalization
   └─> Block added to chain (final)
```

### Epochs

- **Duration**: ~24 hours
- **Purpose**: Validator reshuffling
- **Effect**: Validators move between shards
- **Security**: Prevents long-term shard takeover

---

## Transaction Processing

### Transaction Lifecycle

#### Intra-Shard Transaction

```
1. User submits transaction
   └─> Transaction sent to shard

2. Shard processes transaction
   ├─> Validate signature
   ├─> Check balance
   ├─> Execute transaction
   └─> Update state

3. Transaction confirmed
   └─> Block finalized (6 seconds)
```

**Time**: ~50-100ms  
**Gas**: Lower (single shard)

#### Cross-Shard Transaction

```
1. User submits transaction
   └─> Transaction sent to source shard

2. Source shard processes
   ├─> Validate signature
   ├─> Check balance
   ├─> Deduct amount
   └─> Create cross-shard message

3. Cross-shard message sent
   └─> Message forwarded to destination shard

4. Destination shard processes
   ├─> Validate message
   ├─> Credit amount
   └─> Update state

5. Confirmation sent back
   └─> Source shard confirms completion

6. Transaction finalized
   └─> Both shards updated
```

**Time**: ~100-200ms  
**Gas**: Higher (two shards + message)

### Transaction Types

1. **Simple Transfer**
   - EGLD transfer between accounts
   - Gas: ~70,000

2. **Smart Contract Call**
   - Execute WASM contract
   - Gas: Variable (500,000+)

3. **Delegation**
   - Stake EGLD with validator
   - Gas: ~500,000

4. **Undelegation**
   - Unstake EGLD
   - Gas: ~500,000

---

## State Management

### State Structure

Each shard maintains its own state:

```
Shard State:
├─ Account Balances
│  └─> Address → Balance mapping
├─ Smart Contract State
│  └─> Contract → Storage mapping
├─ Validator State
│  └─> Validator → Stake mapping
└─ Cross-Shard State
   └─> Pending cross-shard messages
```

### State Synchronization

#### Within Shard
- **Immediate**: State updated synchronously
- **Consistent**: All nodes see same state
- **Fast**: No network delay

#### Across Shards
- **Asynchronous**: Via cross-shard messages
- **Eventual Consistency**: State converges
- **Ordered**: Messages processed in order

### State Sharding

State is partitioned by shard:

- **Account Sharding**: Accounts assigned to shards
- **Contract Sharding**: Contracts assigned to shards
- **Data Sharding**: Storage distributed across shards

**Benefits:**
- Reduced state size per shard
- Parallel processing
- Horizontal scaling

---

## Adaptive Sharding

### Dynamic Shard Reorganization

MultiverX can dynamically adjust the number of shards:

#### Shard Splitting

**Trigger**: High transaction volume

```
Before: 3 shards
├─ Shard 0: 5000 TPS (overloaded)
├─ Shard 1: 3000 TPS
└─ Shard 2: 2000 TPS

After: 5 shards
├─ Shard 0: 2000 TPS
├─ Shard 1: 2000 TPS
├─ Shard 2: 2000 TPS
├─ Shard 3: 2000 TPS
└─ Shard 4: 2000 TPS
```

**Process:**
1. Network detects overload
2. Validators vote on split
3. State redistributed
4. New shards activated

#### Shard Merging

**Trigger**: Low transaction volume

```
Before: 5 shards (underutilized)
After: 3 shards (optimal)
```

**Process:**
1. Network detects underutilization
2. Validators vote on merge
3. State consolidated
4. Shards merged

### Benefits

- **Optimal Resource Usage**: Shards match demand
- **Cost Efficiency**: Fewer shards = lower costs
- **Performance**: Right-sized for load
- **Scalability**: Grows with demand

---

## Security Model

### Security Guarantees

1. **Byzantine Fault Tolerance**
   - Tolerates up to 1/3 malicious validators
   - Same security as non-sharded chains

2. **Shard Isolation**
   - Shard compromise doesn't affect others
   - Limited blast radius

3. **Cross-Shard Security**
   - Atomic cross-shard transactions
   - No double-spending possible

### Attack Vectors & Mitigations

#### 1. Single Shard Takeover

**Attack**: Control 2/3 of one shard

**Mitigation**:
- Validator reshuffling each epoch
- Rating system prevents long-term control
- Metachain monitors shard health

#### 2. Cross-Shard Double Spending

**Attack**: Spend same funds in multiple shards

**Mitigation**:
- Atomic cross-shard transactions
- Source shard locks funds
- Destination shard validates before crediting

#### 3. Validator Collusion

**Attack**: Validators collude to censor transactions

**Mitigation**:
- Random validator selection
- Rating system rewards honest behavior
- Epoch-based reshuffling

---

## Performance Characteristics

### Throughput

- **Per Shard**: 1,000-1,500 TPS
- **Network Total**: 3,000-4,500 TPS (3 shards)
- **Theoretical Maximum**: 15,000+ TPS (with more shards)

### Latency

- **Intra-Shard**: 50-100ms
- **Cross-Shard**: 100-200ms
- **Finality**: 6 seconds

### Scalability

- **Horizontal**: Add more shards
- **Vertical**: Optimize per-shard performance
- **Adaptive**: Automatically adjust shard count

### Comparison

| Metric | MultiverX | Ethereum | Solana |
|--------|-----------|----------|--------|
| TPS | 3,000-15,000 | 15-30 | 2,000-3,000 |
| Finality | 6s | ~15s | ~400ms |
| Fees | $0.001 | $1-50 | $0.00025 |
| Sharding | Yes | Planned | No |

---

## Comparison with Other Blockchains

### vs. Ethereum

**MultiverX Advantages:**
- ✅ Native sharding (Ethereum planned)
- ✅ Higher throughput
- ✅ Lower fees
- ✅ Faster finality

**Ethereum Advantages:**
- ✅ Larger ecosystem
- ✅ More developers
- ✅ More dApps

### vs. Solana

**MultiverX Advantages:**
- ✅ Sharding (Solana doesn't shard)
- ✅ Lower hardware requirements
- ✅ Better decentralization

**Solana Advantages:**
- ✅ Higher single-chain throughput
- ✅ Lower latency
- ✅ Larger ecosystem

### vs. Polkadot

**MultiverX Advantages:**
- ✅ Simpler architecture
- ✅ Unified state
- ✅ Easier development

**Polkadot Advantages:**
- ✅ True interoperability
- ✅ Parachain flexibility
- ✅ Governance model

---

## Implementation in Sealevel Studio

### Shard Simulator Features

The Sealevel Studio shard simulator implements:

1. **Shard Assignment**: Hash-based address-to-shard mapping
2. **Transaction Simulation**: Intra-shard and cross-shard
3. **Adaptive Sharding**: Dynamic shard reorganization
4. **State Tracking**: State changes across shards
5. **Performance Metrics**: Throughput, latency, gas

### Usage Example

```typescript
// Create simulator
const simulator = new ShardTransactionSimulator({
  shardCount: 3,
  enableAdaptiveSharding: true,
});

// Simulate transaction
const result = await simulator.simulateTransaction({
  from: 'erd1...',
  to: 'erd1...',
  amount: '100',
  gasEstimate: 70000,
});

// Analyze results
console.log('Type:', result.type); // 'intra-shard' or 'cross-shard'
console.log('Time:', result.time, 'ms');
console.log('Success:', result.success);
```

---

## Conclusion

MultiverX's architecture provides:

- **High Performance**: Through sharding and optimization
- **Scalability**: Horizontal scaling via adaptive sharding
- **Security**: Byzantine fault tolerance
- **Efficiency**: Low fees and fast finality

The shard simulator in Sealevel Studio helps developers understand and optimize for this architecture.

---

**References:**
- [MultiverX Whitepaper](https://multiversx.com/whitepaper)
- [MultiverX Documentation](https://docs.multiversx.com/)
- [Shard Simulator Source](../app/lib/shard-simulator/)

**Last Updated**: 2026-01-23
