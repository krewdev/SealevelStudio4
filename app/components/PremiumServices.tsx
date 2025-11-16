'use client';

import React from 'react';
import { Layers, TrendingUp, MessageSquare, Wallet, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface ServiceCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  cost: string;
  link: string;
  features: string[];
}

function ServiceCard({ title, description, icon, cost, link, features }: ServiceCardProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-purple-500 transition-all hover:shadow-lg hover:shadow-purple-500/20">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-900/30 rounded-lg text-purple-400">
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="text-gray-400 text-sm">{description}</p>
          </div>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-2xl font-bold text-purple-400 mb-2">{cost}</div>
        <ul className="space-y-1 text-sm text-gray-300">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <Zap size={12} className="text-purple-400" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      <Link
        href={link}
        className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
      >
        Get Started
        <ArrowRight size={16} />
      </Link>
    </div>
  );
}

export function PremiumServices() {
  const services = [
    {
      title: 'Transaction Bundler',
      description: 'Multi-send SOL to up to 50 wallets, creating accounts automatically',
      icon: <Layers size={24} />,
      cost: '500 SEAL',
      link: '/premium/bundler',
      features: [
        'Send to up to 50 wallets',
        'Auto-create new accounts',
        'Priority fee support',
        'Wallet management included',
      ],
    },
    {
      title: 'Market Maker Agent',
      description: 'Autonomous on-chain trading agent with customizable strategies',
      icon: <TrendingUp size={24} />,
      cost: '2,000 SEAL setup',
      link: '/premium/market-maker',
      features: [
        'Grid trading strategies',
        'TWAP execution',
        'Real-time analytics',
        'On-chain wallet agent',
      ],
    },
    {
      title: 'Advertising Bots',
      description: 'Telegram and Twitter bots to promote your tokens',
      icon: <MessageSquare size={24} />,
      cost: '1,000-1,500 SEAL',
      link: '/premium/advertising',
      features: [
        'Telegram channel posting',
        'Twitter/X automation',
        'Message templating',
        'Scheduling & rate limiting',
      ],
    },
    {
      title: 'Wallet Manager',
      description: 'Manage and organize wallets created via bundler',
      icon: <Wallet size={24} />,
      cost: 'Free',
      link: '/premium/wallets',
      features: [
        'View all created wallets',
        'Import/export wallets',
        'Label and tag organization',
        'Balance tracking',
      ],
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      <div className="border-b border-gray-700 p-6">
        <h1 className="text-3xl font-bold mb-2">Premium Services</h1>
        <p className="text-gray-400">Unlock powerful tools for advanced Solana operations</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">
          {services.map((service) => (
            <ServiceCard key={service.title} {...service} />
          ))}
        </div>
      </div>
    </div>
  );
}

