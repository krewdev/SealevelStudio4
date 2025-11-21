'use client';

import React, { useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Users,
  Zap,
  BarChart3,
} from 'lucide-react';

interface AnalyticsData {
  revenue: Array<{ date: string; value: number }>;
  transactions: Array<{ date: string; count: number; volume: number }>;
  userGrowth: Array<{ date: string; users: number }>;
  featureUsage: Array<{ name: string; value: number; color: string }>;
  performance: {
    avgResponseTime: number;
    successRate: number;
    totalRequests: number;
    errorRate: number;
  };
}

interface AnalyticsDashboardProps {
  data: AnalyticsData;
  timeframe?: '24h' | '7d' | '30d' | 'all';
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444'];

export function AnalyticsDashboard({ data, timeframe = '7d' }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'revenue' | 'users' | 'performance'>('overview');

  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatNumber = (value: number) => {
    if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
    return value.toFixed(0);
  };

  const totalRevenue = data.revenue.reduce((sum, item) => sum + item.value, 0);
  const totalTransactions = data.transactions.reduce((sum, item) => sum + item.count, 0);
  const totalVolume = data.transactions.reduce((sum, item) => sum + item.volume, 0);
  const currentUsers = data.userGrowth[data.userGrowth.length - 1]?.users || 0;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-modern p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12.5%
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-400 opacity-50" />
          </div>
        </div>

        <div className="card-modern p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Transactions</p>
              <p className="text-2xl font-bold text-white">{formatNumber(totalTransactions)}</p>
              <p className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {formatNumber(totalVolume)} volume
              </p>
            </div>
            <Zap className="w-8 h-8 text-blue-400 opacity-50" />
          </div>
        </div>

        <div className="card-modern p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Active Users</p>
              <p className="text-2xl font-bold text-white">{formatNumber(currentUsers)}</p>
              <p className="text-xs text-purple-400 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +8.2%
              </p>
            </div>
            <Users className="w-8 h-8 text-purple-400 opacity-50" />
          </div>
        </div>

        <div className="card-modern p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">Success Rate</p>
              <p className="text-2xl font-bold text-white">{data.performance.successRate.toFixed(1)}%</p>
              <p className="text-xs text-gray-400 mt-1">
                {data.performance.avgResponseTime}ms avg
              </p>
            </div>
            <BarChart3 className="w-8 h-8 text-yellow-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {(['overview', 'revenue', 'users', 'performance'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === tab
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="card-modern p-6">
            <h3 className="text-lg font-bold mb-4">Revenue Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
                <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} tickFormatter={formatCurrency} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Feature Usage */}
          <div className="card-modern p-6">
            <h3 className="text-lg font-bold mb-4">Feature Usage</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.featureUsage}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.featureUsage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="card-modern p-6">
          <h3 className="text-lg font-bold mb-4">Revenue Breakdown</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.revenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} tickFormatter={formatCurrency} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              />
              <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card-modern p-6">
          <h3 className="text-lg font-bold mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.userGrowth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" style={{ fontSize: '12px' }} />
              <YAxis stroke="#9ca3af" style={{ fontSize: '12px' }} tickFormatter={formatNumber} />
              <Tooltip
                formatter={(value: number) => formatNumber(value)}
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
              />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-modern p-6">
            <h3 className="text-lg font-bold mb-4">Request Performance</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="text-white font-medium">{data.performance.successRate}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${data.performance.successRate}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Error Rate</span>
                  <span className="text-white font-medium">{data.performance.errorRate}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-red-500 h-2 rounded-full"
                    style={{ width: `${data.performance.errorRate}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="card-modern p-6">
            <h3 className="text-lg font-bold mb-4">System Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Avg Response Time</span>
                <span className="text-white font-medium">{data.performance.avgResponseTime}ms</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Requests</span>
                <span className="text-white font-medium">{formatNumber(data.performance.totalRequests)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

