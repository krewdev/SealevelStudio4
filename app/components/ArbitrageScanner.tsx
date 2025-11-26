// Main scanner view component

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  ArrowLeft,
  Brain,
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
import { UnifiedAIAgents } from './UnifiedAIAgents';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { executeArbitrage, validateOpportunity, calculateSafeSlippage, ExecutionConfig } from '../lib/pools/execution';
import { getUserMessage } from '../lib/error-handling';
import { AnimatedInput } from './ui/AnimatedInput';
import { AnimatedSelect } from './ui/AnimatedSelect';
import { Arbitrage3DVisualization } from './charts/Arbitrage3DVisualization';
import { useArbitrageAI } from '../hooks/useArbitrageAI';
import { ArbitrageScanningResults } from '../lib/arbitrage/arbitrage-result-schema';

interface ArbitrageScannerProps {
  onBuildTransaction?: (opportunity: ArbitrageOpportunity) => void;
  onBack?: () => void;
}

export function ArbitrageScanner({ onBuildTransaction, onBack }: ArbitrageScannerProps) {
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
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [pendingOpportunity, setPendingOpportunity] = useState<ArbitrageOpportunity | null>(null);
  const [aiResults, setAiResults] = useState<ArbitrageScanningResults | null>(null);
  const [showAIResults, setShowAIResults] = useState(false);
  const { analyzeScan, isLoading: isAIAnalyzing, error: aiError } = useArbitrageAI();
  
  // Capture the opportunity when modal opens to avoid stale closure issues
  const modalOpportunityRef = useRef<ArbitrageOpportunity | null>(null);

  const handleExecuteClick = (opportunity: ArbitrageOpportunity) => {
    // Capture the opportunity in a ref when modal opens
    modalOpportunityRef.current = opportunity;
    setPendingOpportunity(opportunity);
    setShowExecutionModal(true);
  };

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

      // Detect arbitrage opportunities (with Birdeye optimization if available)
      if (state.pools.length > 0) {
        // Initialize Birdeye optimizer if available
        let birdeyeOptimizer: any = undefined;
        try {
          const birdeyeFetcher = scanner.getFetcher('birdeye');
          if (birdeyeFetcher) {
            const { BirdeyeOptimizer } = await import('@/app/lib/pools/birdeye-optimizer');
            // Type assertion - we know it's a BirdeyeFetcher when fetched with 'birdeye' key
            birdeyeOptimizer = new BirdeyeOptimizer(birdeyeFetcher as any);
          }
        } catch (error) {
          console.error('Error initializing Birdeye optimizer:', error);
        }
        
        const detector = new ArbitrageDetector(state.pools, config, connection, birdeyeOptimizer);
        const detected = await detector.detectOpportunities();
        
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
        
        // Automatically show the first result (even if unprofitable) for immediate feedback
        if (detected.length > 0) {
          setSelectedOpportunity(detected[0]);
        }
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

  const handleTrainAI = useCallback((opportunity: ArbitrageOpportunity) => {
    // Save opportunity to training context
    const trainingData = {
      path: opportunity.path,
      outcome: opportunity.netProfit > 0 ? 'positive' : 'negative',
      timestamp: new Date().toISOString(),
      profit: opportunity.profit,
      gas: opportunity.gasEstimate
    };
    
    try {
      // Save to local storage for persistent training context
      const existing = localStorage.getItem('sealevel-ai-training-data');
      const data = existing ? JSON.parse(existing) : [];
      data.push(trainingData);
      localStorage.setItem('sealevel-ai-training-data', JSON.stringify(data));
      
      // Also log for current session
      console.log('Training data retained:', trainingData);
      
      // Show feedback (could add a toast here, but alert is quick for now)
      alert('Path context saved for AI training!');
    } catch (e) {
      console.error('Failed to save training data', e);
    }
  }, []);

  const handleAIAnalysis = useCallback(async () => {
    if (opportunities.length === 0) {
      alert('No opportunities to analyze. Please scan first.');
      return;
    }

    const results = await analyzeScan(opportunities);
    if (results) {
      setAiResults(results);
      setShowAIResults(true);
    } else if (aiError) {
      alert(`AI Analysis Error: ${aiError}`);
    }
  }, [opportunities, analyzeScan, aiError]);

  return (
    <>
      <UnifiedAIAgents
        opportunities={opportunities}
        pools={pools}
        selectedOpportunity={selectedOpportunity}
        onSelectOpportunity={setSelectedOpportunity}
        onBuildTransaction={handleBuildTransaction}
      />
      <div className="h-full flex flex-col animated-bg text-white relative">
      {/* Background Logo */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ zIndex: 0 }}
      >
        <img
          src="/sea-level-logo.png"
          alt="Sealevel Studio Background"
          className="absolute inset-0 w-full h-full object-contain opacity-[0.06] filter hue-rotate-[270deg] saturate-60 contrast-125"
          style={{
            objectPosition: 'bottom left',
            transform: 'scale(0.7) rotate(10deg)',
          }}
          onError={(e) => {
            console.warn('Background logo not found');
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      </div>

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      
      {/* Header */}
      <div className="relative z-10 border-b border-slate-800/50 glass p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <img
            src="/sea-level-logo.png"
            alt="Sealevel Studio"
            className="h-8 w-auto"
            style={{ maxHeight: '32px' }}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Go back"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back</span>
            </button>
          )}
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
            className="btn-modern px-4 py-2 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white flex items-center gap-2"
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
          <button
            onClick={handleAIAnalysis}
            disabled={isAIAnalyzing || opportunities.length === 0}
            className="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50 rounded flex items-center gap-2"
            title={opportunities.length === 0 ? "Scan first to analyze with AI (LM Studio)" : "Analyze results with AI (LM Studio)"}
          >
            {isAIAnalyzing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain size={16} />
                AI Analysis
              </>
            )}
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
              <label className="text-sm text-slate-400 mb-1 block">Show Unprofitable</label>
              <input
                type="checkbox"
                checked={config.showUnprofitable || false}
                onChange={(e) => setConfig(prev => ({ ...prev, showUnprofitable: e.target.checked }))}
                className="mr-2"
              />
            </div>
            <div>
              <AnimatedInput
                type="number"
                label="Refresh Interval (ms)"
                value={config.refreshInterval.toString()}
                onChange={(e) => setConfig(prev => ({ ...prev, refreshInterval: parseInt(e.target.value) || 10000 }))}
                min={5000}
                max={60000}
                step={1000}
              />
            </div>
            <div>
              <AnimatedInput
                type="number"
                label="Min Profit (SOL)"
                value={config.minProfitThreshold.toString()}
                onChange={(e) => setConfig(prev => ({ ...prev, minProfitThreshold: parseFloat(e.target.value) || 0.001 }))}
                step={0.001}
                min={0}
              />
            </div>
            <div>
              <AnimatedInput
                type="number"
                label="Min Profit %"
                value={config.minProfitPercent.toString()}
                onChange={(e) => setConfig(prev => ({ ...prev, minProfitPercent: parseFloat(e.target.value) || 0.1 }))}
                step={0.1}
                min={0}
              />
            </div>
            <div>
              <AnimatedInput
                type="number"
                label="Max Hops"
                value={config.maxHops.toString()}
                onChange={(e) => setConfig(prev => ({ ...prev, maxHops: parseInt(e.target.value) || 5 }))}
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
      <div className="relative z-10 border-b border-slate-800/50 glass p-4 flex items-center gap-6">
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
      <div className="relative z-10 border-b border-slate-800/50 glass p-4 flex items-center gap-4">
        <div className="flex-1 relative">
          <AnimatedInput
            type="text"
            label="Search by token or DEX..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            particles={true}
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
      <div className="relative z-10 flex-1 overflow-y-auto custom-scrollbar">
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
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-all card-modern"
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
                            handleExecuteClick(opp);
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

      {/* Opportunity Details Visualization (3D) */}
      {selectedOpportunity && (
        <Arbitrage3DVisualization
          opportunity={selectedOpportunity}
          onTrainAI={() => handleTrainAI(selectedOpportunity)}
          onExecute={() => {
            handleExecuteClick(selectedOpportunity);
            // Don't close automatically, let user see result or close manually
          }}
          onClose={() => setSelectedOpportunity(null)}
        />
      )}
    </div>

      {/* Execution Choice Modal */}
      {showExecutionModal && pendingOpportunity && (() => {
        // Capture the opportunity value when modal renders to avoid stale closure
        const capturedOpportunity = modalOpportunityRef.current || pendingOpportunity;
        
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-blue-500" />
              
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Zap className="text-yellow-400" />
                Execute Strategy
              </h3>

              <div className="mb-6">
                <div className="bg-slate-800/50 rounded p-3 border border-slate-800 mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-400">Profit:</span>
                    <span className="text-green-400 font-mono">+{capturedOpportunity.profit.toFixed(5)} SOL</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Confidence:</span>
                    <span className={(capturedOpportunity.confidence || 0) > 0.7 ? "text-green-400" : "text-yellow-400"}>
                      {((capturedOpportunity.confidence || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 text-sm mb-4">
                  How would you like to proceed with this opportunity?
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      // Use captured opportunity to avoid stale closure
                      const opp = modalOpportunityRef.current || capturedOpportunity;
                      if (opp) {
                        handleExecute(opp);
                        setShowExecutionModal(false);
                        modalOpportunityRef.current = null;
                      }
                    }}
                    className="w-full p-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-lg flex items-center justify-between group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white/20 p-2 rounded-full">
                        <Zap size={18} className="text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-white">Auto-Mode (AI Execute)</div>
                        <div className="text-[10px] text-white/70">Direct execution with AI monitoring</div>
                      </div>
                    </div>
                    <ArrowRight size={16} className="text-white/50 group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => {
                      // Use captured opportunity to avoid stale closure
                      const opp = modalOpportunityRef.current || capturedOpportunity;
                      if (opp) {
                        handleBuildTransaction(opp);
                        setShowExecutionModal(false);
                        modalOpportunityRef.current = null;
                      }
                    }}
                    className="w-full p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg flex items-center justify-between group transition-all"
                  >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-700 p-2 rounded-full text-teal-400">
                      <Settings size={18} />
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-200">Send to Builder</div>
                      <div className="text-[10px] text-slate-500">Customize parameters manually</div>
                    </div>
                  </div>
                    <ArrowRight size={16} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setShowExecutionModal(false);
                      modalOpportunityRef.current = null;
                    }}
                    className="text-slate-500 hover:text-white text-sm"
                  >
                    Cancel
                  </button>
                </div>
                
                <div className="mt-4 p-2 bg-yellow-900/20 border border-yellow-900/30 rounded text-[10px] text-yellow-500/70 text-center">
                   ⚠️ Warning: Auto-Mode executes immediately. Ensure you understand the risks.
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AI Results Modal */}
      {showAIResults && aiResults && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-700 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Brain className="text-purple-400" size={20} />
                AI Analysis Results
              </h2>
              <button
                onClick={() => setShowAIResults(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Financial Summary */}
              <div className="bg-slate-800/50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-3">Financial Summary</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400">SOL Made:</span>
                    <span className="ml-2 text-green-400 font-bold">{aiResults.financialSummary.solMade.toFixed(6)} SOL</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Net Profit:</span>
                    <span className="ml-2 text-green-400 font-bold">{aiResults.financialSummary.netSolProfit.toFixed(6)} SOL</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Gas Fees Paid:</span>
                    <span className="ml-2 text-red-400">{aiResults.financialSummary.gasFeesPaid.toFixed(6)} SOL</span>
                  </div>
                  <div>
                    <span className="text-slate-400">SOL Deposited:</span>
                    <span className="ml-2">{aiResults.financialSummary.solDeposited.toFixed(6)} SOL</span>
                  </div>
                </div>
              </div>

              {/* Statistics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-teal-400">{aiResults.probableTrades.length}</div>
                  <div className="text-sm text-slate-400">Opportunities</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">{aiResults.tradesExecuted.length}</div>
                  <div className="text-sm text-slate-400">Executed</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">{aiResults.tradesFailed.length}</div>
                  <div className="text-sm text-slate-400">Failed</div>
                </div>
                <div className="bg-slate-800/50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">{aiResults.tradesMissed.length}</div>
                  <div className="text-sm text-slate-400">Missed</div>
                </div>
              </div>

              {/* Should Repeat */}
              {aiResults.shouldRepeat && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="text-yellow-400" size={20} />
                    <span className="font-semibold">Continue Scanning Recommended</span>
                  </div>
                  <p className="text-slate-300 text-sm">{aiResults.repeatReason || 'AI recommends continuing the scan.'}</p>
                </div>
              )}

              {/* Raw JSON (collapsible) */}
              <details className="bg-slate-800/30 rounded-lg">
                <summary className="p-3 cursor-pointer text-slate-400 hover:text-white">View Full JSON</summary>
                <pre className="p-4 text-xs overflow-x-auto text-slate-300">
                  {JSON.stringify(aiResults, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

