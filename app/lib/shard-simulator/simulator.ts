/**
 * Shard Transaction Simulator
 * 
 * Simulates transactions across multiple shards with adaptive state sharding
 * Based on MultiversX architecture
 */

import {
  ShardConfig,
  ShardTransaction,
  ShardSimulationResult,
  ShardResult,
  CrossShardMessage,
  StateChange,
  ShardSimulationOptions,
} from './types';

export class ShardTransactionSimulator {
  private shards: ShardConfig[];
  private defaultOptions: Required<ShardSimulationOptions> = {
    shardCount: 3,
    enableAdaptiveSharding: true,
    crossShardLatency: 100,
    nodeReshuffleEpoch: 1000,
    simulateNetworkDelay: true,
    maxTransactionsPerShard: 1000,
  };

  constructor(options?: ShardSimulationOptions) {
    const opts = { ...this.defaultOptions, ...options };
    this.shards = this.initializeShards(opts.shardCount);
  }

  /**
   * Initialize shards with default configuration
   */
  private initializeShards(count: number): ShardConfig[] {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      name: `Shard ${i}`,
      nodeCount: 50 + Math.floor(Math.random() * 50), // 50-100 nodes per shard
      throughput: 1000 + Math.floor(Math.random() * 500), // 1000-1500 TPS
      latency: 50 + Math.floor(Math.random() * 50), // 50-100ms
      stateSize: 1000000 + Math.floor(Math.random() * 500000), // 1-1.5 MB
    }));
  }

  /**
   * Determine which shard an address belongs to
   */
  private getShardForAddress(address: string): number {
    // Simple hash-based shard assignment
    let hash = 0;
    for (let i = 0; i < address.length; i++) {
      hash = ((hash << 5) - hash) + address.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % this.shards.length;
  }

  /**
   * Simulate a single transaction
   */
  async simulateTransaction(
    transaction: ShardTransaction
  ): Promise<{ success: boolean; time: number; errors: string[] }> {
    const errors: string[] = [];
    let time = 0;

    // Determine shards
    const fromShard = this.getShardForAddress(transaction.from);
    const toShard = this.getShardForAddress(transaction.to);

    transaction.shardFrom = fromShard;
    transaction.shardTo = toShard;
    transaction.type = fromShard === toShard ? 'intra-shard' : 'cross-shard';

    // Intra-shard transaction
    if (fromShard === toShard) {
      const shard = this.shards[fromShard];
      time = shard.latency;
      
      // Simulate processing
      if (Math.random() < 0.95) { // 95% success rate
        return { success: true, time, errors: [] };
      } else {
        errors.push('Transaction failed: Insufficient balance');
        return { success: false, time, errors };
      }
    }

    // Cross-shard transaction
    const fromShardConfig = this.shards[fromShard];
    const toShardConfig = this.shards[toShard];

    // Step 1: Process on source shard
    time += fromShardConfig.latency;
    
    // Step 2: Cross-shard message
    const crossShardLatency = 100 + Math.floor(Math.random() * 50); // 100-150ms
    time += crossShardLatency;

    // Step 3: Process on destination shard
    time += toShardConfig.latency;

    // Step 4: Confirmation back to source shard
    time += crossShardLatency;

    // Simulate potential failures
    if (Math.random() < 0.90) { // 90% success rate for cross-shard
      return { success: true, time, errors: [] };
    } else {
      errors.push('Cross-shard transaction failed: State synchronization error');
      return { success: false, time, errors };
    }
  }

  /**
   * Simulate multiple transactions across shards
   */
  async simulateTransactions(
    transactions: ShardTransaction[],
    options?: ShardSimulationOptions
  ): Promise<ShardSimulationResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();
    const shardResults: ShardResult[] = this.shards.map(shard => ({
      shardId: shard.id,
      transactionsProcessed: 0,
      processingTime: 0,
      success: true,
      errors: [],
      stateUpdates: 0,
    }));

    const crossShardMessages: CrossShardMessage[] = [];
    const stateChanges: StateChange[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Process transactions
    for (const tx of transactions) {
      const result = await this.simulateTransaction(tx);
      
      if (!result.success) {
        errors.push(...result.errors);
      }

      // Update shard results
      const fromShardResult = shardResults[tx.shardFrom];
      fromShardResult.transactionsProcessed++;
      fromShardResult.processingTime += result.time;

      if (tx.type === 'cross-shard') {
        const toShardResult = shardResults[tx.shardTo];
        toShardResult.transactionsProcessed++;
        toShardResult.processingTime += result.time;

        // Record cross-shard message
        crossShardMessages.push({
          fromShard: tx.shardFrom,
          toShard: tx.shardTo,
          messageType: 'transaction-forward',
          latency: opts.crossShardLatency,
          timestamp: Date.now(),
        });

        // Record state changes
        stateChanges.push({
          shardId: tx.shardFrom,
          account: tx.from,
          before: { balance: 'unknown' },
          after: { balance: `-${tx.amount}` },
          timestamp: Date.now(),
        });

        stateChanges.push({
          shardId: tx.shardTo,
          account: tx.to,
          before: { balance: 'unknown' },
          after: { balance: `+${tx.amount}` },
          timestamp: Date.now(),
        });
      } else {
        // Intra-shard state change
        stateChanges.push({
          shardId: tx.shardFrom,
          account: tx.to,
          before: { balance: 'unknown' },
          after: { balance: `+${tx.amount}` },
          timestamp: Date.now(),
        });
      }
    }

    const totalTime = Date.now() - startTime;
    const totalGas = transactions.reduce((sum, tx) => sum + tx.gasEstimate, 0);
    const throughput = (transactions.length / (totalTime / 1000));

    // Check for warnings
    shardResults.forEach((result, idx) => {
      if (result.transactionsProcessed > opts.maxTransactionsPerShard) {
        warnings.push(`Shard ${idx} exceeded max transactions: ${result.transactionsProcessed}`);
      }
      if (result.processingTime > 1000) {
        warnings.push(`Shard ${idx} processing time high: ${result.processingTime}ms`);
      }
    });

    return {
      success: errors.length === 0,
      totalTime,
      shardResults,
      crossShardMessages,
      stateChanges,
      errors,
      warnings,
      totalGas,
      throughput,
    };
  }

  /**
   * Get current shard configuration
   */
  getShards(): ShardConfig[] {
    return [...this.shards];
  }

  /**
   * Simulate adaptive sharding (shard merging/splitting)
   */
  simulateAdaptiveSharding(newShardCount: number): void {
    if (newShardCount < 1 || newShardCount > 10) {
      throw new Error('Shard count must be between 1 and 10');
    }

    this.shards = this.initializeShards(newShardCount);
  }

  /**
   * Get statistics about shard distribution
   * Calculates cross-shard ratio by comparing shard assignments, not relying on tx.type
   * which is only set after simulation
   */
  getShardStatistics(transactions: ShardTransaction[]): {
    shardDistribution: Record<number, number>;
    crossShardRatio: number;
    averageLatency: number;
  } {
    const distribution: Record<number, number> = {};
    let crossShardCount = 0;

    transactions.forEach(tx => {
      // Calculate shard assignments for from and to addresses
      const fromShard = this.getShardForAddress(tx.from);
      const toShard = this.getShardForAddress(tx.to);
      
      // Count distribution by source shard
      distribution[fromShard] = (distribution[fromShard] || 0) + 1;
      
      // Determine if this is a cross-shard transaction by comparing shards
      // This works even before simulation runs
      if (fromShard !== toShard) {
        crossShardCount++;
      }
    });

    const crossShardRatio = transactions.length > 0 
      ? crossShardCount / transactions.length 
      : 0;

    const averageLatency = this.shards.reduce((sum, s) => sum + s.latency, 0) / this.shards.length;

    return {
      shardDistribution: distribution,
      crossShardRatio,
      averageLatency,
    };
  }
}
