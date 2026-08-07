'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import {
  ShieldAlert,
  Fingerprint,
  Swords,
  Radar,
  GitFork,
  HeartHandshake,
  Wand2,
} from 'lucide-react';
import type { StateDiffResult } from '../../lib/tx/state-diff';
import type { TransactionDraft } from '../../lib/instructions/types';
import {
  applyFailurePatch,
  buildCeremonyInstructions,
  ceremonyChecklist,
  computeTxDna,
  counterHandshake,
  createHandshake,
  decodeHandshake,
  deriveHandshakeStatus,
  encodeHandshake,
  evaluateFirewall,
  fetchHandshakeRoom,
  forkDraftFromStep,
  handshakeSummary,
  loadFirewallPolicy,
  matchKnownShapes,
  noticeLanded,
  prepareHandshakeBundle,
  projectAdversarialForks,
  pushHandshakeRoom,
  readLastLanded,
  resimTailDraft,
  runAdversarialSims,
  saveFirewallPolicy,
  signHandshakeLeg,
  snapshotAtStep,
  STUDIO_TAB_EVENT,
  submitHandshakeBundle,
  suggestFailurePatches,
  summarizeWriteRadar,
  versionedLimitation,
  worstPayerDelta,
  type AdversarialFork,
  type BuiltTxKind,
  type FirewallPolicy,
  type HandshakeOffer,
  type LandedRecord,
  type TimeTravelStep,
  type WriteRadarReport,
} from '../../lib/studio';

type Tab = 'firewall' | 'adversary' | 'debug' | 'handshake';

