'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bot, Play, Square, Zap } from 'lucide-react';
import { PumpFunSniper } from './PumpFunSniper';
import { BOT_PATTERNS, type BotPatternId } from '../lib/bots/patterns';
import {
  getPaperBotStatus,
  startControlledPaperBot,
  stopControlledPaperBot,
  subscribePaperBotStatus,
} from '../lib/bots/controller';
import { clearPaperTrades, listPaperTrades, subscribePaperTrades } from '../lib/bots/trade-store';
import { BotCandleChart } from './BotCandleChart';

type Tab = 'volume' | 'mm' | 'sniper';

export function TradingDesk({
  onBack,
  initialTab,
}: {
  onBack?: () => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab || 'volume');
  const [mint, setMint] = useState('DEMO');
  const [pattern, setPattern] = useState<BotPatternId>('volume-tight');
  const [running, setRunning] = useState(() => !!getPaperBotStatus());
  const [status, setStatus] = useState('Idle (paper)');
  const [tick, setTick] = useState(0);
  const [sniperArm, setSniperArm] = useState<string | null>(null);
  const deskStartedRef = useRef(false);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => subscribePaperTrades(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    return subscribePaperBotStatus((st) => {
      setRunning(!!st);
      if (st) {
        setStatus(`Running ${st.bot} / ${st.pattern} on ${st.mint}`);
        setMint(st.mint);
      } else if (!deskStartedRef.current) {
        setStatus('Idle (paper)');
      }
    });
  }, []);

  useEffect(() => {
    const readArm = () => {
      try {
        const raw = localStorage.getItem('sealevel-sniper-arm');
        setSniperArm(raw);
        if (raw) setTab('sniper');
      } catch {
        setSniperArm(null);
      }
    };
    readArm();
    window.addEventListener('sealevel-sniper-arm', readArm);
    return () => window.removeEventListener('sealevel-sniper-arm', readArm);
  }, []);

  const startDeskBot = () => {
    deskStartedRef.current = true;
    startControlledPaperBot({
      mint: mint.trim() || 'DEMO',
      pattern: tab === 'mm' ? 'inventory-mm' : pattern,
      bot: tab === 'mm' ? 'mm' : 'volume',
      amountMinSol: tab === 'mm' ? 0.01 : 0.002,
      amountMaxSol: tab === 'mm' ? 0.04 : 0.012,
      intervalMsMin: tab === 'mm' ? 1200 : 600,
      intervalMsMax: tab === 'mm' ? 2800 : 1800,
      buyBelowMidPct: 0.4,
      sellAboveMidPct: 0.4,
    });
  };

  useEffect(() => {
    if (!deskStartedRef.current || !running || tab === 'sniper') return;
    startDeskBot();
    // restart when desk-owned config changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mint, pattern, tab]);

  const trades = useMemo(() => listPaperTrades(mint.trim() || 'DEMO'), [mint, tick]);
  const patterns = BOT_PATTERNS.filter((p) => (tab === 'mm' ? p.kind === 'mm' || p.id === 'inventory-mm' : p.kind !== 'mm'));

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white overflow-hidden">
      <header className="shrink-0 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <Bot size={18} className="text-teal-400" />
        <h1 className="font-semibold">Trading Desk</h1>
        <div className="ml-4 flex bg-slate-900 rounded-lg p-1 text-sm">
          {(['volume', 'mm', 'sniper'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => {
                if (t === 'sniper' && running) {
                  deskStartedRef.current = false;
                  stopControlledPaperBot();
                }
                setTab(t);
              }}
              className={`px-3 py-1.5 rounded-md capitalize ${tab === t ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t === 'mm' ? 'Market maker' : t}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-slate-500">{status}</span>
      </header>

      {tab === 'sniper' ? (
        <div className="flex-1 min-h-0 overflow-auto">
          {sniperArm && (
            <div className="px-4 py-2 text-xs text-amber-200 bg-amber-950/50 border-b border-amber-900/40">
              Grok armed sniper settings in this browser only — no buy was sent.{' '}
              {(() => {
                try {
                  const parsed = JSON.parse(sniperArm) as { mint?: string; maxSol?: number };
                  return `mint ${parsed.mint || '(any)'} · max ${parsed.maxSol ?? '?'} SOL`;
                } catch {
                  return null;
                }
              })()}
            </div>
          )}
          <PumpFunSniper />
        </div>
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[340px_1fr]">
          <aside className="border-r border-slate-800 p-4 space-y-4 overflow-auto">
            <label className="block text-xs text-slate-400">
              Mint (paper uses DEMO curve if empty)
              <input
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                placeholder="Token mint or DEMO"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Pattern
              <select
                value={tab === 'mm' ? 'inventory-mm' : pattern}
                onChange={(e) => setPattern(e.target.value as BotPatternId)}
                disabled={tab === 'mm'}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              >
                {patterns.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-slate-500">
              {tab === 'mm'
                ? 'Inventory MM from pumpfun-bot: single-wallet buy-below-mid / sell-above-mid. Paper only here.'
                : BOT_PATTERNS.find((p) => p.id === pattern)?.description}
            </p>
            <div className="flex gap-2">
              <button
                onClick={startDeskBot}
                disabled={running}
                className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 rounded py-2 text-sm flex items-center justify-center gap-2"
              >
                <Play size={14} /> Start paper
              </button>
              <button
                onClick={() => {
                  deskStartedRef.current = false;
                  stopControlledPaperBot();
                  setStatus('Idle (paper)');
                }}
                disabled={!running}
                className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded py-2 text-sm flex items-center justify-center gap-2"
              >
                <Square size={14} /> Stop
              </button>
            </div>
            <button
              onClick={() => clearPaperTrades(mint.trim() || 'DEMO')}
              className="w-full text-xs text-slate-400 hover:text-white"
            >
              Clear trades
            </button>
            <div className="text-xs text-slate-500 space-y-1">
              <div>Trades: {trades.length}</div>
              <div className="flex items-center gap-1 text-amber-300">
                <Zap size={12} /> Paper simulation — no on-chain txs
              </div>
            </div>
          </aside>
          <section className="min-h-0 p-4 flex flex-col gap-3">
            <BotCandleChart trades={trades} />
            <div className="flex-1 min-h-0 overflow-auto border border-slate-800 rounded-lg">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-900 text-slate-400">
                  <tr>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Side</th>
                    <th className="text-left p-2">SOL</th>
                    <th className="text-left p-2">Price</th>
                    <th className="text-left p-2">Pattern</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trades].reverse().slice(0, 80).map((t) => (
                    <tr key={t.id} className="border-t border-slate-800/70">
                      <td className="p-2 text-slate-400">{new Date(t.ts).toLocaleTimeString()}</td>
                      <td className={`p-2 ${t.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>{t.side}</td>
                      <td className="p-2">{t.sol.toFixed(4)}</td>
                      <td className="p-2 font-mono">{t.price.toExponential(3)}</td>
                      <td className="p-2 text-slate-500">{t.pattern}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
