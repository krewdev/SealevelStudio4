'use client';

import React from 'react';
import {
  Bot,
  LineChart,
  Map,
  Search,
  TrendingUp,
  Wallet,
  Wrench,
} from 'lucide-react';

const CARDS = [
  {
    id: 'scanner',
    title: 'Arb Scanner',
    body: 'Scan Raydium/Orca, quote-check edges, build atomic hops.',
    icon: TrendingUp,
    accent: 'from-purple-500 to-indigo-600',
  },
  {
    id: 'builder',
    title: 'TX Builder',
    body: 'Visual instructions. Execute atomic versioned transactions.',
    icon: Wrench,
    accent: 'from-indigo-500 to-blue-600',
  },
  {
    id: 'bots',
    title: 'Bots',
    body: 'Paper volume / inventory MM (no chain). Sniper tab is the live Pump.fun UI.',
    icon: Bot,
    accent: 'from-fuchsia-500 to-purple-600',
  },
  {
    id: 'charts',
    title: 'Bot Charts',
    body: 'Candles from paper fills so you can tune pattern footprints.',
    icon: LineChart,
    accent: 'from-violet-500 to-indigo-500',
  },
  {
    id: 'kol-mapper',
    title: 'KOL Mapper',
    body: 'Native hot board + hop graph (proxies solana-kol-radar).',
    icon: Map,
    accent: 'from-purple-400 to-pink-500',
  },
  {
    id: 'wallets',
    title: 'Wallets',
    body: 'Manage hot wallets for testing and ops.',
    icon: Wallet,
    accent: 'from-indigo-400 to-purple-600',
  },
  {
    id: 'inspector',
    title: 'Inspector',
    body: 'Look up any account on the current RPC.',
    icon: Search,
    accent: 'from-blue-500 to-indigo-600',
  },
];

export function HomeDashboard({
  onOpen,
}: {
  onOpen: (view: string) => void;
}) {
  return (
    <div className="relative h-full overflow-y-auto bg-gray-900 text-gray-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <img
          src="/sea-level-logo.png"
          alt=""
          className="absolute inset-0 m-auto h-[70%] w-auto max-w-[80%] object-contain opacity-[0.08]"
          style={{
            filter: 'hue-rotate(200deg) saturate(0.7)',
          }}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        <div className="absolute inset-0 max-w-4xl mx-auto h-3/4 -translate-y-1/4 left-0 right-0 bg-purple-900/35 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-3">
          <img
            src="/sea-level-logo.png"
            alt="Sealevel Studio"
            className="h-12 w-12 rounded-full bg-gray-800/60 p-1.5 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-purple-300">Sealevel Studio</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-indigo-500">
              Home
            </h1>
          </div>
        </div>
        <p className="text-gray-400 max-w-2xl mb-8">
          Trading + research desk. Use the top nav or jump in below. Grok (bottom left) can help on any page.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CARDS.map(({ id, title, body, icon: Icon, accent }) => (
            <button
              key={id}
              type="button"
              onClick={() => onOpen(id)}
              className="text-left rounded-xl border border-gray-700/80 bg-gray-800/50 hover:bg-gray-800 hover:border-purple-500/50 p-5 transition shadow-lg shadow-black/20"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${accent} text-white mb-3 shadow-md shadow-purple-900/30`}
              >
                <Icon size={18} />
              </div>
              <h2 className="font-semibold text-white">{title}</h2>
              <p className="mt-1 text-sm text-gray-400">{body}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
