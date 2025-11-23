'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token';
import { PumpFunStream, PumpFunStreamEvent, PumpFunToken } from '../lib/pumpfun/stream';
import { PumpFunQuickNodeStream } from '../lib/pumpfun/quicknode-stream';
import { SnipingAnalysis } from '../lib/pumpfun/ai-analysis';
import { 
  Zap, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Play, 
  Square, 
  Settings,
  DollarSign,
  Clock,
  Shield,
  Target
} from 'lucide-react';

interface PumpFunSniperProps {
  onBack?: () => void;
}

interface SnipingConfig {
  enabled: boolean;
  autoSnipe: boolean;
  maxInvestment: number; // SOL
  minConfidence: number; // 0-100
  maxRiskLevel: 'low' | 'medium' | 'high' | 'very_high';
  filters: {
    minMarketCap: number;
    maxMarketCap: number;
    minLiquidity: number;
    requireSocialLinks: boolean;
    minHolders: number;
  };
}

export function PumpFunSniper({ onBack }: PumpFunSniperProps) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  const [stream, setStream] = useState<PumpFunStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [tokens, setTokens] = useState<Map<string, PumpFunToken>>(new Map());
  const [analyses, setAnalyses] = useState<Map<string, SnipingAnalysis>>(new Map());
  const [snipedTokens, setSnipedTokens] = useState<Set<string>>(new Set());
  const [config, setConfig] = useState<SnipingConfig>({
    enabled: false,
    autoSnipe: false,
    maxInvestment: 0.1, // 0.1 SOL default
    minConfidence: 70,
    maxRiskLevel: 'medium',
    filters: {
      minMarketCap: 0,
      maxMarketCap: 1000000,
      minLiquidity: 0.5,
      requireSocialLinks: false,
      minHolders: 0,
    },
  });
  const [showConfig, setShowConfig] = useState(false);
  const [stats, setStats] = useState({
    tokensDetected: 0,
    tokensAnalyzed: 0,
    snipesExecuted: 0,
    snipesSuccessful: 0,
    totalInvested: 0,
    totalProfit: 0,
  });

  // Initialize stream
  useEffect(() => {
    if (!connection) return;

    // Try QuickNode stream first (if configured), fallback to direct stream
    let pumpFunStream: PumpFunStream | PumpFunQuickNodeStream;
    
    try {
      // QuickNode stream will check for configuration internally
      pumpFunStream = new PumpFunQuickNodeStream(connection);
      // Test if QuickNode is configured by checking stream manager
      const testStream = pumpFunStream as any;
      if (testStream.streamManager) {
        // QuickNode is available
        setStream(pumpFunStream as any);
      } else {
        // Fallback to direct stream
        pumpFunStream = new PumpFunStream(connection);
        setStream(pumpFunStream as any);
      }
    } catch (error) {
      // If QuickNode stream fails, use direct stream
      console.log('[PumpFun Sniper] QuickNode not available, using direct stream');
      pumpFunStream = new PumpFunStream(connection);
      setStream(pumpFunStream as any);
    }

    return () => {
      pumpFunStream.disconnect();
    };
  }, [connection]);

  // Handle stream events
  useEffect(() => {
    if (!stream || !isStreaming) return;

    const unsubscribe = stream.onEvent(async (event: PumpFunStreamEvent) => {
      console.log('[PumpFun Sniper] New event:', event);

      // Update token data
      setTokens(prev => {
        const updated = new Map(prev);
        updated.set(event.token.mint, event.token);
        return updated;
      });

      setStats(prev => ({
        ...prev,
        tokensDetected: prev.tokensDetected + 1,
      }));

      // Auto-analyze if enabled
      if (config.enabled) {
        await analyzeToken(event.token);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [stream, isStreaming, config.enabled]);

  /**
   * Analyze token with AI
   */
  const analyzeToken = useCallback(async (token: PumpFunToken) => {
    try {
      // Apply filters first
      if (!passesFilters(token, config.filters)) {
        return;
      }

      setStats(prev => ({
        ...prev,
        tokensAnalyzed: prev.tokensAnalyzed + 1,
      }));

      const response = await fetch('/api/pumpfun/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Analysis failed');
      }

      const data = await response.json();
      const analysis = data.analysis as SnipingAnalysis;

      setAnalyses(prev => {
        const updated = new Map(prev);
        updated.set(token.mint, analysis);
        return updated;
      });

      // Auto-snipe if enabled and conditions met
      if (config.autoSnipe && shouldAutoSnipe(analysis, config)) {
        await executeSnipe(token, analysis);
      }
    } catch (error) {
      console.error('[PumpFun Sniper] Analysis error:', error);
    }
  }, [config, executeSnipe]);

  /**
   * Check if token passes filters
   */
  const passesFilters = (token: PumpFunToken, filters: SnipingConfig['filters']): boolean => {
    if (token.marketCap < filters.minMarketCap || token.marketCap > filters.maxMarketCap) {
      return false;
    }
    if (token.liquidity < filters.minLiquidity) {
      return false;
    }
    if (filters.requireSocialLinks && !token.socialLinks) {
      return false;
    }
    if (token.holders < filters.minHolders) {
      return false;
    }
    return true;
  };

  /**
   * Check if should auto-snipe based on analysis
   */
  const shouldAutoSnipe = (analysis: SnipingAnalysis, config: SnipingConfig): boolean => {
    if (!analysis.shouldSnipe) return false;
    if (analysis.confidence < config.minConfidence) return false;
    
    const riskLevels = ['low', 'medium', 'high', 'very_high'];
    const analysisRiskIndex = riskLevels.indexOf(analysis.riskLevel);
    const maxRiskIndex = riskLevels.indexOf(config.maxRiskLevel);
    
    if (analysisRiskIndex > maxRiskIndex) return false;
    
    return true;
  };

  /**
   * Execute snipe (buy token)
   */
  const executeSnipe = useCallback(async (token: PumpFunToken, analysis: SnipingAnalysis) => {
    if (!publicKey || !sendTransaction) {
      console.error('[PumpFun Sniper] Wallet not connected');
      return;
    }

    try {
      const investmentAmount = Math.min(
        analysis.maxInvestment || config.maxInvestment,
        config.maxInvestment
      ) * LAMPORTS_PER_SOL;

      // Build buy transaction for pump.fun
      // Note: This is a simplified example - actual pump.fun buy requires their program interaction
      const transaction = new Transaction();
      
      // Get associated token account
      const mintPubkey = new PublicKey(token.mint);
      const userAta = await getAssociatedTokenAddress(mintPubkey, publicKey);
      
      // Check if ATA exists, create if not
      try {
        await connection.getAccountInfo(userAta);
      } catch {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            userAta,
            publicKey,
            mintPubkey,
            TOKEN_PROGRAM_ID
          )
        );
      }

      // TODO: Add actual pump.fun buy instruction
      // This requires the pump.fun program ID and buy instruction builder
      // For now, this is a placeholder structure

      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      setSnipedTokens(prev => new Set(prev).add(token.mint));
      setStats(prev => ({
        ...prev,
        snipesExecuted: prev.snipesExecuted + 1,
        snipesSuccessful: prev.snipesSuccessful + 1,
        totalInvested: prev.totalInvested + investmentAmount / LAMPORTS_PER_SOL,
      }));

      console.log('[PumpFun Sniper] Sniped token:', token.symbol, signature);
    } catch (error) {
      console.error('[PumpFun Sniper] Snipe execution error:', error);
      setStats(prev => ({
        ...prev,
        snipesExecuted: prev.snipesExecuted + 1,
      }));
    }
  }, [publicKey, sendTransaction, connection, config]);

  /**
   * Toggle stream
   */
  const toggleStream = useCallback(() => {
    if (!stream) return;

    if (isStreaming) {
      stream.disconnect();
      setIsStreaming(false);
    } else {
      stream.connect();
      setIsStreaming(true);
    }
  }, [stream, isStreaming]);

  /**
   * Manual snipe
   */
  const handleManualSnipe = useCallback(async (token: PumpFunToken) => {
    const analysis = analyses.get(token.mint);
    if (!analysis) {
      // Analyze first
      await analyzeToken(token);
      return;
    }
    await executeSnipe(token, analysis);
  }, [analyses, analyzeToken, executeSnipe]);

  const tokenList = Array.from(tokens.values()).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Pump.fun AI Sniper
            </h1>
            <p className="text-gray-400 mt-1">Real-time token launch detection with AI-powered sniping</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={toggleStream}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                isStreaming
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {isStreaming ? (
                <>
                  <Square className="w-5 h-5" />
                  Stop Stream
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  Start Stream
                </>
              )}
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Back
              </button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard label="Tokens Detected" value={stats.tokensDetected} icon={<Target />} />
          <StatCard label="Analyzed" value={stats.tokensAnalyzed} icon={<Zap />} />
          <StatCard label="Snipes" value={stats.snipesSuccessful} icon={<CheckCircle />} />
          <StatCard label="Total Invested" value={`${stats.totalInvested.toFixed(3)} SOL`} icon={<DollarSign />} />
        </div>

        {/* Configuration Panel */}
        {showConfig && (
          <div className="bg-gray-800 rounded-xl p-6 mb-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">Sniper Configuration</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Enable Auto-Analysis</label>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig(prev => ({ ...prev, enabled: e.target.checked }))}
                  className="w-5 h-5"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-gray-300">Auto-Snipe</label>
                <input
                  type="checkbox"
                  checked={config.autoSnipe}
                  onChange={(e) => setConfig(prev => ({ ...prev, autoSnipe: e.target.checked }))}
                  className="w-5 h-5"
                  disabled={!config.enabled}
                />
              </div>
              <div>
                <label className="text-gray-300 block mb-2">Max Investment (SOL)</label>
                <input
                  type="number"
                  value={config.maxInvestment}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxInvestment: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg"
                  step="0.01"
                  min="0"
                />
              </div>
              <div>
                <label className="text-gray-300 block mb-2">Min Confidence (%)</label>
                <input
                  type="number"
                  value={config.minConfidence}
                  onChange={(e) => setConfig(prev => ({ ...prev, minConfidence: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>
        )}

        {/* Token List */}
        <div className="space-y-4">
          {tokenList.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              {isStreaming ? 'Waiting for new token launches...' : 'Start stream to detect new tokens'}
            </div>
          ) : (
            tokenList.map((token) => {
              const analysis = analyses.get(token.mint);
              const isSniped = snipedTokens.has(token.mint);
              
              return (
                <TokenCard
                  key={token.mint}
                  token={token}
                  analysis={analysis}
                  isSniped={isSniped}
                  onSnipe={() => handleManualSnipe(token)}
                  onAnalyze={() => analyzeToken(token)}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className="text-purple-400">{Icon}</div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function TokenCard({
  token,
  analysis,
  isSniped,
  onSnipe,
  onAnalyze,
}: {
  token: PumpFunToken;
  analysis?: SnipingAnalysis;
  isSniped: boolean;
  onSnipe: () => void;
  onAnalyze: () => void;
}) {
  const riskColors = {
    low: 'text-green-400',
    medium: 'text-yellow-400',
    high: 'text-orange-400',
    very_high: 'text-red-400',
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-xl font-bold">{token.name}</h3>
            <span className="text-purple-400 font-mono text-sm">{token.symbol}</span>
            {isSniped && (
              <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-full">
                Sniped
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm font-mono mb-2">{token.mint.slice(0, 8)}...{token.mint.slice(-8)}</p>
          <div className="flex items-center gap-4 text-sm text-gray-300">
            <span>Price: {token.price.toFixed(6)} SOL</span>
            <span>MCap: {token.marketCap.toFixed(2)} SOL</span>
            <span>Holders: {token.holders}</span>
            <span>Progress: {token.bondingCurveProgress.toFixed(1)}%</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!analysis && (
            <button
              onClick={onAnalyze}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors"
            >
              Analyze
            </button>
          )}
          {analysis && !isSniped && (
            <button
              onClick={onSnipe}
              disabled={!analysis.shouldSnipe}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                analysis.shouldSnipe
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Snipe
            </button>
          )}
        </div>
      </div>

      {analysis && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">AI Analysis</span>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${riskColors[analysis.riskLevel]}`}>
                    {analysis.riskLevel.toUpperCase()}
                  </span>
                  <span className="text-purple-400 text-sm">{analysis.confidence}%</span>
                </div>
              </div>
              {analysis.shouldSnipe ? (
                <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>Recommended to Snipe</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-2">
                  <XCircle className="w-4 h-4" />
                  <span>Not Recommended</span>
                </div>
              )}
              {analysis.reasons.length > 0 && (
                <div className="mb-2">
                  <p className="text-gray-400 text-xs mb-1">Reasons:</p>
                  <ul className="text-xs text-gray-300 space-y-1">
                    {analysis.reasons.map((reason, i) => (
                      <li key={i}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div>
              {analysis.warnings.length > 0 && (
                <div className="mb-2">
                  <p className="text-gray-400 text-xs mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-400" />
                    Warnings:
                  </p>
                  <ul className="text-xs text-yellow-400 space-y-1">
                    {analysis.warnings.map((warning, i) => (
                      <li key={i}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.expectedProfit && (
                <div className="text-sm">
                  <span className="text-gray-400">Expected Profit: </span>
                  <span className="text-green-400 font-semibold">
                    {analysis.expectedProfit.toFixed(4)} SOL
                  </span>
                </div>
              )}
              {analysis.maxInvestment && (
                <div className="text-sm">
                  <span className="text-gray-400">Max Investment: </span>
                  <span className="text-white font-semibold">
                    {analysis.maxInvestment.toFixed(4)} SOL
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

