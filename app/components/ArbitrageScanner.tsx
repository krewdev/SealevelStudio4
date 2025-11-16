// Main scanner view component

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search,
  RefreshCw,
  Play,
  Pause,
  Settings,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  X,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
} from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PoolScanner } from '../lib/pools/scanner';
import { ArbitrageDetector } from '../lib/pools/arbitrage';
import {
  PoolData,
  ArbitrageOpportunity,
  ScannerConfig,
  DEFAULT_SCANNER_CONFIG,
  DEXProtocol,
} from '../lib/pools/types';
import { ScannerAgent } from './ScannerAgent';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { executeArbitrage, validateOpportunity, calculateSafeSlippage, ExecutionConfig } from '../lib/pools/execution';
import { getUserMessage } from '../lib/error-handling';

interface ArbitrageScannerProps {
  onBuildTransaction?: (opportunity: ArbitrageOpportunity) => void;
}

export function ArbitrageScanner({ onBuildTransaction }: ArbitrageScannerProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { trackFeatureUsage, checkFeatureAccess, getTrialStatus } = useUsageTracking();
  const [executing, setExecuting] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<{ success: boolean; message: string } | null>(null);
  const [scanner] = useState(() => new PoolScanner());
  const [pools, setPools] = useState<PoolData[]>([]);
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [config, setConfig] = useState<ScannerConfig>(DEFAULT_SCANNER_CONFIG);
  const [showConfig, setShowConfig] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDEX, setFilterDEX] = useState<DEXProtocol | 'all'>('all');
  const [sortBy, setSortBy] = useState<'profit' | 'profitPercent' | 'confidence'>('profit');
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);

  // Auto-refresh effect
  useEffect(() => {
    if (!config.autoRefresh || isScanning) return;

    const interval = setInterval(() => {
      handleScan();
    }, config.refreshInterval);

    return () => clearInterval(interval);
  }, [config.autoRefresh, config.refreshInterval, isScanning]);

  const handleScan = useCallback(async () => {
    if (isScanning) return;

    // Check if user can use scanner (free trial or subscription)
    const access = checkFeatureAccess('scanner_scan');
    if (!access.allowed) {
      alert(access.reason || 'Scanner scan not available. Please check your subscription or free trial status.');
      return;
    }

    setIsScanning(true);
    setErrors([]);

    try {
      // Track usage (payment collection disabled during development)
      trackFeatureUsage('scanner_scan', {
        config: {
          enabledDEXs: config.enabledDEXs,
          maxHops: config.maxHops,
          minProfitThreshold: config.minProfitThreshold,
        },
      });

      scanner.updateConfig(config);
      const state = await scanner.scan(connection);
      
      setPools(state.pools);
      setLastScanTime(state.lastScanTime);
      setErrors(state.errors || []);

      // Detect arbitrage opportunities
      if (state.pools.length > 0) {
        const detector = new ArbitrageDetector(state.pools, config, connection);
        const detected = detector.detectOpportunities();
        
        // Also find unconventional opportunities via AI searcher
        try {
          const unconventional = await scanner.findUnconventionalOpportunities(connection);
          // Convert unconventional opportunities to standard format
          const converted: ArbitrageOpportunity[] = unconventional.map((opp: any) => {
            const baseProfit = opp.estimatedProfit || 0;
            const inputAmount = BigInt(1_000_000_000); // 1 SOL in lamports
            const profitInLamports = BigInt(Math.floor(baseProfit * 1e9));
            const outputAmount = inputAmount + profitInLamports;
            
            // Calculate profit percentage correctly: (profit / inputAmount) * 100
            // baseProfit is in SOL, inputAmount is in lamports, so convert inputAmount to SOL
            const inputAmountInSOL = Number(inputAmount) / 1e9;
            const profitPercent = baseProfit > 0 && inputAmountInSOL > 0 
              ? (baseProfit / inputAmountInSOL) * 100 
              : 0;
            
            return {
              id: `unconventional-${opp.type}-${Date.now()}-${Math.random()}`,
              path: opp.path,
              type: (opp.type || 'cross_protocol') as 'simple' | 'multi_hop' | 'wrap_unwrap' | 'cross_protocol',
              profit: baseProfit,
              profitPercent,
              inputAmount,
              outputAmount,
              gasEstimate: 10000,
              netProfit: baseProfit - (10000 / 1e9),
              confidence: opp.risk === 'low' ? 0.8 : opp.risk === 'medium' ? 0.5 : 0.3,
              steps: opp.path.steps || [],
              timestamp: new Date(),
            };
          });
          detected.push(...converted);
        } catch (error) {
          console.error('Error finding unconventional opportunities:', error);
        }
        
        setOpportunities(detected);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      setErrors(prev => [...prev, `Scan error: ${errorMsg}`]);
    } finally {
      setIsScanning(false);
    }
  }, [connection, config, isScanning, scanner]);

  const filteredOpportunities = useMemo(() => {
    let filtered = [...opportunities];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(opp =>
        opp.path.startToken.symbol.toLowerCase().includes(query) ||
        opp.path.endToken.symbol.toLowerCase().includes(query) ||
        opp.path.steps.some(step => 
          step.dex.toLowerCase().includes(query) ||
          step.tokenIn.symbol.toLowerCase().includes(query) ||
          step.tokenOut.symbol.toLowerCase().includes(query)
        )
      );
    }

    // Filter by DEX
    if (filterDEX !== 'all') {
      filtered = filtered.filter(opp =>
        opp.path.steps.some(step => step.dex === filterDEX)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'profit':
          return b.profit - a.profit;
        case 'profitPercent':
          return b.profitPercent - a.profitPercent;
        case 'confidence':
          return b.confidence - a.confidence;
        default:
          return 0;
      }
    });

    return filtered;
  }, [opportunities, searchQuery, filterDEX, sortBy]);

  const handleBuildTransaction = (opportunity: ArbitrageOpportunity) => {
    if (onBuildTransaction) {
      onBuildTransaction(opportunity);
    }
  };

  const handleExecute = useCallback(async (opportunity: ArbitrageOpportunity) => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.sendTransaction) {
      setExecutionResult({ success: false, message: 'Please connect your wallet to execute arbitrage' });
      return;
    }

    // Validate opportunity
    const validation = validateOpportunity(opportunity, {
      slippageTolerance: calculateSafeSlippage(opportunity),
      priorityFee: 10000,
    });

    if (!validation.valid) {
      setExecutionResult({ success: false, message: validation.reason || 'Invalid opportunity' });
      return;
    }

    setExecuting(opportunity.id);
    setExecutionResult(null);

    try {
      const config: ExecutionConfig = {
        slippageTolerance: calculateSafeSlippage(opportunity),
        priorityFee: 10000,
        maxRetries: 3,
      };

      const result = await executeArbitrage(connection, wallet, opportunity, config);

      if (result.success) {
        setExecutionResult({
          success: true,
          message: `Successfully executed! Profit: ${result.actualProfit?.toFixed(6) || result.profit?.toFixed(6) || '0'} SOL`,
        });
        // Refresh opportunities after execution
        setTimeout(() => handleScan(), 2000);
      } else {
        setExecutionResult({ success: false, message: getUserMessage(result.error || new Error('Execution failed')) });
      }
    } catch (error) {
      setExecutionResult({
        success: false,
        message: getUserMessage(error),
      });
    } finally {
      setExecuting(null);
    }
  }, [wallet, connection, handleScan]);

  return (
    <>
      <ScannerAgent
        opportunities={opportunities}
        pools={pools}
        selectedOpportunity={selectedOpportunity}
        onSelectOpportunity={setSelectedOpportunity}
        onBuildTransaction={handleBuildTransaction}
      />
      <div className="h-full flex flex-col bg-slate-900 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Arbitrage Scanner</h1>
          {lastScanTime && (
            <span className="text-sm text-slate-400 flex items-center gap-1">
              <Clock size={14} />
              Last scan: {lastScanTime.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded flex items-center gap-2"
          >
            <Settings size={16} />
            Config
          </button>
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded flex items-center gap-2"
          >
            {isScanning ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                Scan
              </>
            )}
          </button>
          <button
            onClick={() => setConfig(prev => ({ ...prev, autoRefresh: !prev.autoRefresh }))}
            className={`px-3 py-2 rounded flex items-center gap-2 ${
              config.autoRefresh ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {config.autoRefresh ? <Pause size={16} /> : <Play size={16} />}
            {config.autoRefresh ? 'Auto' : 'Manual'}
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="border-b border-slate-800 p-4 bg-slate-950">
          <div className="grid grid-cols-2 gap-4 max-w-4xl">
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Auto Refresh</label>
              <input
                type="checkbox"
                checked={config.autoRefresh}
                onChange={(e) => setConfig(prev => ({ ...prev, autoRefresh: e.target.checked }))}
                className="mr-2"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Refresh Interval (ms)</label>
              <input
                type="number"
                value={config.refreshInterval}
                onChange={(e) => setConfig(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) || 10000 }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                min={5000}
                max={60000}
                step={1000}
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Min Profit (SOL)</label>
              <input
                type="number"
                value={config.minProfitThreshold}
                onChange={(e) => setConfig(prev => ({ ...prev, minProfitThreshold: parseFloat(e.target.value) || 0.001 }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                step={0.001}
                min={0}
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Min Profit %</label>
              <input
                type="number"
                value={config.minProfitPercent}
                onChange={(e) => setConfig(prev => ({ ...prev, minProfitPercent: parseFloat(e.target.value) || 0.1 }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                step={0.1}
                min={0}
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1 block">Max Hops</label>
              <input
                type="number"
                value={config.maxHops}
                onChange={(e) => setConfig(prev => ({ ...prev, maxHops: parseInt(e.target.value) || 5 }))}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1"
                min={2}
                max={10}
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setShowConfig(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Bar */}
      <div className="border-b border-slate-800 p-4 flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Pools:</span>
          <span className="font-bold">{pools.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-400">Opportunities:</span>
          <span className="font-bold text-teal-400">{filteredOpportunities.length}</span>
        </div>
        {filteredOpportunities.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Best Profit:</span>
            <span className="font-bold text-green-400">
              {filteredOpportunities[0].profit.toFixed(4)} SOL ({filteredOpportunities[0].profitPercent.toFixed(2)}%)
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="border-b border-slate-800 p-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by token or DEX..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded pl-10 pr-4 py-2"
          />
        </div>
        <select
          value={filterDEX}
          onChange={(e) => setFilterDEX(e.target.value as DEXProtocol | 'all')}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2"
        >
          <option value="all">All DEXs</option>
          <option value="raydium">Raydium</option>
          <option value="orca">Orca</option>
          <option value="jupiter">Jupiter</option>
          <option value="meteora">Meteora</option>
          <option value="lifinity">Lifinity</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-slate-800 border border-slate-700 rounded px-3 py-2"
        >
          <option value="profit">Sort by Profit</option>
          <option value="profitPercent">Sort by Profit %</option>
          <option value="confidence">Sort by Confidence</option>
        </select>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="border-b border-slate-800 p-4 bg-red-900/20">
          {errors.map((error, i) => (
            <div key={i} className="text-red-400 text-sm flex items-center gap-2">
              <AlertCircle size={14} />
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Opportunities Table */}
      <div className="flex-1 overflow-y-auto">
        {filteredOpportunities.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-400">
            {isScanning ? (
              <div className="text-center">
                <RefreshCw className="animate-spin mx-auto mb-2" size={32} />
                <p>Scanning pools...</p>
              </div>
            ) : (
              <div className="text-center">
                <p>No arbitrage opportunities found.</p>
                <p className="text-sm mt-2">Click "Scan" to search for opportunities.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left">
                  <th className="pb-2 text-slate-400">Path</th>
                  <th className="pb-2 text-slate-400">Profit</th>
                  <th className="pb-2 text-slate-400">Profit %</th>
                  <th className="pb-2 text-slate-400">Net Profit</th>
                  <th className="pb-2 text-slate-400">Confidence</th>
                  <th className="pb-2 text-slate-400">Hops</th>
                  <th className="pb-2 text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.map((opp) => (
                  <tr
                    key={opp.id}
                    className="border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer"
                    onClick={() => setSelectedOpportunity(opp)}
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{opp.path.startToken.symbol}</span>
                        {opp.path.steps.map((step, i) => (
                          <React.Fragment key={i}>
                            <ArrowRight size={14} className="text-slate-500" />
                            <span className="text-xs text-slate-500">{step.dex}</span>
                            <ArrowRight size={14} className="text-slate-500" />
                            <span className="font-medium">{step.tokenOut.symbol}</span>
                          </React.Fragment>
                        ))}
                        {opp.path.endToken.mint === opp.path.startToken.mint && (
                          <>
                            <ArrowRight size={14} className="text-slate-500" />
                            <span className="font-medium">{opp.path.startToken.symbol}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="text-green-400 font-medium">
                        {opp.profit.toFixed(4)} SOL
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-teal-400">
                        {opp.profitPercent.toFixed(2)}%
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={opp.netProfit > 0 ? 'text-green-400' : 'text-red-400'}>
                        {opp.netProfit.toFixed(4)} SOL
                      </span>
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        opp.confidence >= 0.7 ? 'bg-green-900/50 text-green-400' :
                        opp.confidence >= 0.4 ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>
                        {(opp.confidence * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3">
                      <span className="text-slate-400">{opp.path.totalHops}</span>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuildTransaction(opp);
                          }}
                          className="px-3 py-1 bg-teal-600 hover:bg-teal-700 rounded text-sm flex items-center gap-1"
                        >
                          <Zap size={14} />
                          Build
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExecute(opp);
                          }}
                          disabled={executing === opp.id || !wallet.publicKey}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded text-sm flex items-center gap-1"
                        >
                          {executing === opp.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            <Play size={14} />
                          )}
                          {executing === opp.id ? 'Executing...' : 'Execute'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Opportunity Details Modal */}
      {selectedOpportunity && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedOpportunity(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Arbitrage Details</h2>
              <button onClick={() => setSelectedOpportunity(null)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-slate-400">Profit</div>
                  <div className="text-lg font-bold text-green-400">{selectedOpportunity.profit.toFixed(4)} SOL</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Profit %</div>
                  <div className="text-lg font-bold text-teal-400">{selectedOpportunity.profitPercent.toFixed(2)}%</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Net Profit</div>
                  <div className="text-lg font-bold">{selectedOpportunity.netProfit.toFixed(4)} SOL</div>
                </div>
                <div>
                  <div className="text-sm text-slate-400">Gas Estimate</div>
                  <div className="text-lg">{selectedOpportunity.gasEstimate} lamports</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-400 mb-2">Path Steps</div>
                <div className="space-y-2">
                  {selectedOpportunity.steps.map((step, i) => (
                    <div key={i} className="bg-slate-800 p-3 rounded flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{step.tokenIn.symbol}</span>
                        <ArrowRight size={14} />
                        <span className="font-medium">{step.tokenOut.symbol}</span>
                        <span className="text-xs text-slate-500 ml-2">via {step.dex}</span>
                      </div>
                      <div className="text-sm text-slate-400">
                        Fee: {step.fee} bps
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  handleBuildTransaction(selectedOpportunity);
                  setSelectedOpportunity(null);
                }}
                className="w-full py-2 bg-teal-600 hover:bg-teal-700 rounded flex items-center justify-center gap-2"
              >
                <Zap size={16} />
                Build Transaction
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

