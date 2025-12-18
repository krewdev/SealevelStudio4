'use client';

import React, { useState, useEffect } from 'react';
import { useUser } from '../contexts/UserContext';
import { getRecentTransactions } from '../lib/transactions/logger';
import { ExternalLink, Loader2, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface RecentTransactionsProps {
  featureName?: string;
  limit?: number;
  showHeader?: boolean;
}

interface Transaction {
  id: number;
  featureName: string;
  transactionType: string;
  transactionSignature?: string;
  transactionData?: any;
  status: 'pending' | 'success' | 'failed' | 'cancelled';
  errorMessage?: string;
  network: string;
  createdAt: string;
  updatedAt: string;
}

export function RecentTransactions({ 
  featureName, 
  limit = 10,
  showHeader = true 
}: RecentTransactionsProps) {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadTransactions = async () => {
    if (!user?.walletAddress) {
      setIsLoading(false);
      return;
    }

    try {
      const result = await getRecentTransactions(
        user.walletAddress,
        featureName,
        limit
      );

      if (result.success && result.transactions) {
        setTransactions(result.transactions);
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [user?.walletAddress, featureName, limit]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTransactions();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400 animate-pulse" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400 bg-green-500/10 border-green-500/30';
      case 'failed':
        return 'text-red-400 bg-red-500/10 border-red-500/30';
      case 'cancelled':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!user) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center justify-center space-x-3">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <span className="text-sm text-gray-400">Loading transactions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-400" />
            Recent Transactions
            {featureName && (
              <span className="text-sm text-gray-400 font-normal">({featureName})</span>
            )}
          </h3>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {transactions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-400 text-sm">No transactions yet</p>
          <p className="text-gray-500 text-xs mt-1">Your transactions will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-gray-900/50 border border-gray-700/50 rounded-lg p-4 hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusIcon(tx.status)}
                    <span className={`text-xs font-medium px-2 py-1 rounded border ${getStatusColor(tx.status)}`}>
                      {tx.status.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">{tx.featureName}</span>
                  </div>
                  <p className="text-sm text-gray-300 font-medium mb-1">
                    {tx.transactionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  {tx.transactionSignature && (
                    <div className="flex items-center gap-2 mt-2">
                      <a
                        href={`https://solscan.io/tx/${tx.transactionSignature}?cluster=${tx.network}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-mono"
                      >
                        {tx.transactionSignature.slice(0, 8)}...{tx.transactionSignature.slice(-8)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {tx.errorMessage && (
                    <p className="text-xs text-red-400 mt-2">{tx.errorMessage}</p>
                  )}
                </div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDate(tx.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

