'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ExternalLink, Map as MapIcon, Radio, RefreshCw } from 'lucide-react';
import { attachMintToDesk } from '../lib/session/desk-session';

type KolTab = 'hot' | 'mapper' | 'mint';

type HotToken = {
  mint?: string;
  symbol?: string;
  heat?: number;
  bundle?: number;
  correlation?: number;
  prediction?: number;
  bias?: string;
  confidence?: number;
  kol_buyers?: number;
  buyers?: number;
  source?: string;
};

type GraphNode = {
  id?: string;
  address?: string;
  name?: string;
  class?: string;
  hop?: number;
  threat?: number;
  angle?: number;
  verdict?: string;
  solscan?: string;
};

type GraphEdge = {
  src: string;
  dst: string;
  sol?: number;
  n?: number;
  solscan?: string;
};

export function KolMapper({ onBack }: { onBack?: () => void }) {
  const [tab, setTab] = useState<KolTab>('hot');
  const [health, setHealth] = useState<{ ok?: boolean; error?: string; upstream?: string; hint?: string } | null>(null);
  const [hot, setHot] = useState<HotToken[]>([]);
  const [hotTs, setHotTs] = useState<number | null>(null);
  const [mint, setMint] = useState('');
  const [mintData, setMintData] = useState<any>(null);
  const [seed, setSeed] = useState('');
  const [graph, setGraph] = useState<{ nodes: GraphNode[]; edges: GraphEdge[]; stats?: any; meta?: any; seeds?: any[] } | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showIframe, setShowIframe] = useState(false);
  const [selected, setSelected] = useState<GraphNode | null>(null);

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/kol/health');
      setHealth(await res.json());
    } catch (e) {
      setHealth({ ok: false, error: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const loadHot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/kol/hot');
      const data = await res.json();
      setHot(data.tokens || []);
      setHotTs(typeof data.ts === 'number' ? data.ts : null);
      if (!data.ok && data.error) setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMint = useCallback(async (m: string) => {
    if (!m.trim()) return;
    setLoading(true);
    setError(null);
    setTab('mint');
    setMint(m.trim());
    try {
      const res = await fetch(`/api/kol/mint/${encodeURIComponent(m.trim())}`);
      setMintData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMapper = useCallback(async () => {
    setLoading(true);
    setError(null);
    setTab('mapper');
    try {
      const qs = new URLSearchParams({ hops: '2', live: '0', sigs: '12', max_wallets: '18' });
      if (seed.trim()) qs.set('seed', seed.trim());
      const res = await fetch(`/api/kol/mapper?${qs}`);
      const data = await res.json();
      setGraph({
        nodes: data.nodes || [],
        edges: data.edges || [],
        stats: data.stats,
        meta: data.meta,
        seeds: data.seeds,
      });
      if (!seed.trim() && data.seed) setSeed(data.seed);
      if (data.error) setError(data.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [seed]);

  useEffect(() => {
    void loadHealth();
    void loadHot();
  }, [loadHealth, loadHot]);

  const layout = useMemo(() => {
    const nodes = graph?.nodes || [];
    const w = 720;
    const h = 420;
    const cx = w / 2;
    const cy = h / 2;
    const pos = new Map<string, { x: number; y: number }>();
    nodes.forEach((n, i) => {
      const id = n.address || n.id || String(i);
      const hop = Number(n.hop || 0);
      const angle = typeof n.angle === 'number' ? n.angle : (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      const r = 40 + hop * 70;
      pos.set(id, { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    });
    return { w, h, pos };
  }, [graph]);

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white overflow-hidden">
      <header className="shrink-0 border-b border-slate-800 px-4 py-3 flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-1 text-sm">
            <ArrowLeft size={16} /> Back
          </button>
        )}
        <MapIcon size={18} className="text-cyan-400" />
        <h1 className="font-semibold">KOL / Wallet Mapper</h1>
        <div className="ml-4 flex bg-slate-900 rounded-lg p-1 text-sm">
          {(['hot', 'mapper', 'mint'] as KolTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md capitalize ${tab === t ? 'bg-cyan-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t === 'hot' ? 'Hot board' : t}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            void loadHealth();
            if (tab === 'hot') void loadHot();
            if (tab === 'mapper') void loadMapper();
            if (tab === 'mint' && mint) void loadMint(mint);
          }}
          className="ml-auto text-slate-400 hover:text-white p-1.5"
          title="Refresh"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="px-4 py-2 text-xs border-b border-slate-800 flex items-center gap-2 text-slate-400">
        <Radio size={12} className={health?.ok ? 'text-emerald-400' : 'text-amber-400'} />
        {health?.ok ? (
          <span>
            Radar OK via <code className="text-slate-300">{health.upstream}</code>
            {hotTs ? ` · board ts ${new Date(hotTs * 1000).toLocaleTimeString()}` : ''}
          </span>
        ) : (
          <span className="text-amber-200">
            Radar offline. {health?.hint || 'Run ~/solana-kol-radar ./start.sh all-local or set KOL_RADAR_URL.'}
          </span>
        )}
        <button type="button" onClick={() => setShowIframe((v) => !v)} className="ml-auto text-cyan-400 hover:underline">
          {showIframe ? 'Hide classic iframe' : 'Classic radar iframe'}
        </button>
        {health?.upstream && (
          <a href={`${health.upstream}/mapper`} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white">
            <ExternalLink size={14} />
          </a>
        )}
      </div>

      {error && <div className="px-4 py-2 text-xs text-red-300 bg-red-950/40 border-b border-red-900/40">{error}</div>}

      {showIframe && (
        <iframe
          title="KOL Radar classic"
          src={`${health?.upstream || 'http://127.0.0.1:8088'}/mapper`}
          className="h-56 w-full bg-black border-b border-slate-800"
        />
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {tab === 'hot' && (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 text-slate-400">
              <tr>
                <th className="text-left p-2">Symbol</th>
                <th className="text-left p-2">Heat</th>
                <th className="text-left p-2">Bundle</th>
                <th className="text-left p-2">Corr</th>
                <th className="text-left p-2">Pred</th>
                <th className="text-left p-2">KOLs</th>
                <th className="text-left p-2">Source</th>
                <th className="text-left p-2">Mint</th>
                <th className="text-left p-2">Desk</th>
              </tr>
            </thead>
            <tbody>
              {hot.map((t) => (
                <tr key={t.mint} className="border-t border-slate-800/70 hover:bg-slate-900/60">
                  <td className="p-2">
                    <button type="button" className="text-cyan-300 hover:underline" onClick={() => t.mint && loadMint(t.mint)}>
                      {t.symbol || '—'}
                    </button>
                  </td>
                  <td className="p-2">{t.heat?.toFixed?.(1) ?? t.heat}</td>
                  <td className="p-2">{t.bundle?.toFixed?.(1) ?? t.bundle}</td>
                  <td className="p-2">{t.correlation?.toFixed?.(2) ?? t.correlation}</td>
                  <td className={`p-2 ${(t.prediction || 0) < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {t.prediction?.toFixed?.(1) ?? t.prediction}
                  </td>
                  <td className="p-2">{t.kol_buyers ?? 0}/{t.buyers ?? 0}</td>
                  <td className="p-2 text-slate-500">{t.source}</td>
                  <td className="p-2 font-mono text-slate-500">{t.mint?.slice(0, 6)}…{t.mint?.slice(-4)}</td>
                  <td className="p-2">
                    {t.mint && (
                      <button
                        type="button"
                        className="text-[11px] px-2 py-1 rounded bg-teal-800 hover:bg-teal-700 text-teal-50"
                        onClick={() =>
                          attachMintToDesk({
                            mint: t.mint!,
                            source: 'kol',
                            reason: `${t.symbol || 'token'} heat ${t.heat ?? '?'} · ${t.source || 'board'}`,
                            intentTab: 'sniper',
                          })
                        }
                      >
                        To desk
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {hot.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">
                    No hot board tokens. Start the collector so <code>data/hot_board.json</code> fills.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {tab === 'mint' && (
          <div className="p-4 space-y-3 max-w-4xl">
            <div className="flex gap-2">
              <input
                value={mint}
                onChange={(e) => setMint(e.target.value)}
                placeholder="Mint address"
                className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm"
              />
              <button type="button" onClick={() => loadMint(mint)} className="px-3 py-2 bg-cyan-700 rounded text-sm">
                Load mint
              </button>
              {mint.trim() && (
                <button
                  type="button"
                  className="px-3 py-2 bg-teal-800 rounded text-sm"
                  onClick={() =>
                    attachMintToDesk({
                      mint: mint.trim(),
                      source: 'kol',
                      reason: 'mint drill-down',
                      intentTab: 'mm',
                    })
                  }
                >
                  Send to MM desk
                </button>
              )}
            </div>
            {mintData && (
              <pre className="text-[11px] bg-slate-900 border border-slate-800 rounded p-3 overflow-auto max-h-[70vh]">
                {JSON.stringify(mintData, null, 2)}
              </pre>
            )}
          </div>
        )}

        {tab === 'mapper' && (
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                placeholder="Seed wallet (or leave blank for radar default)"
                className="flex-1 min-w-[280px] bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono"
              />
              <button type="button" onClick={() => void loadMapper()} className="px-3 py-2 bg-cyan-700 rounded text-sm">
                Build graph
              </button>
              {graph?.stats && (
                <span className="text-xs text-slate-400">
                  {graph.stats.nodes} nodes · {graph.stats.edges} edges · {graph.stats.volume_sol} SOL
                  {graph.meta?.note ? ` · ${graph.meta.note}` : ''}
                </span>
              )}
            </div>
            <div className="grid lg:grid-cols-[1fr_280px] gap-3">
              <svg viewBox={`0 0 ${layout.w} ${layout.h}`} className="w-full border border-slate-800 rounded-lg bg-slate-900/40">
                {(graph?.edges || []).map((e, i) => {
                  const a = layout.pos.get(e.src);
                  const b = layout.pos.get(e.dst);
                  if (!a || !b) return null;
                  return (
                    <line
                      key={`${e.src}-${e.dst}-${i}`}
                      x1={a.x}
                      y1={a.y}
                      x2={b.x}
                      y2={b.y}
                      stroke="#334155"
                      strokeWidth={Math.min(4, 0.6 + (e.sol || 0) / 20)}
                    />
                  );
                })}
                {(graph?.nodes || []).map((n, i) => {
                  const id = n.address || n.id || String(i);
                  const p = layout.pos.get(id);
                  if (!p) return null;
                  const threat = n.threat || 0;
                  const fill = threat >= 55 ? '#f87171' : n.class === 'cex' || n.class === 'bridge' ? '#c084fc' : '#22d3ee';
                  return (
                    <g key={id} onClick={() => setSelected(n)} className="cursor-pointer">
                      <circle cx={p.x} cy={p.y} r={n.hop === 0 ? 9 : 6} fill={fill} />
                      <text x={p.x + 10} y={p.y + 3} fill="#94a3b8" fontSize="10">
                        {(n.name || id).slice(0, 18)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <aside className="border border-slate-800 rounded-lg p-3 text-xs space-y-2 bg-slate-900/40">
                <div className="text-slate-400">Selected node</div>
                {selected ? (
                  <>
                    <div className="font-semibold">{selected.name || selected.address}</div>
                    <div className="text-slate-500">class {selected.class} · hop {selected.hop} · threat {selected.threat}</div>
                    <div className="text-slate-500">{selected.verdict}</div>
                    {selected.solscan && (
                      <a href={selected.solscan} target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
                        Solscan
                      </a>
                    )}
                    <div className="font-mono break-all text-slate-500">{selected.address || selected.id}</div>
                  </>
                ) : (
                  <div className="text-slate-500">Click a node. Heuristic research only — not financial advice.</div>
                )}
              </aside>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
