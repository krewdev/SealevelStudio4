'use client';

import React from 'react';
import { BarChart3, Key, Webhook, Download, Plug, Share2, Users, ArrowLeft } from 'lucide-react';

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  link: string;
  status?: 'coming-soon' | 'available';
  onNavigate?: () => void;
}

function ToolCard({ title, description, icon, link, status = 'available', onNavigate }: ToolCardProps) {
  const handleClick = () => {
    if (status === 'available' && onNavigate) {
      onNavigate();
    } else if (status === 'available') {
      // TODO: Navigate to tool page when implemented
      alert(`${title} is coming soon! This feature will be available in a future update.`);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500 transition-all">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-blue-900/30 rounded-lg text-blue-400">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-bold">{title}</h3>
            {status === 'coming-soon' && (
              <span className="text-xs bg-yellow-900/50 text-yellow-400 px-2 py-1 rounded">
                Coming Soon
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm mb-4">{description}</p>
          {status === 'available' && (
            <button
              onClick={handleClick}
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
            >
              Open
              <span>→</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface Web2ToolsProps {
  onBack?: () => void;
}

export function Web2Tools({ onBack, onNavigateToSocial }: Web2ToolsProps) {
  const tools = [
    {
      title: 'Analytics Dashboard',
      description: 'Track usage statistics, transaction history, SEAL token spending, and performance metrics',
      icon: <BarChart3 size={24} />,
      link: '/web2/analytics',
      status: 'coming-soon' as const,
    },
    {
      title: 'API Management',
      description: 'Generate API keys, configure rate limiting, track usage, and set up webhooks',
      icon: <Key size={24} />,
      link: '/web2/api-keys',
      status: 'coming-soon' as const,
    },
    {
      title: 'Webhooks',
      description: 'Transaction notifications, balance alerts, event subscriptions, and custom webhook URLs',
      icon: <Webhook size={24} />,
      link: '/web2/webhooks',
      status: 'coming-soon' as const,
    },
    {
      title: 'Data Export',
      description: 'Export transactions to CSV/JSON, export wallet data, usage statistics, and scheduled exports',
      icon: <Download size={24} />,
      link: '/web2/export',
      status: 'coming-soon' as const,
    },
    {
      title: 'Integrations',
      description: 'Discord bot, Slack notifications, email alerts, and Telegram notifications',
      icon: <Plug size={24} />,
      link: '/web2/integrations',
      status: 'coming-soon' as const,
    },
    {
      title: 'Social Features',
      description: 'Share transactions, public profiles, transaction templates marketplace, and community features',
      icon: <Share2 size={24} />,
      link: '/web2/social',
      status: 'available' as const,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="border-b border-gray-700 p-6">
        <div className="flex items-center gap-4 mb-2">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Go back"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">Back</span>
            </button>
          )}
          <h1 className="text-3xl font-bold">Web2 Tools</h1>
        </div>
        <p className="text-gray-400">Traditional web services and integrations for enhanced functionality</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {tools.map((tool) => (
            <ToolCard 
              key={tool.title} 
              {...tool}
              onNavigate={tool.title === 'Social Features' ? onNavigateToSocial : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

