'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Users, 
  TrendingUp, 
  Clock, 
  Zap, 
  DollarSign,
  ArrowLeft,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

interface UserAnalytics {
  userId: string;
  trialStatus: {
    isActive: boolean;
    startDate: Date;
    endDate: Date;
    remainingDays: number;
    totalUsage: number;
    featuresUsed: Record<string, number>;
  } | null;
  usageStats: {
    features: Record<string, number>;
    totalCost: number;
    totalPaid: number;
  };
  totalRecords: number;
  recentActivity: Array<{
    feature: string;
    timestamp: Date;
    cost: number;
  }>;
}

interface AdminAnalyticsData {
  summary: {
    totalUsers: number;
    activeTrials: number;
    expiredTrials: number;
    totalUsage: number;
    totalCost: number;
    totalPaid: number;
    period: string;
  };
  featureUsage: Record<string, number>;
  dailyUsage: Array<{ date: string; count: number }>;
  users: UserAnalytics[];
}

interface AdminAnalyticsProps {
  onBack?: () => void;
}

export function AdminAnalytics({ onBack }: AdminAnalyticsProps) {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all_time'>('all_time');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/analytics?period=${period}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }
      const analyticsData = await response.json();
      
      // Convert date strings to Date objects
      analyticsData.users = analyticsData.users.map((user: any) => ({
        ...user,
        trialStatus: user.trialStatus ? {
          ...user.trialStatus,
          startDate: new Date(user.trialStatus.startDate),
          endDate: new Date(user.trialStatus.endDate),
        } : null,
        recentActivity: user.recentActivity.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp),
        })),
      }));
      
      setData(analyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
          <p className="text-red-400">Error: {error}</p>
          <button
            onClick={fetchAnalytics}
            className="mt-4 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-lg text-white"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const selectedUserData = selectedUser 
    ? data.users.find(u => u.userId === selectedUser)
    : null;

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-700 p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 size={28} />
              Admin Analytics
            </h1>
            <p className="text-gray-400 text-sm mt-1">Usage statistics and user analytics</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="all_time">All Time</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Users</span>
              <Users size={20} className="text-blue-400" />
            </div>
            <p className="text-2xl font-bold">{data.summary.totalUsers}</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Active Trials</span>
              <Zap size={20} className="text-green-400" />
            </div>
            <p className="text-2xl font-bold">{data.summary.activeTrials}</p>
            <p className="text-xs text-gray-500 mt-1">
              {data.summary.expiredTrials} expired
            </p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Usage</span>
              <TrendingUp size={20} className="text-purple-400" />
            </div>
            <p className="text-2xl font-bold">{data.summary.totalUsage.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">feature uses</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Total Cost</span>
              <DollarSign size={20} className="text-yellow-400" />
            </div>
            <p className="text-2xl font-bold">{data.summary.totalCost.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">
              {data.summary.totalPaid.toLocaleString()} paid
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Feature Usage Breakdown */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Feature Usage</h2>
            <div className="space-y-3">
              {Object.entries(data.featureUsage)
                .sort(([, a], [, b]) => b - a)
                .map(([feature, count]) => (
                  <div key={feature}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-300 capitalize">
                        {feature.replace(/_/g, ' ')}
                      </span>
                      <span className="text-sm font-semibold">{count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 rounded-full h-2 transition-all"
                        style={{
                          width: `${(count / Math.max(...Object.values(data.featureUsage))) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          {/* Daily Usage Trend */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-lg font-bold mb-4">Daily Usage Trend (Last 30 Days)</h2>
            <div className="space-y-2">
              {data.dailyUsage.slice(-7).map(({ date, count }) => (
                <div key={date} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-20">
                    {new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex-1 bg-gray-700 rounded-full h-4 relative">
                    <div
                      className="bg-green-500 rounded-full h-4 transition-all"
                      style={{
                        width: `${(count / Math.max(...data.dailyUsage.map(d => d.count), 1)) * 100}%`
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-300 w-12 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-gray-800 rounded-lg border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <h2 className="text-lg font-bold">Users ({data.users.length})</h2>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full">
              <thead className="bg-gray-900">
                <tr>
                  <th className="text-left p-4 text-sm text-gray-400">User ID</th>
                  <th className="text-left p-4 text-sm text-gray-400">Trial Status</th>
                  <th className="text-left p-4 text-sm text-gray-400">Usage</th>
                  <th className="text-left p-4 text-sm text-gray-400">Records</th>
                  <th className="text-left p-4 text-sm text-gray-400">Last Activity</th>
                  <th className="text-left p-4 text-sm text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr
                    key={user.userId}
                    className="border-b border-gray-700 hover:bg-gray-750 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-mono text-sm">
                        {user.userId.slice(0, 8)}...{user.userId.slice(-6)}
                      </div>
                    </td>
                    <td className="p-4">
                      {user.trialStatus ? (
                        <div className="text-sm">
                          <div className={`inline-block px-2 py-1 rounded text-xs ${
                            user.trialStatus.isActive
                              ? 'bg-green-900/50 text-green-400'
                              : 'bg-red-900/50 text-red-400'
                          }`}>
                            {user.trialStatus.isActive ? 'Active' : 'Expired'}
                          </div>
                          {user.trialStatus.isActive && (
                            <div className="text-xs text-gray-400 mt-1">
                              {user.trialStatus.remainingDays} days left
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500 text-sm">No trial</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <div className="font-semibold">{user.trialStatus?.totalUsage || 0}</div>
                        <div className="text-xs text-gray-400">
                          Cost: {user.usageStats.totalCost} SEAL
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm">{user.totalRecords}</td>
                    <td className="p-4 text-sm text-gray-400">
                      {user.recentActivity[0] 
                        ? new Date(user.recentActivity[0].timestamp).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => setSelectedUser(selectedUser === user.userId ? null : user.userId)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        {selectedUser === user.userId ? 'Hide' : 'Details'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* User Details Modal */}
          {selectedUserData && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-800 rounded-lg border border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto custom-scrollbar">
                <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                  <h3 className="text-lg font-bold">User Details</h3>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-sm text-gray-400">User ID</label>
                    <p className="font-mono text-sm mt-1">{selectedUserData.userId}</p>
                  </div>
                  
                  {selectedUserData.trialStatus && (
                    <div>
                      <label className="text-sm text-gray-400">Trial Status</label>
                      <div className="mt-1 space-y-1">
                        <p>Active: {selectedUserData.trialStatus.isActive ? 'Yes' : 'No'}</p>
                        <p>Start: {selectedUserData.trialStatus.startDate.toLocaleDateString()}</p>
                        <p>End: {selectedUserData.trialStatus.endDate.toLocaleDateString()}</p>
                        <p>Remaining: {selectedUserData.trialStatus.remainingDays} days</p>
                        <p>Total Usage: {selectedUserData.trialStatus.totalUsage}</p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-sm text-gray-400">Feature Usage</label>
                    <div className="mt-2 space-y-2">
                      {Object.entries(selectedUserData.usageStats.features)
                        .filter(([, count]) => count > 0)
                        .map(([feature, count]) => (
                          <div key={feature} className="flex justify-between text-sm">
                            <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                            <span className="font-semibold">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm text-gray-400">Recent Activity</label>
                    <div className="mt-2 space-y-1">
                      {selectedUserData.recentActivity.map((activity, idx) => (
                        <div key={idx} className="text-sm flex justify-between">
                          <span className="capitalize">{activity.feature.replace(/_/g, ' ')}</span>
                          <span className="text-gray-400">
                            {activity.timestamp.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

