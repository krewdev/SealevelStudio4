'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { listPaperTrades, subscribePaperTrades } from '../lib/bots/trade-store';
import { BotCandleChart } from './BotCandleChart';
import { getDeskSession, subscribeDeskSession } from '../lib/session/desk-session';

export function BotChartsView({ onBack, onOpenBots }: { onBack?: () => void; onOpenBots?: () => void }) {
  const [mint, setMint] = useState(() => getDeskSession().mint || 'DEMO');
  const [tick, setTick] = useState(0);
  useEffect(() => subscribePaperTrades(() => setTick((t) => t + 1)), []);
  useEffect(() => subscribeDeskSession((s) => {
    if (s.mint) setMint(s.mint);
  }), []);
  const trades = useMemo(() => listPaperTrades(mint.trim() || undefined), [mint, tick]);

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white overflow-hidden">
      <header className="shrink-0 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-slate-400 hover:text-white text-sm flex items-center gap-1">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <h1 className="font-semibold">Bot Charts</h1>
        <input
          value={mint}
          onChange={(e) => setMint(e.target.value)}
          placeholder="Filter mint (blank = all)"
          className="ml-4 bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-sm w-72"
        />
        {onOpenBots && (
          <button onClick={onOpenBots} className="ml-auto text-sm px-3 py-1.5 rounded bg-teal-700 hover:bg-teal-600">
            Open bots
          </button>
        )}
      </header>
      <div className="flex-1 min-h-0 p-4 overflow-auto space-y-4">
        <BotCandleChart trades={trades} />
        <p className="text-xs text-slate-500">
          Candles are built from paper bot fills in this session. Run Volume / Market Maker patterns on the Trading Desk
          to compare footprints (tight volume vs shake-out vs inventory MM).
        </p>
      </div>
    </div>
  );
}
