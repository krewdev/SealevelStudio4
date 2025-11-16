// Sidebar panel for transaction builder

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { X, Zap, RefreshCw, TrendingUp, ArrowRight } from 'lucide-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PoolScanner } from '../lib/pools/scanner';
import { ArbitrageDetector } from '../lib/pools/arbitrage';
import { ArbitrageOpportunity, DEFAULT_SCANNER_CONFIG } from '../lib/pools/types';

interface ArbitragePanelProps {
  onSelectOpportunity: (opportunity: ArbitrageOpportunity) => void;
  onClose: () => void;
}

export function ArbitragePanel({ onSelectOpportunity, onClose }: ArbitragePanelProps) {
  const { connection } = useConnection();
  const [scanner] = useState(() => new PoolScanner());
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);

  const handleQuickScan = useCallback(async () => {
    if (isScanning) return;

    setIsScanning(true);
    try {
      const config = { ...DEFAULT_SCANNER_CONFIG, maxHops: 3 }; // Limit for quick scan
      scanner.updateConfig(config);
      const state = await scanner.scan(connection);
      setLastScanTime(state.lastScanTime);

      if (state.pools.length > 0) {
        const detector = new ArbitrageDetector(state.pools, config, connection);
        const detected = detector.detectOpportunities();
        // Show top 5 opportunities
        setOpportunities(detected.slice(0, 5));
      }
    } catch (error) {
      console.error('Quick scan error:', error);
    } finally {
      setIsScanning(false);
    }
  }, [connection, isScanning, scanner]);

  // Auto-scan on mount
  useEffect(() => {
    handleQuickScan();
  }, []);

  return (
    <div className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={18} />
          <h2 className="font-bold text-slate-200">Arbitrage</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickScan}
            disabled={isScanning}
            className="p-1.5 hover:bg-slate-800 rounded disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={14} className={isScanning ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {opportunities.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            {isScanning ? (
              <div>
                <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                <p className="text-sm">Scanning...</p>
              </div>
            ) : (
              <div>
                <p className="text-sm">No opportunities found</p>
                <button
                  onClick={handleQuickScan}
                  className="mt-4 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 rounded text-sm"
                >
                  Scan Again
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-slate-800 border border-slate-700 rounded p-3 hover:border-teal-500 transition-colors cursor-pointer"
                onClick={() => onSelectOpportunity(opp)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-medium">{opp.path.startToken.symbol}</span>
                    {opp.path.steps.slice(0, 2).map((step, i) => (
                      <React.Fragment key={i}>
                        <ArrowRight size={10} className="text-slate-500" />
                        <span className="text-slate-500">{step.dex}</span>
                        <ArrowRight size={10} className="text-slate-500" />
                        <span className="font-medium">{step.tokenOut.symbol}</span>
                      </React.Fragment>
                    ))}
                    {opp.path.totalHops > 2 && (
                      <span className="text-slate-500">+{opp.path.totalHops - 2}</span>
                    )}
                  </div>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    opp.confidence >= 0.7 ? 'bg-green-900/50 text-green-400' :
                    opp.confidence >= 0.4 ? 'bg-yellow-900/50 text-yellow-400' :
                    'bg-red-900/50 text-red-400'
                  }`}>
                    {(opp.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-green-400 font-bold text-sm">
                      {opp.profit.toFixed(4)} SOL
                    </div>
                    <div className="text-xs text-slate-400">
                      {opp.profitPercent.toFixed(2)}%
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectOpportunity(opp);
                    }}
                    className="px-2 py-1 bg-teal-600 hover:bg-teal-700 rounded text-xs flex items-center gap-1"
                  >
                    <Zap size={12} />
                    Build
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {lastScanTime && (
        <div className="p-3 border-t border-slate-800 text-xs text-slate-400 text-center">
          Last scan: {lastScanTime.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}

