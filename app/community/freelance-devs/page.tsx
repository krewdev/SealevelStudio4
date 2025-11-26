'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  MessageSquare,
  DollarSign,
  TrendingUp,
  Newspaper,
  Briefcase,
  Lightbulb,
  Megaphone,
  Filter,
  Clock,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Bookmark,
  Flag
} from 'lucide-react';
import { LogoWatermark } from '@/app/components/LogoWatermark';

interface ForumPost {
  id: string;
  type: 'job' | 'discussion' | 'advertisement' | 'news';
  title: string;
  content: string;
  author: string;
  avatar: string;
  timestamp: Date;
  views: number;
  likes: number;
  replies: number;
  tags: string[];
  budget?: string;
  urgency?: 'low' | 'medium' | 'high';
}

const SAMPLE_POSTS: ForumPost[] = [
  {
    id: '1',
    type: 'job',
    title: 'Senior Solana Smart Contract Developer Needed',
    content: 'Looking for an experienced Solana developer to build a DeFi protocol. Must have experience with Anchor framework and Rust. 3-6 month contract, $100k+ budget.',
    author: 'DeFiProject',
    avatar: '🚀',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    views: 245,
    likes: 12,
    replies: 8,
    tags: ['solana', 'rust', 'anchor', 'defi'],
    budget: '$100k+',
    urgency: 'high'
  },
  {
    id: '2',
    type: 'discussion',
    title: 'MEV Strategies Discussion - Share Your Approaches',
    content: 'What are your current strategies for handling MEV on Solana? I\'m interested in learning about sandwich attack prevention and arbitrage opportunities.',
    author: 'TraderPro',
    avatar: '📈',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    views: 189,
    likes: 23,
    replies: 15,
    tags: ['mev', 'arbitrage', 'strategy', 'solana']
  },
  {
    id: '3',
    type: 'advertisement',
    title: 'Launch Your DeFi Project with Professional UI/UX',
    content: 'Specializing in DeFi and Web3 user interfaces. Clean, intuitive designs that convert. Portfolio available. DM for rates.',
    author: 'DesignStudio',
    avatar: '🎨',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    views: 156,
    likes: 8,
    replies: 3,
    tags: ['ui-ux', 'design', 'defi', 'web3']
  },
  {
    id: '4',
    type: 'news',
    title: 'Jupiter Announces Cross-Chain Bridge Support',
    content: 'Jupiter DEX aggregator just announced support for cross-chain swaps between Solana and Ethereum. This could significantly impact arbitrage opportunities.',
    author: 'CryptoNews',
    avatar: '📰',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    views: 423,
    likes: 45,
    replies: 22,
    tags: ['jupiter', 'cross-chain', 'ethereum', 'news']
  }
];

const POST_TYPE_CONFIG = {
  job: {
    icon: Briefcase,
    color: 'bg-blue-500',
    label: 'Job Posting'
  },
  discussion: {
    icon: MessageSquare,
    color: 'bg-green-500',
    label: 'Discussion'
  },
  advertisement: {
    icon: Megaphone,
    color: 'bg-purple-500',
    label: 'Advertisement'
  },
  news: {
    icon: Newspaper,
    color: 'bg-orange-500',
    label: 'News'
  }
};

export default function FreelanceDevsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'jobs' | 'discussions' | 'ads' | 'news'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [posts, setPosts] = useState<ForumPost[]>(SAMPLE_POSTS);

  const filteredPosts = posts.filter(post => {
    const matchesTab = activeTab === 'all' || (
      activeTab === 'jobs' && post.type === 'job' ||
      activeTab === 'discussions' && post.type === 'discussion' ||
      activeTab === 'ads' && post.type === 'advertisement' ||
      activeTab === 'news' && post.type === 'news'
    );

    const matchesSearch = searchQuery === '' ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTab && matchesSearch;
  });

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white relative">
      {/* Logo Watermark */}
      <LogoWatermark opacity={0.03} position="center right" scale={0.5} rotation={-5} />
      
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Developer Community</h1>
                <p className="text-gray-400">Find teammates, discuss ideas, and stay updated</p>
              </div>
            </div>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors">
              <Plus className="w-4 h-4" />
              <span>Post New</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 border-b border-gray-700 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search posts, tags, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={activeTab}
                onChange={(e) => setActiveTab(e.target.value as any)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Posts</option>
                <option value="jobs">Job Postings</option>
                <option value="discussions">Discussions</option>
                <option value="ads">Advertisements</option>
                <option value="news">News</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-800 border-b border-gray-700 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'all', label: 'All', count: posts.length },
              { id: 'jobs', label: 'Jobs', count: posts.filter(p => p.type === 'job').length },
              { id: 'discussions', label: 'Discussions', count: posts.filter(p => p.type === 'discussion').length },
              { id: 'ads', label: 'Ads', count: posts.filter(p => p.type === 'advertisement').length },
              { id: 'news', label: 'News', count: posts.filter(p => p.type === 'news').length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                }`}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Posts List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        <div className="space-y-4">
          {filteredPosts.map((post) => {
            const config = POST_TYPE_CONFIG[post.type];
            const Icon = config.icon;

            return (
              <div key={post.id} className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-gray-600 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    {/* Post Type Icon */}
                    <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>

                    {/* Post Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold text-white hover:text-purple-400 cursor-pointer truncate">
                          {post.title}
                        </h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color} text-white`}>
                          {config.label}
                        </span>
                        {post.budget && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs rounded-full font-medium">
                            {post.budget}
                          </span>
                        )}
                        {post.urgency && (
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            post.urgency === 'high' ? 'bg-red-600 text-white' :
                            post.urgency === 'medium' ? 'bg-yellow-600 text-white' :
                            'bg-gray-600 text-white'
                          }`}>
                            {post.urgency.toUpperCase()}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-300 mb-3 line-clamp-2">
                        {post.content}
                      </p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-md hover:bg-gray-600 cursor-pointer transition-colors">
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Author and Stats */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">{post.avatar}</span>
                            <span className="text-gray-400 font-medium">{post.author}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-500 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>{formatTimeAgo(post.timestamp)}</span>
                          </div>
                        </div>

                        <div className="flex items-center space-x-6 text-gray-400 text-sm">
                          <div className="flex items-center space-x-1">
                            <Eye className="w-4 h-4" />
                            <span>{post.views}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ThumbsUp className="w-4 h-4" />
                            <span>{post.likes}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <MessageCircle className="w-4 h-4" />
                            <span>{post.replies}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-4">
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-white transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-400 transition-colors">
                      <Flag className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-400 mb-2">No posts found</h3>
            <p className="text-gray-500">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden z-20">
        <button className="w-14 h-14 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center shadow-lg transition-colors">
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>
    </div>
  );
}
