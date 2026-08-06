'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Bot, Play, Square, Zap } from 'lucide-react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PumpFunSniper } from './PumpFunSniper';
import { BOT_PATTERNS, type BotPatternId } from '../lib/bots/patterns';
import {
  getPaperBotStatus,
  startControlledPaperBot,
  stopControlledPaperBot,
  subscribePaperBotStatus,
} from '../lib/bots/controller';
import { isLivePatternAllowed, startLiveBot } from '../lib/bots/live-engine';
import { clearPaperTrades, listPaperTrades, subscribePaperTrades } from '../lib/bots/trade-store';
import { BotCandleChart } from './BotCandleChart';
import { replayUnlocksLive, runQuoteReplay } from '../lib/bots/replay-engine';
import { clearDisarm, disarmAll, isDisarmed, subscribeDisarm } from '../lib/bots/kill-switch';
import { fetchOnchainPosition, pnlFromTrades } from '../lib/bots/position';
import { getDailyLoss, patchDeskSession, subscribeDeskSession } from '../lib/session/desk-session';

type Tab = 'volume' | 'mm' | 'sniper';
type Mode = 'paper' | 'live';

export function TradingDesk({
  onBack,
  initialTab,
}: {
  onBack?: () => void;
  initialTab?: Tab;
}) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const [tab, setTab] = useState<Tab>(initialTab || 'volume');
  const [mode, setMode] = useState<Mode>('paper');
  const [mint, setMint] = useState('DEMO');
  const [pattern, setPattern] = useState<BotPatternId>('volume-tight');
  const [running, setRunning] = useState(() => !!getPaperBotStatus());
  const [liveRunning, setLiveRunning] = useState(false);
  const [status, setStatus] = useState('Idle (paper)');
  const [tick, setTick] = useState(0);
  const [sniperArm, setSniperArm] = useState<string | null>(null);
  const [ackLive, setAckLive] = useState(false);
  const [maxSol, setMaxSol] = useState(0.01);
  const [intervalMs, setIntervalMs] = useState(12000);
  const [maxTrades, setMaxTrades] = useState(8);
  const [replaying, setReplaying] = useState(false);
  const [replayOk, setReplayOk] = useState(false);
  const [disarmed, setDisarmed] = useState(() => isDisarmed());
  const [disarmWhy, setDisarmWhy] = useState('');
  const [position, setPosition] = useState<{ sol: number; tokenUi: number } | null>(null);
  const [sessionNote, setSessionNote] = useState('');
  const deskStartedRef = useRef(false);
  const stopLiveRef = useRef<(() => void) | null>(null);
  const replayStopRef = useRef({ stopped: false });

  const effectivePattern: BotPatternId = tab === 'mm' ? 'inventory-mm' : pattern;
  const liveOkPattern = isLivePatternAllowed(effectivePattern);

  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    return subscribeDeskSession((s) => {
      if (s.mint && s.mint !== mint) setMint(s.mint);
      if (s.maxSol) setMaxSol(s.maxSol);
      if (s.intentTab && s.intentTab !== tab) setTab(s.intentTab);
      if (s.reason) setSessionNote(`${s.source || 'session'}: ${s.reason}`);
      if (s.mint) setReplayOk(replayUnlocksLive(s.mint));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => subscribeDisarm((s) => {
    setDisarmed(s.disarmed);
    setDisarmWhy(s.reason);
    if (s.disarmed) {
      stopControlledPaperBot();
      stopLiveRef.current?.();
      stopLiveRef.current = null;
      setLiveRunning(false);
      deskStartedRef.current = false;
    }
  }), []);

  useEffect(() => subscribePaperTrades(() => setTick((t) => t + 1)), []);

  useEffect(() => {
    return subscribePaperBotStatus((st) => {
      setRunning(!!st);
      if (st && !liveRunning) {
        setStatus(`Running ${st.bot} / ${st.pattern} on ${st.mint}`);
        setMint(st.mint);
      } else if (!deskStartedRef.current && !liveRunning) {
        setStatus('Idle (paper)');
      }
    });
  }, [liveRunning]);

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

  useEffect(() => () => {
    stopLiveRef.current?.();
  }, []);

  const stopLive = () => {
    stopLiveRef.current?.();
    stopLiveRef.current = null;
    setLiveRunning(false);
    setStatus('Idle');
  };

  const startDeskBot = () => {
    stopLive();
    deskStartedRef.current = true;
    startControlledPaperBot({
      mint: mint.trim() || 'DEMO',
      pattern: effectivePattern,
      bot: tab === 'mm' ? 'mm' : 'volume',
      amountMinSol: tab === 'mm' ? 0.01 : 0.002,
      amountMaxSol: tab === 'mm' ? 0.04 : 0.012,
      intervalMsMin: tab === 'mm' ? 1200 : 600,
      intervalMsMax: tab === 'mm' ? 2800 : 1800,
      buyBelowMidPct: 0.4,
      sellAboveMidPct: 0.4,
    });
  };

  const startReplay = async () => {
    replayStopRef.current.stopped = false;
    setReplaying(true);
    try {
      const result = await runQuoteReplay({
        mint: mint.trim(),
        pattern: effectivePattern,
        maxSolPerTrade: maxSol,
        seconds: 60,
        signal: replayStopRef.current,
        onStatus: (msg) => setStatus(msg),
      });
      setReplayOk(result.trades >= 0 && replayUnlocksLive(mint.trim()));
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    } finally {
      setReplaying(false);
    }
  };

  const startLive = () => {
    if (disarmed) {
      setStatus(`Disarmed: ${disarmWhy || 'kill switch'}. Re-arm first.`);
      return;
    }
    if (!publicKey || !sendTransaction) {
      setStatus('Connect Phantom/Solflare for live swaps.');
      return;
    }
    if (!liveOkPattern) {
      setStatus('This pattern is paper-only.');
      return;
    }
    if (!ackLive) {
      setStatus('Check the live-risk box first.');
      return;
    }
    if (!replayUnlocksLive(mint.trim())) {
      setStatus('Run 60s quote replay before live.');
      return;
    }
    stopControlledPaperBot();
    deskStartedRef.current = false;
    try {
      stopLiveRef.current?.();
      stopLiveRef.current = startLiveBot(
        {
          mint: mint.trim(),
          pattern: effectivePattern,
          maxSolPerTrade: maxSol,
          intervalMs,
          maxTrades,
          slippageBps: 75,
          buyBelowMidPct: 0.4,
          sellAboveMidPct: 0.4,
          publicKey,
          connection,
          sendTransaction: sendTransaction as any,
        },
        (msg) => setStatus(msg)
      );
      setLiveRunning(true);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    if (!deskStartedRef.current || !running || tab === 'sniper' || liveRunning) return;
    startDeskBot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mint, pattern, tab]);

  const trades = useMemo(() => listPaperTrades(mint.trim() || 'DEMO'), [mint, tick]);
  const pnl = useMemo(() => pnlFromTrades(trades), [trades]);
  const patterns = BOT_PATTERNS.filter((p) => (tab === 'mm' ? p.kind === 'mm' || p.id === 'inventory-mm' : p.kind !== 'mm'));
  const busy = running || liveRunning || replaying;
  const liveUnlocked = replayOk || replayUnlocksLive(mint.trim());

  useEffect(() => {
    if (!publicKey || !mint || mint.toUpperCase() === 'DEMO') {
      setPosition(null);
      return;
    }
    let cancelled = false;
    fetchOnchainPosition(connection, publicKey, mint.trim())
      .then((p) => {
        if (!cancelled) setPosition({ sol: p.sol, tokenUi: p.tokenUi });
      })
      .catch(() => {
        if (!cancelled) setPosition(null);
      });
    return () => {
      cancelled = true;
    };
  }, [publicKey, mint, connection, tick, liveRunning]);

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
                if (t === 'sniper' && busy) {
                  deskStartedRef.current = false;
                  stopControlledPaperBot();
                  stopLive();
                }
                if (t === 'volume') setMode('paper');
                setTab(t);
              }}
              className={`px-3 py-1.5 rounded-md capitalize ${tab === t ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t === 'mm' ? 'Market maker' : t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => (disarmed ? clearDisarm() : disarmAll('manual desk'))}
          className={`ml-2 text-xs px-2 py-1 rounded ${disarmed ? 'bg-slate-700 text-slate-200' : 'bg-red-900/70 text-red-100 hover:bg-red-800'}`}
        >
          {disarmed ? 'Re-arm' : 'Disarm all'}
        </button>
        <span className="ml-auto text-xs text-slate-500 max-w-md truncate" title={status}>{status}</span>
      </header>
      {disarmed && (
        <div className="px-4 py-2 text-xs bg-red-950/70 text-red-100 border-b border-red-900/50">
          Kill switch ON{disarmWhy ? `: ${disarmWhy}` : ''}. Paper/live/sniper arm halted.
        </div>
      )}
      {sessionNote && (
        <div className="px-4 py-1.5 text-[11px] text-cyan-200/90 bg-cyan-950/30 border-b border-cyan-900/40">
          Session · {sessionNote}
        </div>
      )}

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
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[360px_1fr]">
          <aside className="border-r border-slate-800 p-4 space-y-4 overflow-auto">
            <div className="flex bg-slate-900 rounded-lg p-1 text-sm">
              {(['paper', 'live'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={m === 'live' && tab === 'volume'}
                  onClick={() => {
                    if (m === 'live' && tab === 'volume') return;
                    setMode(m);
                  }}
                  className={`flex-1 py-1.5 rounded-md capitalize ${
                    mode === m ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                  } disabled:opacity-40`}
                >
                  {m}
                </button>
              ))}
            </div>
            {tab === 'volume' && (
              <p className="text-[11px] text-amber-200/90">
                Volume / wash / pump / shake-out patterns stay <strong>paper only</strong>. Live two-sided tape would fake volume.
              </p>
            )}
            <label className="block text-xs text-slate-400">
              Mint {mode === 'live' ? '(required live mint)' : '(paper uses DEMO curve if empty)'}
              <input
                value={mint}
                onChange={(e) => {
                  const v = e.target.value;
                  setMint(v);
                  if (v.trim() && v.toUpperCase() !== 'DEMO') {
                    patchDeskSession({ mint: v.trim(), source: 'manual' });
                    setReplayOk(replayUnlocksLive(v.trim()));
                  }
                }}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                placeholder="Token mint or DEMO"
              />
            </label>
            <label className="block text-xs text-slate-400">
              Pattern
              <select
                value={effectivePattern}
                onChange={(e) => setPattern(e.target.value as BotPatternId)}
                disabled={tab === 'mm'}
                className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              >
                {patterns.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                    {isLivePatternAllowed(p.id) ? '' : ' · paper only'}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-slate-500">
              {tab === 'mm'
                ? 'Inventory MM: buy below rolling mid / sell above. Live uses Jupiter + your wallet signature each fill.'
                : BOT_PATTERNS.find((p) => p.id === pattern)?.description}
            </p>

            {mode === 'live' && (
              <div className="space-y-3 border border-amber-900/50 rounded-lg p-3 bg-amber-950/20">
                <label className="block text-xs text-slate-400">
                  Max SOL per trade (≤ 0.05)
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    max="0.05"
                    value={maxSol}
                    onChange={(e) => setMaxSol(Number(e.target.value))}
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Interval ms (≥ 8000)
                  <input
                    type="number"
                    min="8000"
                    value={intervalMs}
                    onChange={(e) => setIntervalMs(Number(e.target.value))}
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  Max signed swaps this run (≤ 20)
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={maxTrades}
                    onChange={(e) => setMaxTrades(Number(e.target.value))}
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex items-start gap-2 text-xs text-amber-100">
                  <input type="checkbox" checked={ackLive} onChange={(e) => setAckLive(e.target.checked)} className="mt-0.5" />
                  I understand this spends real SOL / tokens. Not financial advice. Grok cannot start live bots.
                </label>
                <button
                  type="button"
                  onClick={() => void startReplay()}
                  disabled={busy || !liveOkPattern || !mint || mint.toUpperCase() === 'DEMO'}
                  className="w-full bg-indigo-700 hover:bg-indigo-600 disabled:bg-slate-800 rounded py-2 text-sm"
                >
                  {replaying ? 'Replaying live quotes…' : liveUnlocked ? 'Re-run 60s quote replay' : 'Run 60s quote replay (unlocks live)'}
                </button>
                <p className="text-[11px] text-slate-400">
                  {liveUnlocked
                    ? `Replay OK for this mint. Daily loss ${getDailyLoss().toFixed(4)} SOL.`
                    : 'Live stays locked until a quote replay finishes on this mint.'}
                </p>
                {!connected && <p className="text-[11px] text-red-300">Connect a wallet to sign live swaps.</p>}
                {!liveOkPattern && (
                  <p className="text-[11px] text-red-300">Switch to Market maker or buy/sell drip for live.</p>
                )}
              </div>
            )}

            <div className="flex gap-2">
              {mode === 'paper' ? (
                <button
                  onClick={startDeskBot}
                  disabled={busy || disarmed}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-700 rounded py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Play size={14} /> Start paper
                </button>
              ) : (
                <button
                  onClick={startLive}
                  disabled={busy || disarmed || !ackLive || !connected || !liveOkPattern || !liveUnlocked}
                  className="flex-1 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-700 rounded py-2 text-sm flex items-center justify-center gap-2"
                >
                  <Play size={14} /> Start live
                </button>
              )}
              <button
                onClick={() => {
                  deskStartedRef.current = false;
                  replayStopRef.current.stopped = true;
                  stopControlledPaperBot();
                  stopLive();
                  setStatus('Idle');
                }}
                disabled={!busy}
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
              <div>Trades: {trades.length} · session tape PnL {pnl.realizedSol >= 0 ? '+' : ''}{pnl.realizedSol.toFixed(4)} SOL</div>
              {position && (
                <div>
                  Wallet {position.sol.toFixed(3)} SOL · token {position.tokenUi.toPrecision(4)}
                </div>
              )}
              <div className={`flex items-center gap-1 ${liveRunning ? 'text-amber-300' : 'text-teal-300'}`}>
                <Zap size={12} />
                {liveRunning ? 'LIVE Jupiter swaps — wallet must approve each fill' : 'Paper / replay — no on-chain txs'}
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
                    <th className="text-left p-2">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {[...trades].reverse().slice(0, 80).map((t) => (
                    <tr key={t.id} className="border-t border-slate-800/70">
                      <td className="p-2 text-slate-400">{new Date(t.ts).toLocaleTimeString()}</td>
                      <td className={`p-2 ${t.side === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {t.live ? 'LIVE ' : ''}
                        {t.side}
                      </td>
                      <td className="p-2">{t.sol.toFixed(4)}</td>
                      <td className="p-2 font-mono">{t.price ? t.price.toExponential(3) : t.error || '—'}</td>
                      <td className="p-2 text-slate-500">{t.pattern}</td>
                      <td className="p-2 font-mono">
                        {t.signature ? (
                          <a
                            href={`https://solscan.io/tx/${t.signature}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-cyan-400 hover:underline"
                          >
                            {t.signature.slice(0, 8)}…
                          </a>
                        ) : t.error ? (
                          <span className="text-red-400" title={t.error}>err</span>
                        ) : (
                          '—'
                        )}
                      </td>
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
