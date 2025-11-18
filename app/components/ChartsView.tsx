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

  // Generate sample price data
  useEffect(() => {
    const generatePriceData = () => {
      const data = [];
      const now = Date.now();
      let price = 100;
      
      for (let i = 0; i < 24; i++) {
        const timestamp = new Date(now - (23 - i) * 60 * 60 * 1000);
        price += (Math.random() - 0.5) * 5;
        const volume = Math.random() * 1000000;
        
        data.push({
          timestamp,
          price: Math.max(50, price),
          volume,
          high: price + Math.random() * 2,
          low: price - Math.random() * 2,
          open: price - (Math.random() - 0.5) * 1,
          close: price,
        });
      }
      
      setPriceData(data);
    };

    generatePriceData();
  }, []);

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
          <PriceChart
            tokenPair="SOL/USDC"
            data={priceData}
            timeframe="24h"
            showVolume={true}
            height={500}
          />
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

