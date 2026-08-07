'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
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
  computeTxDna,
  counterHandshake,
  createHandshake,
  decodeHandshake,
  encodeHandshake,
  evaluateFirewall,
  forkDraftFromStep,
  handshakeSummary,
  loadFirewallPolicy,
  matchKnownShapes,
  projectAdversarialForks,
  saveFirewallPolicy,
  suggestFailurePatches,
  summarizeWriteRadar,
  worstPayerDelta,
  type FirewallPolicy,
  type HandshakeOffer,
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
  onDraftChange,
  onLog,
}: {
  draft: TransactionDraft;
  sim: StateDiffResult | null;
  payer: string | null;
  connection: Connection | null;
  timeTravelSteps: TimeTravelStep[];
  onDraftChange: (next: TransactionDraft) => void;
  onLog: (msg: string, type?: 'info' | 'error' | 'success' | 'warning') => void;
}) {
  const [tab, setTab] = useState<Tab>('firewall');
  const [policy, setPolicy] = useState<FirewallPolicy>(() => loadFirewallPolicy());
  const [override, setOverride] = useState(false);
  const [radar, setRadar] = useState<WriteRadarReport | null>(null);
  const [hsBlob, setHsBlob] = useState('');
  const [hsNote, setHsNote] = useState('');
  const [offer, setOffer] = useState<HandshakeOffer | null>(null);

  const fw = useMemo(
    () => evaluateFirewall({ policy, sim, draft }),
    [policy, sim, draft]
  );
  const dna = useMemo(() => computeTxDna(draft), [draft]);
  const shapes = useMemo(() => matchKnownShapes(dna), [dna]);
  const forks = useMemo(() => projectAdversarialForks(sim), [sim]);
  const patches = useMemo(
    () => suggestFailurePatches(sim?.err, sim?.logs, draft),
    [sim, draft]
  );
  const worst = worstPayerDelta(forks);

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
    const hash = window.location.hash || '';
    const m = hash.match(/handshake=([^&]+)/);
    if (!m?.[1]) return;
    try {
      const decoded = decodeHandshake(decodeURIComponent(m[1]));
      setOffer(decoded);
      setTab('handshake');
      onLog(`Loaded handshake ${decoded.id}`, 'info');
    } catch (e) {
      onLog(`Handshake blob invalid: ${e instanceof Error ? e.message : e}`, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistPolicy = (next: FirewallPolicy) => {
    setPolicy(next);
    saveFirewallPolicy(next);
  };

  const scanRadar = async () => {
    if (!connection || !fw.writable.length) {
      setRadar(summarizeWriteRadar(fw.writable, {}));
      return;
    }
    const sigsByAddress: Record<
      string,
      Array<{ signature: string; slot?: number; err?: unknown; blockTime?: number | null }>
    > = {};
    await Promise.all(
      fw.writable.slice(0, 4).map(async (addr) => {
        try {
          const sigs = await connection.getSignaturesForAddress(new PublicKey(addr), { limit: 6 });
          sigsByAddress[addr] = sigs.map((s) => ({
            signature: s.signature,
            slot: s.slot,
            err: s.err,
            blockTime: s.blockTime,
          }));
        } catch {
          sigsByAddress[addr] = [];
        }
      })
    );
    setRadar(summarizeWriteRadar(fw.writable, sigsByAddress));
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
              <p className="text-slate-400">Payer Δ {fw.payerDeltaSol.toFixed(6)} SOL</p>
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
            Grok cannot click Execute or this override.
          </p>
        </div>
      )}

      {tab === 'adversary' && (
        <div className="space-y-2">
          <p className="text-slate-400">
            Worst payer Δ across forks:{' '}
            <span className="text-amber-200 font-mono">
              {worst == null ? '—' : `${worst.toFixed(6)} SOL`}
            </span>
          </p>
          {forks.map((f) => (
            <div key={f.id} className="rounded border border-slate-800 p-2">
              <div className="flex justify-between text-slate-200">
                <span>{f.label}</span>
                <span className="font-mono">
                  {f.err ? 'revert' : f.payerDeltaSol == null ? '—' : `${f.payerDeltaSol.toFixed(6)}`}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">{f.note}</p>
            </div>
          ))}
          <button
            type="button"
            onClick={() => void scanRadar()}
            className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-slate-200 hover:bg-slate-700"
            data-sealevel-target="write-radar"
          >
            <Radar size={12} /> Scan write-set radar
          </button>
          {radar && (
            <p className={radar.collisions ? 'text-amber-300' : 'text-slate-400'}>{radar.note}</p>
          )}
          {radar?.hits.slice(0, 5).map((h) => (
            <a
              key={h.signature + h.address}
              href={`https://solscan.io/tx/${h.signature}`}
              target="_blank"
              rel="noreferrer"
              className="block font-mono text-[10px] text-cyan-400 truncate"
            >
              {h.address.slice(0, 4)}… {h.signature.slice(0, 8)}…
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
              <div className="max-h-48 overflow-y-auto space-y-1">
                {timeTravelSteps.map((s) => (
                  <button
                    key={s.index}
                    type="button"
                    onClick={() => {
                      onDraftChange({ instructions: forkDraftFromStep(timeTravelSteps, s.index) });
                      onLog(`Forked draft from step ${s.index} (${s.name})`, 'info');
                    }}
                    className={`w-full text-left rounded px-2 py-1 border border-slate-800 hover:border-teal-700 ${
                      s.inner ? 'text-slate-500 pl-4' : 'text-slate-200'
                    }`}
                  >
                    {s.index}. {s.name}
                    <span className="block font-mono text-[10px] text-slate-600 truncate">
                      {s.programId}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'handshake' && (
        <div className="space-y-2">
          <p className="text-slate-400">
            Two-human atomic: your cards + theirs, one Jito bundle. No escrow program.
          </p>
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
              const blob = encodeHandshake(created);
              const url = `${typeof window !== 'undefined' ? window.location.origin : ''}#handshake=${blob}`;
              try {
                await navigator.clipboard.writeText(url);
                onLog('Handshake URL copied. Counterparty opens it to attach their ixs.', 'success');
              } catch {
                setHsBlob(blob);
              }
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
                setOffer(decoded);
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
              <button
                type="button"
                data-sealevel-target="handshake-counter"
                onClick={() => {
                  const next = counterHandshake(offer, {
                    address: payer || undefined,
                    instructions: draft.instructions,
                  });
                  setOffer(next);
                  const blob = encodeHandshake(next);
                  setHsBlob(blob);
                  void navigator.clipboard.writeText(blob).catch(() => undefined);
                  onLog('Counter attached. Both sides should Build + Execute in slot order or submit as Jito bundle.', 'success');
                }}
                className="rounded bg-purple-800 px-2 py-1 text-white"
              >
                Attach my cards as party B
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
