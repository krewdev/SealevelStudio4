'use client';

import React, { useState } from 'react';
import { 
  Rocket, 
  Bot, 
  BarChart3, 
  Wrench, 
  Layers, 
  Settings,
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react';
import { RuglessLaunchpad } from './RuglessLaunchpad';
import { TwitterBot } from './TwitterBot';
import { TelegramBot } from './TelegramBot';
import { ChartsView } from './ChartsView';
import { TokenManager } from './TokenManager';
import { GasEstimator, CrossChainFees } from './DashboardWidgets';
import { ArbitrageScanner } from './ArbitrageScanner';

interface DeveloperDashboardProps {
  onBack?: () => void;
}

type DashboardView = 'launch' | 'bots' | 'analytics' | 'manage' | 'utilities' | 'defi';

export function DeveloperDashboard({ onBack }: DeveloperDashboardProps) {
  const [activeView, setActiveView] = useState<DashboardView>('launch');
  const [activeBot, setActiveBot] = useState<'twitter' | 'telegram' | null>(null);

  // If a specific bot is selected, render full screen bot view
  if (activeBot === 'twitter') {
    return <TwitterBot onBack={() => setActiveBot(null)} />;
  }
  if (activeBot === 'telegram') {
    return <TelegramBot onBack={() => setActiveBot(null)} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-900/50 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2 mb-1">
            <LayoutDashboard className="w-6 h-6 text-purple-500" />
            <h1 className="font-bold text-lg tracking-tight">Dev Dashboard</h1>
          </div>
          <p className="text-xs text-gray-500">Sealevel Studio Pro</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'launch', label: 'Token Launch', icon: Rocket },
            { id: 'manage', label: 'Token Manager', icon: Settings },
            { id: 'bots', label: 'Automation Bots', icon: Bot },
            { id: 'analytics', label: 'Analytics & Charts', icon: BarChart3 },
            { id: 'defi', label: 'DeFi Scanner', icon: Layers },
            { id: 'utilities', label: 'Utilities', icon: Wrench },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as DashboardView)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${
                activeView === item.id
                  ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onBack}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Exit Dashboard
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* View Content */}
        <div className="p-8">
          {activeView === 'launch' && (
            <div className="max-w-5xl mx-auto">
              <RuglessLaunchpad />
            </div>
          )}

          {activeView === 'manage' && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Token Management</h2>
                <p className="text-gray-400">Interact with SPL tokens directly. Freeze, thaw, mint, or burn tokens you control.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TokenManager />
                {/* Placeholder for future management tool */}
                <div className="bg-gray-800/30 border border-gray-700/50 rounded-2xl p-6 flex items-center justify-center text-gray-500 border-dashed">
                  <div className="text-center">
                    <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Metadata Manager Coming Soon</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeView === 'bots' && (
            <div className="max-w-5xl mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Automation Bots</h2>
                <p className="text-gray-400">Deploy autonomous agents for social engagement and community management.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Twitter Bot Card */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-blue-500/50 transition-colors">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Bot className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Twitter Agent</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Schedule posts, auto-reply to mentions, and grow your audience with AI-driven content.
                  </p>
                  <button 
                    onClick={() => setActiveBot('twitter')}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  >
                    Open Dashboard
                  </button>
                </div>

                {/* Telegram Bot Card */}
                <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 hover:border-cyan-500/50 transition-colors">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
                    <Bot className="w-6 h-6 text-cyan-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Telegram Manager</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Manage groups, broadcast announcements, and handle community support automatically.
                  </p>
                  <button 
                    onClick={() => setActiveBot('telegram')}
                    className="w-full py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-medium transition-colors"
                  >
                    Open Dashboard
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeView === 'analytics' && (
            <div className="h-full">
              <ChartsView />
            </div>
          )}

          {activeView === 'defi' && (
            <div className="h-full">
              <ArbitrageScanner />
            </div>
          )}

          {activeView === 'utilities' && (
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Utilities</h2>
                <p className="text-gray-400">Essential tools for Solana developers and traders.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <GasEstimator />
                <CrossChainFees />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
