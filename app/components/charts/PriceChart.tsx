'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { TrendingUp, TrendingDown, Clock, DollarSign } from 'lucide-react';

interface PriceDataPoint {
  timestamp: Date;
  price: number;
  volume?: number;
  high?: number;
  low?: number;
  open?: number;
  close?: number;
}

interface PriceChartProps {
  tokenPair: string;
  data: PriceDataPoint[];
  timeframe?: '1h' | '4h' | '24h' | '7d' | '30d';
  showVolume?: boolean;
  showCandles?: boolean;
  height?: number;
}

export function PriceChart({
  tokenPair,
  data,
  timeframe = '24h',
  showVolume = false,
  showCandles = false,
  height = 400,
}: PriceChartProps) {
  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [priceChange, setPriceChange] = useState<{ value: number; percent: number } | null>(null);

  useEffect(() => {
    if (data.length >= 2) {
      const first = data[0].price;
      const last = data[data.length - 1].price;
      const change = last - first;
      const percent = (change / first) * 100;
      setPriceChange({ value: change, percent });
    }
  }, [data]);

  // Format data for chart
  const chartData = data.map((point) => ({
    time: point.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    timestamp: point.timestamp.getTime(),
    price: point.price,
    volume: point.volume || 0,
    high: point.high || point.price,
    low: point.low || point.price,
    open: point.open || point.price,
    close: point.close || point.price,
  }));

  const formatPrice = (value: number) => {
    if (value >= 1) return `$${value.toFixed(2)}`;
    if (value >= 0.01) return `$${value.toFixed(4)}`;
    return `$${value.toFixed(6)}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(2);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-sm text-gray-400 mb-2">{data.time}</p>
          <p className="text-lg font-bold text-white">
            {formatPrice(data.price)}
          </p>
          {data.volume && showVolume && (
            <p className="text-sm text-gray-400 mt-1">
              Volume: {formatVolume(data.volume)}
            </p>
          )}
          {showCandles && (
            <div className="mt-2 space-y-1 text-xs">
              <p className="text-green-400">High: {formatPrice(data.high)}</p>
              <p className="text-red-400">Low: {formatPrice(data.low)}</p>
              <p className="text-blue-400">Open: {formatPrice(data.open)}</p>
              <p className="text-purple-400">Close: {formatPrice(data.close)}</p>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="card-modern p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-white">{tokenPair}</h3>
          {priceChange && (
            <div className="flex items-center gap-2 mt-1">
              {priceChange.percent >= 0 ? (
                <TrendingUp className="w-4 h-4 text-green-400" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  priceChange.percent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {priceChange.percent >= 0 ? '+' : ''}
                {priceChange.percent.toFixed(2)}% ({formatPrice(priceChange.value)})
              </span>
              <span className="text-xs text-gray-400">
                {timeframe}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setChartType('line')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              chartType === 'line'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('area')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              chartType === 'area'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Area
          </button>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        {chartType === 'area' ? (
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tickFormatter={formatPrice}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#priceGradient)"
            />
            {showVolume && (
              <Area
                type="monotone"
                dataKey="volume"
                stroke="#8b5cf6"
                strokeWidth={1}
                fill="#8b5cf6"
                fillOpacity={0.2}
                yAxisId="volume"
              />
            )}
          </AreaChart>
        ) : (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="time"
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              interval="preserveStartEnd"
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tickFormatter={formatPrice}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>

      {/* Stats */}
      {data.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-700">
          <div>
            <p className="text-xs text-gray-400 mb-1">Current</p>
            <p className="text-lg font-bold text-white">
              {formatPrice(data[data.length - 1].price)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">24h High</p>
            <p className="text-lg font-bold text-green-400">
              {formatPrice(Math.max(...data.map(d => d.high || d.price)))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">24h Low</p>
            <p className="text-lg font-bold text-red-400">
              {formatPrice(Math.min(...data.map(d => d.low || d.price)))}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Volume</p>
            <p className="text-lg font-bold text-white">
              {formatVolume(data.reduce((sum, d) => sum + (d.volume || 0), 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

