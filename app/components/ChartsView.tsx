'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { PriceChart } from './charts/PriceChart';
import { AnalyticsDashboard } from './charts/AnalyticsDashboard';
import { TransactionFlowDiagram } from './charts/TransactionFlowDiagram';
import { ArbitrageVisualization } from './charts/ArbitrageVisualization';
import { useConnection } from '@solana/wallet-adapter-react';
import { PoolScanner } from '../lib/pools/scanner';
import { ArbitrageDetector } from '../lib/pools/arbitrage';
import { DEFAULT_SCANNER_CONFIG } from '../lib/pools/types';

interface ChartsViewProps {
  onBack?: () => void;
}

export function ChartsView({ onBack }: ChartsViewProps) {
  const { connection } = useConnection();
  const [activeChart, setActiveChart] = useState<'price' | 'analytics' | 'transaction' | 'arbitrage'>('price');
  const [priceData, setPriceData] = useState<any[]>([]);
  const [arbitrageOpportunities, setArbitrageOpportunities] = useState<any[]>([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState<any>(null);
  const [selectedToken, setSelectedToken] = useState<'sol' | 'dot'>('sol');
  const [timeframe, setTimeframe] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);

  // Fetch real price data
  useEffect(() => {
    const fetchPriceData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/prices?token=${selectedToken}&timeframe=${timeframe}`);
        if (!response.ok) {
          throw new Error('Failed to fetch price data');
        }
        
        const result = await response.json();
        if (result.success && result.data) {
          // Convert API data to chart format
          const formattedData = result.data.map((point: any) => ({
            timestamp: new Date(point.timestamp),
            price: point.price,
            volume: point.volume,
            high: point.high,
            low: point.low,
            open: point.open,
            close: point.close,
          }));
          
          setPriceData(formattedData);
          setCurrentPrice(result.currentPrice);
          setPriceChange24h(result.priceChange24h);
        }
      } catch (error) {
        console.error('Error fetching price data:', error);
        // Fallback to empty data on error
        setPriceData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPriceData();
    
    // Refresh every 60 seconds for real-time updates
    const interval = setInterval(fetchPriceData, 60000);
    return () => clearInterval(interval);
  }, [selectedToken, timeframe]);

  // Fetch arbitrage opportunities
  useEffect(() => {
    const fetchArbitrage = async () => {
      try {
        const scanner = new PoolScanner();
        const state = await scanner.scan(connection);
        const detector = new ArbitrageDetector(state.pools, DEFAULT_SCANNER_CONFIG, connection);
        const opportunities = await detector.detectOpportunities();
        setArbitrageOpportunities(opportunities.slice(0, 10)); // Top 10
      } catch (error) {
        console.error('Failed to fetch arbitrage opportunities:', error);
      }
    };

    if (activeChart === 'arbitrage') {
      fetchArbitrage();
    }
  }, [activeChart, connection]);

  // Sample analytics data
  const analyticsData = {
    revenue: [
      { date: 'Mon', value: 1200 },
      { date: 'Tue', value: 1900 },
      { date: 'Wed', value: 3000 },
      { date: 'Thu', value: 2800 },
      { date: 'Fri', value: 3500 },
      { date: 'Sat', value: 4200 },
      { date: 'Sun', value: 3800 },
    ],
    transactions: [
      { date: 'Mon', count: 150, volume: 50000 },
      { date: 'Tue', count: 230, volume: 75000 },
      { date: 'Wed', count: 320, volume: 120000 },
      { date: 'Thu', count: 280, volume: 95000 },
      { date: 'Fri', count: 410, volume: 150000 },
      { date: 'Sat', count: 380, volume: 130000 },
      { date: 'Sun', count: 350, volume: 110000 },
    ],
    userGrowth: [
      { date: 'Mon', users: 1200 },
      { date: 'Tue', users: 1350 },
      { date: 'Wed', users: 1500 },
      { date: 'Thu', users: 1680 },
      { date: 'Fri', users: 1850 },
      { date: 'Sat', users: 2100 },
      { date: 'Sun', users: 2350 },
    ],
    featureUsage: [
      { name: 'Scanner', value: 35, color: '#3b82f6' },
      { name: 'Builder', value: 25, color: '#8b5cf6' },
      { name: 'AI Playground', value: 20, color: '#ec4899' },
      { name: 'Tools', value: 15, color: '#f59e0b' },
      { name: 'Other', value: 5, color: '#10b981' },
    ],
    performance: {
      avgResponseTime: 245,
      successRate: 98.5,
      totalRequests: 125000,
      errorRate: 1.5,
    },
  };

  // Sample transaction flow
  const transactionSteps = [
    {
      id: '1',
      type: 'account' as const,
      label: 'Source Wallet',
      status: 'success' as const,
      details: {
        address: '7Ybw...',
        balance: 10.5,
      },
    },
    {
      id: '2',
      type: 'instruction' as const,
      label: 'Token Transfer',
      status: 'success' as const,
      details: {
        computeUnits: 5000,
        fee: 0.000005,
      },
    },
    {
      id: '3',
      type: 'program' as const,
      label: 'Token Program',
      status: 'success' as const,
      details: {
        address: 'Tokenkeg...',
      },
    },
    {
      id: '4',
      type: 'result' as const,
      label: 'Transaction Complete',
      status: 'success' as const,
      details: {
        computeUnits: 5000,
        fee: 0.000005,
      },
    },
  ];

  return (
    <div className="min-h-screen animated-bg text-white relative">
      {/* Header */}
      <div className="relative z-10 border-b border-slate-800/50 glass p-6">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back</span>
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <BarChart3 className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary">Charts & Visualizations</h1>
              <p className="text-sm text-gray-400 mt-1">Interactive data visualization tools</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Chart Selector */}
        <div className="flex gap-2 mb-6 border-b border-gray-700">
          {(['price', 'analytics', 'transaction', 'arbitrage'] as const).map(chart => (
            <button
              key={chart}
              onClick={() => setActiveChart(chart)}
              className={`px-6 py-3 font-medium transition-colors border-b-2 ${
                activeChart === chart
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {chart.charAt(0).toUpperCase() + chart.slice(1)}
            </button>
          ))}
        </div>

        {/* Price Chart */}
        {activeChart === 'price' && (
          <div className="space-y-4">
            {/* Token and Timeframe Selector */}
            <div className="card-modern p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-300">Token:</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedToken('sol')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedToken === 'sol'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      SOL (Solana)
                    </button>
                    <button
                      onClick={() => setSelectedToken('dot')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedToken === 'dot'
                          ? 'bg-pink-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      DOT (Polkadot)
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-300">Timeframe:</label>
                  <div className="flex gap-2">
                    {(['1h', '24h', '7d', '30d'] as const).map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          timeframe === tf
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Price Info */}
            {currentPrice !== null && (
              <div className="card-modern p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Current Price</p>
                    <p className="text-2xl font-bold text-white mt-1">
                      ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                    </p>
                  </div>
                  {priceChange24h !== null && (
                    <div className="text-right">
                      <p className="text-sm text-gray-400">24h Change</p>
                      <p className={`text-xl font-bold mt-1 ${priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {priceChange24h >= 0 ? '+' : ''}{priceChange24h.toFixed(2)}%
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chart */}
            {loading ? (
              <div className="card-modern p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading price data...</p>
              </div>
            ) : priceData.length > 0 ? (
              <PriceChart
                tokenPair={`${selectedToken.toUpperCase()}/USD`}
                data={priceData}
                timeframe={timeframe}
                showVolume={true}
                height={500}
              />
            ) : (
              <div className="card-modern p-12 text-center">
                <p className="text-gray-400">No price data available</p>
                <p className="text-sm text-gray-500 mt-2">Please try again later</p>
              </div>
            )}
          </div>
        )}

        {/* Analytics Dashboard */}
        {activeChart === 'analytics' && (
          <AnalyticsDashboard data={analyticsData} timeframe="7d" />
        )}

        {/* Transaction Flow */}
        {activeChart === 'transaction' && (
          <TransactionFlowDiagram
            steps={transactionSteps}
            direction="horizontal"
            showDetails={true}
          />
        )}

        {/* Arbitrage Visualization */}
        {activeChart === 'arbitrage' && (
          <ArbitrageVisualization
            opportunities={arbitrageOpportunities}
            selectedOpportunity={selectedOpportunity}
            onSelectOpportunity={setSelectedOpportunity}
          />
        )}
      </div>
    </div>
  );
}

