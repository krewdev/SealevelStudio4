'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Zap,
  DollarSign,
  Percent,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { ArbitrageOpportunity } from '@/app/lib/pools/types';

interface ArbitrageVisualizationProps {
  opportunities: ArbitrageOpportunity[];
  selectedOpportunity?: ArbitrageOpportunity | null;
  onSelectOpportunity?: (opportunity: ArbitrageOpportunity) => void;
}

export function ArbitrageVisualization({
  opportunities,
  selectedOpportunity,
  onSelectOpportunity,
}: ArbitrageVisualizationProps) {
  const [viewMode, setViewMode] = useState<'profit' | 'confidence' | 'path'>('profit');

  // Prepare data for profit vs confidence scatter
  const scatterData = opportunities.map(opp => ({
    profit: opp.profit,
    profitPercent: opp.profitPercent,
    confidence: opp.confidence * 100,
    type: opp.type,
    id: opp.id,
  }));

  // Prepare path visualization data
  const pathData = selectedOpportunity
    ? selectedOpportunity.path.steps.map((step, index) => ({
        step: index + 1,
        pool: step.pool.id.slice(0, 8),
        dex: step.dex,
        price: step.price,
        tokenIn: step.tokenIn.symbol,
        tokenOut: step.tokenOut.symbol,
      }))
    : [];

  const formatPrice = (value: number) => {
    if (value >= 1) return value.toFixed(2);
    if (value >= 0.01) return value.toFixed(4);
    return value.toFixed(6);
  };

  const getOpportunityColor = (type: string) => {
    switch (type) {
      case 'simple':
        return '#10b981'; // green
      case 'multi_hop':
        return '#3b82f6'; // blue
      case 'cross_protocol':
        return '#8b5cf6'; // purple
      default:
        return '#6b7280'; // gray
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-modern p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Arbitrage Opportunities</h3>
          <div className="flex gap-2">
            {(['profit', 'confidence', 'path'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  viewMode === mode
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">Total Opportunities</p>
            <p className="text-2xl font-bold text-white">{opportunities.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Best Profit</p>
            <p className="text-2xl font-bold text-green-400">
              {opportunities.length > 0
                ? `${formatPrice(opportunities[0].profit)} SOL`
                : '0 SOL'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Avg Confidence</p>
            <p className="text-2xl font-bold text-blue-400">
              {opportunities.length > 0
                ? `${(
                    opportunities.reduce((sum, opp) => sum + opp.confidence, 0) /
                    opportunities.length
                  ).toFixed(1)}%`
                : '0%'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Types</p>
            <div className="flex gap-2 mt-1">
              {['simple', 'multi_hop', 'cross_protocol'].map(type => {
                const count = opportunities.filter(opp => opp.type === type).length;
                if (count === 0) return null;
                return (
                  <span
                    key={type}
                    className="px-2 py-1 text-xs rounded"
                    style={{
                      backgroundColor: `${getOpportunityColor(type)}20`,
                      color: getOpportunityColor(type),
                    }}
                  >
                    {type}: {count}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Profit vs Confidence Scatter */}
      {viewMode === 'profit' && (
        <div className="card-modern p-6">
          <h4 className="text-lg font-bold mb-4">Profit vs Confidence</h4>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                dataKey="confidence"
                name="Confidence"
                unit="%"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                type="number"
                dataKey="profit"
                name="Profit"
                unit=" SOL"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
                        <p className="text-sm font-bold text-white mb-2">
                          Opportunity {data.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-gray-300">
                          Profit: <span className="text-green-400">{formatPrice(data.profit)} SOL</span>
                        </p>
                        <p className="text-sm text-gray-300">
                          Profit %: <span className="text-blue-400">{data.profitPercent.toFixed(2)}%</span>
                        </p>
                        <p className="text-sm text-gray-300">
                          Confidence: <span className="text-purple-400">{data.confidence.toFixed(1)}%</span>
                        </p>
                        <p className="text-sm text-gray-300">
                          Type: <span className="text-yellow-400">{data.type}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                name="Opportunities"
                data={scatterData}
                fill="#3b82f6"
                onClick={(data: any) => {
                  const opp = opportunities.find(o => o.id === data.id);
                  if (opp && onSelectOpportunity) {
                    onSelectOpportunity(opp);
                  }
                }}
              >
                {scatterData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getOpportunityColor(entry.type)}
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Confidence Distribution */}
      {viewMode === 'confidence' && (
        <div className="card-modern p-6">
          <h4 className="text-lg font-bold mb-4">Confidence Distribution</h4>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={opportunities
                .sort((a, b) => a.confidence - b.confidence)
                .map((opp, index) => ({
                  index,
                  confidence: opp.confidence * 100,
                  profit: opp.profit,
                  type: opp.type,
                }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="index"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                label={{ value: 'Opportunity Index', position: 'insideBottom', offset: -5 }}
              />
              <YAxis
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
                label={{ value: 'Confidence %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                formatter={(value: number) => `${value.toFixed(1)}%`}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              />
              <Line
                type="monotone"
                dataKey="confidence"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Path Visualization */}
      {viewMode === 'path' && selectedOpportunity && (
        <div className="card-modern p-6">
          <h4 className="text-lg font-bold mb-4">Arbitrage Path</h4>
          <div className="flex items-center gap-4 overflow-x-auto pb-4">
            {pathData.map((step, index) => (
              <React.Fragment key={index}>
                <div className="flex flex-col items-center gap-2 p-4 bg-gray-800/50 rounded-lg border border-gray-700 min-w-[150px]">
                  <div className="text-xs text-gray-400">{step.dex}</div>
                  <div className="text-sm font-bold text-white">
                    {step.tokenIn} → {step.tokenOut}
                  </div>
                  <div className="text-xs text-blue-400">
                    Price: {formatPrice(step.price)}
                  </div>
                  <div className="text-xs text-gray-500 font-mono">{step.pool}</div>
                </div>
                {index < pathData.length - 1 && (
                  <ArrowRight className="w-6 h-6 text-gray-500 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Total Profit</p>
              <p className="text-xl font-bold text-green-400">
                {formatPrice(selectedOpportunity.profit)} SOL
              </p>
              <p className="text-sm text-gray-400">
                {selectedOpportunity.profitPercent.toFixed(2)}%
              </p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Confidence</p>
              <p className="text-xl font-bold text-blue-400">
                {(selectedOpportunity.confidence * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-400">
                {selectedOpportunity.path.totalHops} hops
              </p>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Path Type</p>
              <p className="text-xl font-bold text-purple-400 capitalize">
                {selectedOpportunity.type.replace('_', ' ')}
              </p>
              <p className="text-sm text-gray-400">
                {selectedOpportunity.path.steps.length} steps
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Opportunity List */}
      <div className="card-modern p-6">
        <h4 className="text-lg font-bold mb-4">Opportunities List</h4>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {opportunities.map(opp => (
            <div
              key={opp.id}
              onClick={() => onSelectOpportunity?.(opp)}
              className={`p-4 rounded-lg border cursor-pointer transition-all hover:scale-105 ${
                selectedOpportunity?.id === opp.id
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="px-2 py-1 text-xs rounded capitalize"
                      style={{
                        backgroundColor: `${getOpportunityColor(opp.type)}20`,
                        color: getOpportunityColor(opp.type),
                      }}
                    >
                      {opp.type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-400">
                      {opp.path.startToken.symbol} → {opp.path.endToken.symbol}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-green-400 font-bold">
                      {formatPrice(opp.profit)} SOL
                    </span>
                    <span className="text-blue-400">
                      {opp.profitPercent.toFixed(2)}%
                    </span>
                    <span className="text-purple-400">
                      {(opp.confidence * 100).toFixed(1)}% confidence
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-gray-400">
                    {opp.path.totalHops} hops
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

