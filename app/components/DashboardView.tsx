'use client';

import React, { useState, useMemo } from 'react';
import { Search, TrendingUp, Newspaper, DollarSign, Crown, Trophy, Star, ExternalLink, Copy, CheckCircle, X, Sparkles } from 'lucide-react';
import { CopyButton } from './CopyButton';

interface LeaderboardEntry {
  rank: number;
  address: string;
  volume: string;
  transactions: number;
  rewards: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  url?: string;
}

const EXAMPLE_ADDRESSES = [
  { name: 'Solana Program Library', address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', description: 'SPL Token Program' },
  { name: 'System Program', address: '11111111111111111111111111111111', description: 'Solana System Program' },
  { name: 'Metaplex Token Metadata', address: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s', description: 'NFT Metadata Program' },
  { name: 'Raydium AMM', address: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', description: 'DEX AMM Program' },
  { name: 'Jupiter Aggregator', address: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', description: 'Token Swap Aggregator' },
];

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', volume: '1,234.56 SOL', transactions: 1247, rewards: '12.34 SOL' },
  { rank: 2, address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', volume: '987.65 SOL', transactions: 892, rewards: '9.87 SOL' },
  { rank: 3, address: 'GjJyeC1rB3h2kV4cJfF6JpJv8kL9mN2oP3qR4sT5uV6wX', volume: '765.43 SOL', transactions: 654, rewards: '7.65 SOL' },
  { rank: 4, address: 'HkK7yC1rB3h2kV4cJfF6JpJv8kL9mN2oP3qR4sT5uV6wX', volume: '543.21 SOL', transactions: 432, rewards: '5.43 SOL' },
  { rank: 5, address: 'IkL8yC1rB3h2kV4cJfF6JpJv8kL9mN2oP3qR4sT5uV6wX', volume: '321.09 SOL', transactions: 321, rewards: '3.21 SOL' },
];

const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Solana Network Upgrade Improves Transaction Speed',
    summary: 'Latest network upgrade reduces transaction finality time by 40%',
    source: 'Solana Foundation',
    date: '2 hours ago',
    url: 'https://solana.com'
  },
  {
    id: '2',
    title: 'New DeFi Protocol Launches on Solana',
    summary: 'High-yield lending protocol offers competitive APY for SOL staking',
    source: 'DeFi Pulse',
    date: '5 hours ago',
  },
  {
    id: '3',
    title: 'NFT Marketplace Sees Record Volume',
    summary: 'Solana NFT marketplace breaks daily volume record with $2M in sales',
    source: 'NFT News',
    date: '1 day ago',
  },
];

interface DashboardViewProps {
  onSearchAddress: (address: string) => void;
  onNavigateToInspector: () => void;
}

export function DashboardView({ onSearchAddress, onNavigateToInspector }: DashboardViewProps) {
  // Memoize example addresses to avoid recreation on every render
  const memoizedExampleAddresses = useMemo(() => EXAMPLE_ADDRESSES, []);
  const memoizedLeaderboard = useMemo(() => MOCK_LEADERBOARD, []);
  const memoizedNews = useMemo(() => MOCK_NEWS, []);
  const memoizedFeatures = useMemo(() => ['Account Inspector', 'Transaction Builder', 'Arbitrage Scanner', 'AI Agents', 'API Access', 'Priority Support'], []);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddressExamples, setShowAddressExamples] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchAddress(searchQuery.trim());
      onNavigateToInspector();
    }
  };

  const handleExampleClick = (address: string) => {
    setSearchQuery(address);
    setShowAddressExamples(false);
    onSearchAddress(address);
    onNavigateToInspector();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">
            Sealevel Studio Dashboard
          </h1>
          <p className="text-gray-400 text-lg">Your gateway to Solana blockchain tools</p>
        </div>

        {/* Search Bar */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
          <form onSubmit={handleSearch} className="relative">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowAddressExamples(true)}
                  placeholder="Search wallet address, program ID, or transaction signature..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                />
              </div>
              <button
                type="submit"
                className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-purple-500/50 flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </form>

          {/* Example Addresses Popup */}
          {showAddressExamples && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowAddressExamples(false)}
              />
              <div className="absolute z-50 mt-2 w-full bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400" />
                      Try These Example Addresses
                    </h3>
                    <button
                      onClick={() => setShowAddressExamples(false)}
                      className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="p-2">
                  {memoizedExampleAddresses.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleExampleClick(example.address)}
                      className="w-full text-left p-3 hover:bg-gray-800 rounded-lg transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white group-hover:text-purple-400 transition-colors">
                            {example.name}
                          </div>
                          <div className="text-xs text-gray-400 mt-1 font-mono truncate">
                            {example.address}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {example.description}
                          </div>
                        </div>
                        <CopyButton text={example.address} size={14} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Leaderboard - Left Column */}
          <div className="lg:col-span-1 bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Top Users
              </h2>
              <span className="text-xs text-gray-400">This Week</span>
            </div>
            <div className="space-y-3">
              {memoizedLeaderboard.map((entry) => (
                <div
                  key={entry.rank}
                  className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-purple-500/50 transition-colors"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    entry.rank === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                    entry.rank === 2 ? 'bg-gray-400/20 text-gray-300' :
                    entry.rank === 3 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-700/50 text-gray-400'
                  }`}>
                    {entry.rank}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-gray-300 truncate">
                      {entry.address.slice(0, 8)}...{entry.address.slice(-6)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {entry.transactions} txns • {entry.volume}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-green-400">
                      +{entry.rewards}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 py-2 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              View Full Leaderboard →
            </button>
          </div>

          {/* News & Fees - Right Columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* News Section */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Newspaper className="w-6 h-6 text-blue-400" />
                  Latest News
                </h2>
                <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                  View All →
                </button>
              </div>
              <div className="space-y-4">
                {memoizedNews.map((news) => (
                  <div
                    key={news.id}
                    className="p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 hover:border-blue-500/50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-white mb-2 hover:text-blue-400 transition-colors">
                          {news.title}
                        </h3>
                        <p className="text-xs text-gray-400 mb-2">
                          {news.summary}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{news.source}</span>
                          <span>•</span>
                          <span>{news.date}</span>
                        </div>
                      </div>
                      {news.url && (
                        <ExternalLink className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Fees & Subscription */}
            <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-xl p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Crown className="w-6 h-6 text-yellow-400" />
                  Pricing & Fees
                </h2>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full border border-green-500/30">
                  Free Tier Available
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Transaction Fees */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="w-5 h-5 text-green-400" />
                    <h3 className="text-sm font-semibold text-white">Transaction Fees</h3>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-gray-300">
                      <span>Standard Transaction</span>
                      <span className="font-mono">0.000005 SOL</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Priority Transaction</span>
                      <span className="font-mono">0.0001 SOL</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Token Transfer</span>
                      <span className="font-mono">0.000005 SOL</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Fees are paid directly to Solana validators, not to Sealevel Studio
                  </p>
                </div>

                {/* Subscription Tiers */}
                <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <h3 className="text-sm font-semibold text-white">Subscription Plans</h3>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                      <div>
                        <div className="font-semibold text-white">Free</div>
                        <div className="text-gray-400">Basic features</div>
                      </div>
                      <span className="text-green-400 font-bold">$0/mo</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded border border-purple-500/30">
                      <div>
                        <div className="font-semibold text-white">Pro</div>
                        <div className="text-gray-400">Advanced tools</div>
                      </div>
                      <span className="text-purple-400 font-bold">$29/mo</span>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-yellow-500/10 rounded border border-yellow-500/30">
                      <div>
                        <div className="font-semibold text-white">Enterprise</div>
                        <div className="text-gray-400">Full access</div>
                      </div>
                      <span className="text-yellow-400 font-bold">$99/mo</span>
                    </div>
                  </div>
                  <button className="w-full mt-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold transition-all">
                    View Full Pricing →
                  </button>
                </div>
              </div>

              {/* Features Comparison */}
              <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50">
                <h3 className="text-sm font-semibold text-white mb-3">What's Included</h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {memoizedFeatures.map((feature) => (
                    <div key={feature} className="flex items-center gap-2 text-gray-300">
                      <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

