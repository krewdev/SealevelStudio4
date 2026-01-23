/**
 * Shard Transaction Simulator Types
 * 
 * Types for simulating transactions across multiple shards
 * (e.g., MultiversX adaptive state sharding)
 */

export interface ShardConfig {
  id: number;
  name: string;
  nodeCount: number;
  throughput: number; // transactions per second
  latency: number; // milliseconds
  stateSize: number; // bytes
}

export interface ShardTransaction {
  id: string;
  from: string;
  to: string;
  amount: string;
  shardFrom: number;
  shardTo: number;
  type: 'intra-shard' | 'cross-shard';
  timestamp: number;
  gasEstimate: number;
}

export interface ShardSimulationResult {
  success: boolean;
  totalTime: number; // milliseconds
  shardResults: ShardResult[];
  crossShardMessages: CrossShardMessage[];
  stateChanges: StateChange[];
  errors: string[];
  warnings: string[];
  totalGas: number;
  throughput: number; // transactions per second
}

export interface ShardResult {
  shardId: number;
  transactionsProcessed: number;
  processingTime: number;
  success: boolean;
  errors: string[];
  stateUpdates: number;
}

export interface CrossShardMessage {
  fromShard: number;
  toShard: number;
  messageType: 'state-sync' | 'transaction-forward' | 'confirmation';
  latency: number;
  timestamp: number;
}

export interface StateChange {
  shardId: number;
  account: string;
  before: any;
  after: any;
  timestamp: number;
}

export interface ShardSimulationOptions {
  shardCount?: number;
  enableAdaptiveSharding?: boolean;
  crossShardLatency?: number;
  nodeReshuffleEpoch?: number;
  simulateNetworkDelay?: boolean;
  maxTransactionsPerShard?: number;
}
