'use client';

import React, { useState } from 'react';
import {
  Shield,
  Book,
  Terminal,
  Globe,
  Users,
  Search,
  Filter,
  ArrowLeft,
  Zap,
  Code,
  Lock,
  FileText,
  Droplet,
  Rocket,
} from 'lucide-react';

interface Tool {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: 'security' | 'development' | 'social' | 'utilities';
  onNavigate: () => void;
  badge?: string;
}

interface ToolsHubProps {
  onBack?: () => void;
  onNavigateToTool?: (toolId: string) => void;
}

export function ToolsHub({ onBack, onNavigateToTool }: ToolsHubProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const tools: Tool[] = [
    {
      id: 'cybersecurity',
      name: 'Cybersecurity Dashboard',
      description: 'Comprehensive security analysis and vulnerability scanning',
      icon: <Shield className="w-6 h-6" />,
      category: 'security',
      onNavigate: () => onNavigateToTool?.('cybersecurity'),
      badge: 'Premium',
    },
    {
      id: 'docs',
      name: 'Documentation',
      description: 'Complete API documentation and guides',
      icon: <Book className="w-6 h-6" />,
      category: 'utilities',
      onNavigate: () => onNavigateToTool?.('docs'),
    },
    {
      id: 'rd-console',
      name: 'R&D Console',
      description: 'Advanced browser vulnerability scanner and research tools',
      icon: <Terminal className="w-6 h-6" />,
      category: 'development',
      onNavigate: () => onNavigateToTool?.('rd-console'),
      badge: 'Advanced',
    },
    {
      id: 'rent-reclaimer',
      name: 'Rent Reclaimer',
      description: 'Close accounts and reclaim rent-exempt SOL',
      icon: <FileText className="w-6 h-6" />,
      category: 'utilities',
      onNavigate: () => onNavigateToTool?.('rent-reclaimer'),
    },
    {
      id: 'faucet',
      name: 'Devnet Faucet',
      description: 'Request free SOL for testing on devnet',
      icon: <Droplet className="w-6 h-6" />,
      category: 'development',
      onNavigate: () => onNavigateToTool?.('faucet'),
    },
    {
      id: 'launchpad',
      name: 'Rugless Launchpad',
      description: 'Launch tokens with fair launch mechanics and matched liquidity',
      icon: <Rocket className="w-6 h-6" />,
      category: 'development',
      onNavigate: () => onNavigateToTool?.('launchpad'),
      badge: 'New',
    },
    {
      id: 'tools',
      name: 'Developer Dashboard',
      description: 'Token launchpad, management, bots, analytics, and DeFi tools',
      icon: <Code className="w-6 h-6" />,
      category: 'development',
      onNavigate: () => onNavigateToTool?.('tools'),
      badge: 'Pro',
    },
    {
      id: 'web2',
      name: 'Web2 Tools',
      description: 'Social media and web2 integration tools',
      icon: <Globe className="w-6 h-6" />,
      category: 'social',
      onNavigate: () => onNavigateToTool?.('web2'),
    },
    {
      id: 'social',
      name: 'Social Features',
      description: 'Community and social networking features',
      icon: <Users className="w-6 h-6" />,
      category: 'social',
      onNavigate: () => onNavigateToTool?.('social'),
    },
    {
      id: 'freelance-devs',
      name: 'Developer Community',
      description: 'Find teammates, discuss ideas, job postings, and crypto news',
      icon: <Users className="w-6 h-6" />,
      category: 'social',
      onNavigate: () => onNavigateToTool?.('freelance-devs'),
    },
  ];

  const categories = [
    { id: 'all', label: 'All Tools' },
    { id: 'security', label: 'Security' },
    { id: 'development', label: 'Development' },
    { id: 'social', label: 'Social' },
    { id: 'utilities', label: 'Utilities' },
  ];

  const filteredTools = tools.filter(tool => {
    const matchesSearch = 
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security':
        return 'from-red-500/20 to-orange-500/20 border-red-500/30';
      case 'development':
        return 'from-blue-500/20 to-cyan-500/20 border-blue-500/30';
      case 'social':
        return 'from-purple-500/20 to-pink-500/20 border-purple-500/30';
      case 'utilities':
        return 'from-green-500/20 to-emerald-500/20 border-green-500/30';
      default:
        return 'from-gray-500/20 to-slate-500/20 border-gray-500/30';
    }
  };

  return (
    <div className="min-h-screen animated-bg text-white relative">
      {/* Background Logo Placeholder */}
      <img
        src="/sea-level-logo.png"
        alt="Sealevel Studio Background"
        className="absolute inset-0 w-full h-full object-contain opacity-[0.05] filter hue-rotate-[90deg] saturate-75 brightness-110 pointer-events-none"
        style={{
          objectPosition: 'center right',
          transform: 'scale(0.6) rotate(-5deg)',
          zIndex: 0
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 border-b border-slate-800/50 glass p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              >
                <ArrowLeft size={18} />
                <span className="text-sm">Back</span>
              </button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-gradient-primary">Developer Dashboard</h1>
              <p className="text-sm text-gray-400 mt-1">All utility tools and launchpads in one place</p>
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-modern w-full pl-12 pr-4 py-3 text-white"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTools.map(tool => (
            <div
              key={tool.id}
              onClick={tool.onNavigate}
              className={`card-modern card-glow p-6 cursor-pointer group ${getCategoryColor(tool.category)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 group-hover:from-purple-500/30 group-hover:to-blue-500/30 transition-all">
                  {tool.icon}
                </div>
                {tool.badge && (
                  <span className="badge-modern text-xs">
                    {tool.badge}
                  </span>
                )}
              </div>
              
              <h3 className="text-xl font-bold mb-2 group-hover:text-purple-400 transition-colors">
                {tool.name}
              </h3>
              
              <p className="text-sm text-gray-400 mb-4">
                {tool.description}
              </p>

              <div className="flex items-center gap-2 text-sm text-purple-400 group-hover:text-purple-300 transition-colors">
                <span>Open Tool</span>
                <Zap className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No tools found matching your search.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