export function StudioRail({
  draft,
  sim,
  payer,
  connection,
  timeTravelSteps,
  builtTx,
  builtKind = 'none',
  adversaryForks,
  onAdversaryForks,
  signTransaction,
  onDraftChange,
  onLog,
  onTimeTravelSteps,
}: {
  draft: TransactionDraft;
  sim: StateDiffResult | null;
  payer: string | null;
  connection: Connection | null;
  timeTravelSteps: TimeTravelStep[];
  builtTx: Transaction | null;
  builtKind?: BuiltTxKind;
  adversaryForks: AdversarialFork[];
  onAdversaryForks: (forks: AdversarialFork[]) => void;
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  onDraftChange: (next: TransactionDraft) => void;
  onLog: (msg: string, type?: 'info' | 'error' | 'success' | 'warning') => void;
  onTimeTravelSteps?: (steps: TimeTravelStep[]) => void;
}) {
  const [tab, setTab] = useState<Tab>('firewall');
  const [policy, setPolicy] = useState<FirewallPolicy>(() => loadFirewallPolicy());
  const [override, setOverride] = useState(false);
  const [radar, setRadar] = useState<WriteRadarReport | null>(null);
  const [radarBusy, setRadarBusy] = useState(false);
  const [advBusy, setAdvBusy] = useState(false);
  const [hsBlob, setHsBlob] = useState('');
  const [hsNote, setHsNote] = useState('');
  const [offer, setOffer] = useState<HandshakeOffer | null>(null);
  const [hsBusy, setHsBusy] = useState(false);
  const [forkLiveSim, setForkLiveSim] = useState<StateDiffResult | null>(null);
  const [ceremonyPeer, setCeremonyPeer] = useState('');
  const [lastLanded, setLastLanded] = useState<LandedRecord | null>(null);
  const [hsStale, setHsStale] = useState<string | null>(null);
  const versionedNote = versionedLimitation(builtKind);

  const projected = useMemo(() => projectAdversarialForks(sim), [sim]);
  const forks = adversaryForks.length ? adversaryForks : projected;
  const worst = worstPayerDelta(forks.filter((f) => f.method === 'simulated' || !adversaryForks.length));

  const fw = useMemo(
    () =>
      evaluateFirewall({
        policy,
        sim,
        draft,
        worstAdversaryDeltaSol: worstPayerDelta(adversaryForks.filter((f) => f.method === 'simulated')),
      }),
    [policy, sim, draft, adversaryForks]
  );
  const dna = useMemo(() => computeTxDna(draft), [draft]);
  const shapes = useMemo(() => matchKnownShapes(dna), [dna]);
  const patches = useMemo(
    () => suggestFailurePatches(sim?.err, sim?.logs, draft),
    [sim, draft]
  );

  useEffect(() => {
    try {
      localStorage.setItem(
        'sealevel-last-firewall',
        JSON.stringify({ ok: fw.ok, n: fw.violations.length })
      );
      localStorage.setItem('sealevel-last-dna', dna.label);
    } catch {
      /* ignore */
    }
  }, [fw.ok, fw.violations.length, dna.label]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLastLanded(readLastLanded());
    const onTab = (e: Event) => {
      const t = (e as CustomEvent<string>).detail;
      if (t === 'firewall' || t === 'adversary' || t === 'debug' || t === 'handshake') setTab(t);
    };
    const onLanded = (e: Event) => {
      const rec = (e as CustomEvent<LandedRecord>).detail;
      if (rec?.signature) {
        setLastLanded(rec);
        setTab('debug');
      }
    };
    window.addEventListener(STUDIO_TAB_EVENT, onTab as EventListener);
    window.addEventListener('sealevel-landed-sig', onLanded as EventListener);
    return () => {
      window.removeEventListener(STUDIO_TAB_EVENT, onTab as EventListener);
      window.removeEventListener('sealevel-landed-sig', onLanded as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash || '';
    const m = hash.match(/handshake=([^&]+)/);
    if (m?.[1]) {
      try {
        const decoded = decodeHandshake(decodeURIComponent(m[1]));
        setOffer(decoded);
        setTab('handshake');
        onLog(`Loaded handshake blob ${decoded.id}`, 'info');
      } catch (e) {
        onLog(`Handshake blob invalid: ${e instanceof Error ? e.message : e}`, 'error');
      }
    }
    const hs = new URLSearchParams(window.location.search).get('hs');
    if (hs) {
      void fetchHandshakeRoom(hs).then((room) => {
        if (!room) {
          onLog(`Handshake room ${hs} not found or expired.`, 'error');
          return;
        }
        setOffer(room.offer);
        setTab('handshake');
        if (room.stale) {
          setHsStale(room.staleReason || 'Blockhash stale — re-prepare.');
          onLog(room.staleReason || 'Room blockhash stale', 'warning');
        } else {
          setHsStale(null);
        }
        onLog(`Loaded handshake room /h/${hs}`, 'success');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistPolicy = (next: FirewallPolicy) => {
    setPolicy(next);
    saveFirewallPolicy(next);
  };

  const runAdversary = async (waitExtraSlots = 0) => {
    if (!connection || !builtTx || !payer) {
      onLog('Build a legacy tx first (Advanced → Build). Versioned/arb txs cannot be forked this way.', 'warning');
      return;
    }
    setAdvBusy(true);
    try {
      const live = await runAdversarialSims(connection, builtTx, payer, { waitExtraSlots });
      onAdversaryForks(live);
      const w = worstPayerDelta(live.filter((f) => f.method === 'simulated'));
      onLog(
        `Live adversarial sims done. Worst payer Δ ${w == null ? '—' : w.toFixed(6)} SOL. Sandwich is same-payer write contention, not a funded searcher.`,
        live.some((f) => f.err) ? 'warning' : 'success'
      );
    } catch (e) {
      onLog(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setAdvBusy(false);
    }
  };

  const scanRadar = async () => {
    if (!fw.writable.length) {
      setRadar(summarizeWriteRadar([], {}));
      return;
    }
    setRadarBusy(true);
    try {
      const res = await fetch('/api/studio/write-radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addresses: fw.writable.slice(0, 4) }),
      });
      const json = await res.json();
      if (json.ok) {
        setRadar(summarizeWriteRadar(fw.writable, json.sigsByAddress || {}, Date.now(), json.slot));
        return;
      }
      throw new Error(json.error || 'radar api failed');
    } catch {
      if (!connection) {
        setRadar(summarizeWriteRadar(fw.writable, {}));
        setRadarBusy(false);
        return;
      }
      const sigsByAddress: Record<string, any[]> = {};
      const slot = await connection.getSlot('processed').catch(() => undefined);
      await Promise.all(
        fw.writable.slice(0, 4).map(async (addr) => {
          try {
            const sigs = await connection.getSignaturesForAddress(new PublicKey(addr), { limit: 8 });
            sigsByAddress[addr] = sigs.map((s) => ({
              signature: s.signature,
              slot: s.slot,
              err: s.err,
              blockTime: s.blockTime,
              confirmationStatus: s.confirmationStatus,
            }));
          } catch {
            sigsByAddress[addr] = [];
          }
        })
      );
      setRadar(summarizeWriteRadar(fw.writable, sigsByAddress, Date.now(), slot));
    } finally {
      setRadarBusy(false);
    }
  };

  const persistOffer = async (next: HandshakeOffer): Promise<HandshakeOffer> => {
    try {
      const saved = await pushHandshakeRoom(next);
      setOffer(saved);
      return saved;
    } catch (e) {
      onLog(`Room persist failed (blob still works): ${e instanceof Error ? e.message : e}`, 'warning');
      setOffer(next);
      return next;
    }
  };

  const copyOffer = async (next: HandshakeOffer) => {
    const saved = await persistOffer(next);
    const blob = encodeHandshake(saved);
    setHsBlob(blob);
    const url = saved.roomId
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/h/${saved.roomId}`
      : `${typeof window !== 'undefined' ? window.location.origin : ''}#handshake=${blob}`;
    try {
      await navigator.clipboard.writeText(url);
      onLog(saved.roomId ? `Room URL copied: /h/${saved.roomId}` : 'Handshake blob URL copied.', 'success');
    } catch {
      onLog('Copy failed — blob is in the textarea.', 'warning');
    }
    return saved;
  };

  return (
    <div className="space-y-3 text-xs">
      <div className="flex flex-wrap gap-1">
        {(
          [
            ['firewall', ShieldAlert, 'Firewall'],
            ['adversary', Swords, 'Adversary'],
            ['debug', GitFork, 'Debug'],
            ['handshake', HeartHandshake, 'Handshake'],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-1 rounded px-2 py-1 ${
              tab === id ? 'bg-teal-800 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2 space-y-1">
        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <Fingerprint size={12} className="text-purple-400" />
          <span className="font-mono truncate" title={dna.label}>
            DNA {dna.label}
          </span>
        </div>
        {shapes[0] && (
          <p className="text-[10px] text-slate-500">
            Closest shape: {shapes[0].name} ({Math.round(shapes[0].score * 100)}%)
          </p>
        )}
        {dna.shape === 'suspicious' && (
          <p className="text-[10px] text-amber-300">Topology looks drain-like. Do not Execute on mainnet size.</p>
        )}
        {lastLanded?.signature && (
          <p className="text-[10px] text-cyan-300/90">
            Last landed ({lastLanded.source}): {lastLanded.signature.slice(0, 8)}…
            {lastLanded.dnaHash ? ` · DNA ${lastLanded.dnaHash}` : ''}
            {lastLanded.fill?.settled ? ` · chain ${lastLanded.fill.sol.toFixed(4)} SOL` : ''}
          </p>
        )}
      </div>

      {tab === 'firewall' && (
        <div className="space-y-2">
          <div
            className={`rounded-lg border p-2 ${
              fw.ok ? 'border-emerald-800 bg-emerald-950/30' : 'border-red-800 bg-red-950/30'
            }`}
            data-sealevel-target="signing-firewall"
          >
            <p className="font-semibold text-slate-100">
              {policy.enabled ? (fw.ok ? 'Firewall green' : 'Firewall blocked') : 'Firewall off'}
            </p>
            {fw.payerDeltaSol != null && (
              <p className="text-slate-400">Clean payer Δ {fw.payerDeltaSol.toFixed(6)} SOL</p>
            )}
            {fw.violations.map((v) => (
              <p key={v.code + v.message} className="text-amber-200 mt-1">
                • {v.message}
              </p>
            ))}
          </div>
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={policy.enabled}
              onChange={(e) => persistPolicy({ ...policy, enabled: e.target.checked })}
            />
            Enforce semantic policy on Execute
          </label>
          <label className="block text-slate-400">
            Max payer spend (SOL)
            <input
              type="number"
              step="0.001"
              min="0"
              value={policy.maxPayerSolSpend}
              onChange={(e) => persistPolicy({ ...policy, maxPayerSolSpend: Number(e.target.value) })}
              className="mt-1 w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-white"
            />
          </label>
          <label className="flex items-center gap-2 text-slate-300">
            <input
              type="checkbox"
              checked={policy.allowUnknownPrograms}
              onChange={(e) => persistPolicy({ ...policy, allowUnknownPrograms: e.target.checked })}
            />
            Allow unknown programs
          </label>
          <label className="flex items-start gap-2 text-amber-100">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              data-sealevel-target="firewall-override"
            />
            Override firewall for the next Execute (highlight-only for Grok)
          </label>
          <p className="text-[10px] text-slate-500" data-firewall-override={override ? '1' : '0'}>
            Grok cannot click Execute or this override. Adversary spend uses live forks only, never arithmetic projections.
          </p>
        </div>
      )}

      {tab === 'adversary' && (
        <div className="space-y-2">
          <p className="text-slate-400">
            Worst payer Δ:{' '}
            <span className="text-amber-200 font-mono">{worst == null ? '—' : `${worst.toFixed(6)} SOL`}</span>
            <span className="ml-1 text-[10px] text-slate-500">
              {adversaryForks.length ? '(live simulateTransaction)' : '(projection — run live forks)'}
            </span>
          </p>
          {versionedNote && (
            <p className="text-[11px] text-amber-200 border border-amber-900/50 rounded p-2">{versionedNote}</p>
          )}
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              data-sealevel-target="adversary-run"
              disabled={advBusy || !builtTx || builtKind === 'versioned'}
              onClick={() => void runAdversary(0)}
              className="rounded bg-teal-800 px-2 py-1 text-white disabled:opacity-40"
            >
              {advBusy ? 'Simulating…' : 'Run live forks'}
            </button>
            <button
              type="button"
              disabled={advBusy || !builtTx || builtKind === 'versioned'}
              onClick={() => void runAdversary(2)}
              className="rounded bg-slate-800 px-2 py-1 text-slate-200 disabled:opacity-40"
            >
              Wait 2 slots & re-sim
            </button>
          </div>
          {forks.map((f) => (
            <div key={f.id} className="rounded border border-slate-800 p-2">
              <div className="flex justify-between text-slate-200">
                <span>
                  {f.label}{' '}
                  <span className="text-[10px] text-slate-500">{f.method}</span>
                </span>
                <span className="font-mono">
                  {f.err ? 'revert' : f.payerDeltaSol == null ? '—' : `${f.payerDeltaSol.toFixed(6)}`}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{f.note}</p>
              {f.slot != null && <p className="text-[10px] text-slate-600">slot {f.slot}</p>}
            </div>
          ))}
          <button
            type="button"
            onClick={() => void scanRadar()}
            disabled={radarBusy}
            className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
            data-sealevel-target="write-radar"
          >
            <Radar size={12} /> {radarBusy ? 'Scanning…' : 'Scan write-set (processed)'}
          </button>
          {radar && (
            <>
              <p className={radar.collisions ? 'text-amber-300' : 'text-slate-400'}>{radar.note}</p>
              <p className="text-[10px] text-slate-600">{radar.caveat}</p>
            </>
          )}
          {radar?.hits.slice(0, 6).map((h) => (
            <a
              key={h.signature + h.address}
              href={`https://solscan.io/tx/${h.signature}`}
              target="_blank"
              rel="noreferrer"
              className="block font-mono text-[10px] text-cyan-400 truncate"
            >
              {h.pending ? 'PEND' : h.confirmation || 'conf'} · {h.address.slice(0, 4)}… {h.signature.slice(0, 8)}…
              {h.slot != null ? ` · slot ${h.slot}` : ''}
            </a>
          ))}
        </div>
      )}

      {tab === 'debug' && (
        <div className="space-y-2">
          <p className="text-slate-400 inline-flex items-center gap-1">
            <Wand2 size={12} /> Failure → patch
          </p>
          {patches.length === 0 && <p className="text-slate-500">No patches. Failed sim logs will land here.</p>}
          {patches.map((p) => (
            <div key={p.id} className="rounded border border-slate-800 p-2 space-y-1">
              <p className="text-slate-100 font-medium">{p.title}</p>
              <p className="text-[10px] text-slate-500">{p.detail}</p>
              {p.apply.type !== 'hint' && (
                <button
                  type="button"
                  onClick={() => {
                    onDraftChange(applyFailurePatch(draft, p));
                    onLog(`Applied patch: ${p.title}`, 'success');
                  }}
                  className="rounded bg-purple-800 px-2 py-0.5 text-white"
                >
                  Apply
                </button>
              )}
            </div>
          ))}
          {timeTravelSteps.length > 0 && (
            <div className="space-y-1">
              <p className="text-slate-300">Time-travel ({timeTravelSteps.length} steps)</p>
              <p className="text-[10px] text-slate-500">
                Historical banks exist only as meta pre (start) and meta post (end). Inner CPIs share the enclosing outer. Live prefix = current bank reconstruction.
              </p>
              <div className="max-h-56 overflow-y-auto space-y-1">
                {timeTravelSteps.map((s) => (
                  <button
                    key={s.index}
                    type="button"
                    onClick={async () => {
                      const remaining = forkDraftFromStep(timeTravelSteps, s.index);
                      onDraftChange({ instructions: remaining });
                      const snap = snapshotAtStep(timeTravelSteps, s.index);
                      onLog(
                        `Forked from step ${s.index} (${s.name}). Historical: ${snap?.source || 'none'}. ${snap?.note || ''}`,
                        'info'
                      );
                      if (connection && payer && remaining.length) {
                        const live = await resimTailDraft(connection, remaining, payer);
                        setForkLiveSim(live);
                        onLog(
                          live.err
                            ? `Live tail re-sim reverted: ${live.err}`
                            : `Live tail re-sim OK · ${live.diffs.length} deltas on CURRENT bank (not historical slot).`,
                          live.err ? 'warning' : 'success'
                        );
                      }
                    }}
                    className={`w-full text-left rounded px-2 py-1 border border-slate-800 hover:border-teal-700 ${
                      s.inner ? 'text-slate-500 pl-4' : 'text-slate-200'
                    }`}
                  >
                    {s.index}. {s.name}
                    <span className="block font-mono text-[10px] text-slate-600 truncate">
                      {s.programId}
                    </span>
                    {s.historical && (
                      <span className="block text-[10px] text-teal-600/80">hist {s.historical.source}</span>
                    )}
                    {s.livePrefix && (
                      <span className="block text-[10px] text-amber-600/80">
                        live-prefix {s.livePrefix.err ? 'err' : `${s.livePrefix.accounts.length} Δ`}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {forkLiveSim && (
                <p className="text-[10px] text-slate-400">
                  Last fork live re-sim: {forkLiveSim.err || `${forkLiveSim.diffs.length} account deltas`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'handshake' && (
        <div className="space-y-2">
          <p className="text-slate-400">
            Two signed legs, one Jito bundle (A then B, tip on B). Share <span className="font-mono">/h/id</span> — not a giant URL blob.
          </p>
          {hsStale && <p className="text-amber-300">{hsStale}</p>}
          <div className="rounded border border-slate-800 p-2 space-y-1">
            <p className="text-slate-300 font-medium">0.001 SOL ceremony</p>
            <p className="text-[10px] text-slate-500">
              A sends 0.001 SOL to B. B acks 1 lamport + pays Jito tip. Mainnet Phantom ×2. Dogfood this twice before adding features.
            </p>
            <input
              value={ceremonyPeer}
              onChange={(e) => setCeremonyPeer(e.target.value.trim())}
              placeholder="Counterparty address"
              className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-white font-mono"
            />
            <button
              type="button"
              disabled={!payer || !ceremonyPeer}
              onClick={async () => {
                if (!payer) return;
                const { a, b } = buildCeremonyInstructions(payer, ceremonyPeer);
                onDraftChange({ instructions: a });
                const created = createHandshake({
                  partyA: { address: payer, instructions: a },
                  partyB: { address: ceremonyPeer, instructions: b },
                  note: '0.001 SOL ceremony',
                  tipLamports: 10_000,
                });
                created.status = 'ready';
                const saved = await copyOffer(created);
                setTab('handshake');
                onLog(`Ceremony room ${saved.roomId || saved.id}: A=0.001 SOL → B, B=1 lamport ack.`, 'success');
              }}
              className="rounded bg-teal-900 px-2 py-1 text-teal-100 disabled:opacity-40"
            >
              Start ceremony as A
            </button>
            {offer && (
              <ul className="text-[10px] text-slate-400 space-y-0.5">
                {ceremonyChecklist(offer, payer).map((s) => (
                  <li key={s.id} className={s.done ? 'text-emerald-400' : ''}>
                    {s.done ? '✓' : '○'} {s.label}
                    {s.detail ? ` · ${s.detail}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <input
            value={hsNote}
            onChange={(e) => setHsNote(e.target.value)}
            placeholder="Note (OTC, rent, NFT…)"
            className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1 text-white"
          />
          <button
            type="button"
            data-sealevel-target="handshake-create"
            onClick={async () => {
              const created = createHandshake({
                partyA: { address: payer || undefined, instructions: draft.instructions },
                note: hsNote,
              });
              setOffer(created);
              await copyOffer(created);
            }}
            className="rounded bg-teal-800 px-2 py-1 text-white"
          >
            Create offer from current cards
          </button>
          <textarea
            value={hsBlob}
            onChange={(e) => setHsBlob(e.target.value)}
            placeholder="Paste handshake blob / URL hash"
            className="w-full h-16 rounded bg-slate-900 border border-slate-700 px-2 py-1 font-mono text-[10px] text-slate-300"
          />
          <button
            type="button"
            onClick={() => {
              try {
                const raw = hsBlob.includes('handshake=') ? hsBlob.split('handshake=')[1]! : hsBlob;
                const decoded = decodeHandshake(raw.trim());
                setOffer({ ...decoded, status: deriveHandshakeStatus(decoded) });
                onLog(handshakeSummary(decoded), 'info');
              } catch (e) {
                onLog(e instanceof Error ? e.message : 'bad blob', 'error');
              }
            }}
            className="rounded bg-slate-800 px-2 py-1 text-slate-200"
          >
            Load blob
          </button>
          {offer && (
            <div className="rounded border border-teal-900 p-2 space-y-1">
              <p className="text-teal-200">{handshakeSummary(offer)}</p>
              {offer.note && <p className="text-slate-500">{offer.note}</p>}
              {offer.blockhash && (
                <p className="font-mono text-[10px] text-slate-500">
                  bh {offer.blockhash.slice(0, 8)}… valid≤{offer.lastValidBlockHeight}
                </p>
              )}
              {offer.submitError && <p className="text-red-300">{offer.submitError}</p>}
              {offer.landedSignatures?.map((s) => (
                <a
                  key={s}
                  href={`https://solscan.io/tx/${s}`}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-cyan-400 font-mono"
                >
                  landed {s.slice(0, 12)}…
                </a>
              ))}
              <button
                type="button"
                data-sealevel-target="handshake-counter"
                onClick={() => {
                  const next = counterHandshake(offer, {
                    address: payer || undefined,
                    instructions: draft.instructions,
                  });
                  setOffer(next);
                  void copyOffer(next);
                }}
                className="rounded bg-purple-800 px-2 py-1 text-white mr-1"
              >
                Attach my cards as party B
              </button>
              <button
                type="button"
                disabled={hsBusy || !connection || !offer.partyB?.address}
                onClick={async () => {
                  if (!connection) return;
                  setHsBusy(true);
                  try {
                    const next = await prepareHandshakeBundle(connection, offer);
                    setOffer(next);
                    await copyOffer(next);
                    onLog('Shared blockhash frozen. Each party signs their own leg.', 'success');
                  } catch (e) {
                    onLog(e instanceof Error ? e.message : String(e), 'error');
                  } finally {
                    setHsBusy(false);
                  }
                }}
                className="rounded bg-slate-800 px-2 py-1 text-slate-200 disabled:opacity-40 mr-1"
              >
                Prepare bundle
              </button>
              <button
                type="button"
                disabled={hsBusy || !payer || !offer.unsignedTxA}
                onClick={async () => {
                  if (!payer) return;
                  setHsBusy(true);
                  try {
                    const which =
                      payer === offer.partyA.address ? 'A' : payer === offer.partyB?.address ? 'B' : null;
                    if (!which) throw new Error('Active wallet is neither party A nor B');
                    const next = await signHandshakeLeg(offer, which, payer, signTransaction);
                    setOffer(next);
                    await copyOffer(next);
                    onLog(`Party ${which} signed. Pass the blob to the other signer.`, 'success');
                  } catch (e) {
                    onLog(e instanceof Error ? e.message : String(e), 'error');
                  } finally {
                    setHsBusy(false);
                  }
                }}
                className="rounded bg-slate-800 px-2 py-1 text-slate-200 disabled:opacity-40 mr-1"
              >
                Sign my leg
              </button>
              <button
                type="button"
                data-sealevel-target="handshake-submit"
                disabled={hsBusy || !offer.partyA.signedTxBase64 || !offer.partyB?.signedTxBase64}
                onClick={async () => {
                  setHsBusy(true);
                  try {
                    const next = await submitHandshakeBundle(offer);
                    setOffer(next);
                    await copyOffer(next);
                    if (next.landedSignatures?.[0]) {
                      noticeLanded({
                        signature: next.landedSignatures[0],
                        source: 'handshake',
                        payer,
                      });
                    }
                    onLog(
                      next.status === 'landed'
                        ? `Bundle landed slot ${next.landedSlot}.`
                        : `Bundle ${next.status}${next.submitError ? `: ${next.submitError}` : ''}`,
                      next.status === 'landed' ? 'success' : 'warning'
                    );
                  } catch (e) {
                    onLog(e instanceof Error ? e.message : String(e), 'error');
                  } finally {
                    setHsBusy(false);
                  }
                }}
                className="rounded bg-emerald-800 px-2 py-1 text-white disabled:opacity-40"
              >
                Submit Jito bundle
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function isFirewallOverrideChecked(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector('[data-firewall-override="1"]') != null;
}
