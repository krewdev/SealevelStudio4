/**
 * Shard Transaction Simulator Component
 * 
 * Visual interface for simulating transactions across multiple shards
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Activity,
  Network,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  Layers,
  BarChart3,
} from 'lucide-react';
import {
  ShardTransactionSimulator,
} from '../lib/shard-simulator';
import type {
  ShardTransaction,
  ShardSimulationResult,
  ShardSimulationOptions,
} from '../lib/shard-simulator';

interface ShardTransactionSimulatorProps {
  onSimulationComplete?: (result: ShardSimulationResult) => void;
}

export function ShardTransactionSimulatorComponent({
  onSimulationComplete,
}: ShardTransactionSimulatorProps) {
  const [simulator] = useState(() => new ShardTransactionSimulator());
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<ShardSimulationResult | null>(null);
  const [transactions, setTransactions] = useState<ShardTransaction[]>([]);
  const [options, setOptions] = useState<ShardSimulationOptions>({
    shardCount: 3,
    enableAdaptiveSharding: true,
    crossShardLatency: 100,
    simulateNetworkDelay: true,
  });

  // Generate sample transactions
  const generateSampleTransactions = useCallback(() => {
    const sampleTxs: ShardTransaction[] = Array.from({ length: 20 }, (_, i) => ({
      id: `tx-${i}`,
      from: `erd1${Math.random().toString(36).substring(2, 15)}`,
      to: `erd1${Math.random().toString(36).substring(2, 15)}`,
      amount: (Math.random() * 100).toFixed(2),
      shardFrom: 0,
      shardTo: 0,
      type: 'intra-shard',
      timestamp: Date.now() + i * 1000,
      gasEstimate: 50000 + Math.floor(Math.random() * 50000),
    }));
    setTransactions(sampleTxs);
  }, []);

  // Run simulation
  const runSimulation = useCallback(async () => {
    if (transactions.length === 0) {
      alert('Please add transactions first');
      return;
    }

    setIsRunning(true);
    try {
      const simResult = await simulator.simulateTransactions(transactions, options);
      setResult(simResult);
      if (onSimulationComplete) {
        onSimulationComplete(simResult);
      }
    } catch (error) {
      console.error('Simulation error:', error);
      alert('Simulation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRunning(false);
    }
  }, [transactions, options, simulator, onSimulationComplete]);

  // Add transaction
  const addTransaction = useCallback(() => {
    const newTx: ShardTransaction = {
      id: `tx-${Date.now()}`,
      from: `erd1${Math.random().toString(36).substring(2, 15)}`,
      to: `erd1${Math.random().toString(36).substring(2, 15)}`,
      amount: (Math.random() * 100).toFixed(2),
      shardFrom: 0,
      shardTo: 0,
      type: 'intra-shard',
      timestamp: Date.now(),
      gasEstimate: 50000 + Math.floor(Math.random() * 50000),
    };
    setTransactions(prev => [...prev, newTx]);
  }, []);

  // Get shard statistics
  const statistics = useMemo(() => {
    if (transactions.length === 0) return null;
    return simulator.getShardStatistics(transactions);
  }, [transactions, simulator]);

  const shards = simulator.getShards();

  return (
    <div className="bg-gray-800 rounded-lg p-6 text-white">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold">Shard Transaction Simulator</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateSampleTransactions}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Generate Sample
          </button>
          <button
            onClick={addTransaction}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
          >
            Add Transaction
          </button>
          <button
            onClick={runSimulation}
            disabled={isRunning || transactions.length === 0}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center gap-2"
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Simulation
              </>
            )}
          </button>
        </div>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">Shard Count</label>
          <input
            type="number"
            min="1"
            max="10"
            value={options.shardCount || 3}
            onChange={(e) => setOptions({ ...options, shardCount: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 text-white"
          />
        </div>
        <div className="bg-gray-700 rounded-lg p-4">
          <label className="block text-sm font-medium mb-2">Cross-Shard Latency (ms)</label>
          <input
            type="number"
            min="50"
            max="500"
            value={options.crossShardLatency || 100}
            onChange={(e) => setOptions({ ...options, crossShardLatency: parseInt(e.target.value) })}
            className="w-full px-3 py-2 bg-gray-600 rounded border border-gray-500 text-white"
          />
        </div>
        <div className="bg-gray-700 rounded-lg p-4 flex items-center">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={options.enableAdaptiveSharding ?? true}
              onChange={(e) => setOptions({ ...options, enableAdaptiveSharding: e.target.checked })}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium">Adaptive Sharding</span>
          </label>
        </div>
      </div>

      {/* Shard Overview */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-400" />
          Shard Configuration
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {shards.map((shard) => (
            <div key={shard.id} className="bg-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{shard.name}</span>
                <span className="text-xs text-gray-400">ID: {shard.id}</span>
              </div>
              <div className="space-y-1 text-sm text-gray-300">
                <div className="flex justify-between">
                  <span>Nodes:</span>
                  <span>{shard.nodeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Throughput:</span>
                  <span>{shard.throughput} TPS</span>
                </div>
                <div className="flex justify-between">
                  <span>Latency:</span>
                  <span>{shard.latency}ms</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Transaction Distribution
          </h3>
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Total Transactions</div>
                <div className="text-2xl font-bold">{transactions.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Cross-Shard Ratio</div>
                <div className="text-2xl font-bold">
                  {(statistics.crossShardRatio * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Avg Latency</div>
                <div className="text-2xl font-bold">{statistics.averageLatency.toFixed(0)}ms</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-400 mb-2">Shard Distribution</div>
              <div className="flex gap-2">
                {Object.entries(statistics.shardDistribution).map(([shardId, count]) => (
                  <div key={shardId} className="flex-1 bg-gray-600 rounded p-2 text-center">
                    <div className="text-xs text-gray-400">Shard {shardId}</div>
                    <div className="text-lg font-semibold">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          Transactions ({transactions.length})
        </h3>
        <div className="bg-gray-700 rounded-lg p-4 max-h-64 overflow-y-auto">
          {transactions.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No transactions. Click "Generate Sample" or "Add Transaction" to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-gray-600 rounded p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">{tx.id}</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        tx.type === 'cross-shard' 
                          ? 'bg-yellow-600 text-yellow-100' 
                          : 'bg-green-600 text-green-100'
                      }`}>
                        {tx.type === 'cross-shard' ? 'Cross-Shard' : 'Intra-Shard'}
                      </span>
                    </div>
                    <div className="text-gray-300">
                      {tx.amount} EGLD
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            {result.success ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            Simulation Results
          </h3>
          <div className="bg-gray-700 rounded-lg p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-gray-400 mb-1">Total Time</div>
                <div className="text-xl font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {result.totalTime}ms
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Throughput</div>
                <div className="text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  {result.throughput.toFixed(2)} TPS
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Total Gas</div>
                <div className="text-xl font-bold flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  {result.totalGas.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400 mb-1">Cross-Shard Messages</div>
                <div className="text-xl font-bold">
                  {result.crossShardMessages.length}
                </div>
              </div>
            </div>

            {/* Shard Results */}
            <div>
              <div className="text-sm font-semibold mb-2">Shard Performance</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {result.shardResults.map((shardResult) => (
                  <div key={shardResult.shardId} className="bg-gray-600 rounded p-3">
                    <div className="font-semibold mb-2">Shard {shardResult.shardId}</div>
                    <div className="text-sm space-y-1 text-gray-300">
                      <div className="flex justify-between">
                        <span>Processed:</span>
                        <span>{shardResult.transactionsProcessed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Time:</span>
                        <span>{shardResult.processingTime}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>State Updates:</span>
                        <span>{shardResult.stateUpdates}</span>
                      </div>
                      {shardResult.errors.length > 0 && (
                        <div className="text-red-400 text-xs mt-2">
                          {shardResult.errors.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Errors and Warnings */}
            {result.errors.length > 0 && (
              <div className="bg-red-900/30 border border-red-600 rounded p-3">
                <div className="font-semibold text-red-400 mb-2">Errors</div>
                <ul className="list-disc list-inside text-sm text-red-300">
                  {result.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.warnings.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-600 rounded p-3">
                <div className="font-semibold text-yellow-400 mb-2">Warnings</div>
                <ul className="list-disc list-inside text-sm text-yellow-300">
                  {result.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
