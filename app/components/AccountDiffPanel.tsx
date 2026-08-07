'use client';

import React, { useState } from 'react';
import { formatLamportsDelta, formatTokenDelta, type StateDiffResult } from '../lib/tx/state-diff';

export function AccountDiffPanel({
  result,
  compact,
}: {
  result: StateDiffResult;
  compact?: boolean;
}) {
  const [showLogs, setShowLogs] = useState(false);
  const ok = !result.err;

  return (
    <div
      className={`rounded-xl border ${
        ok ? 'border-teal-700/50 bg-slate-950/90' : 'border-red-800/60 bg-red-950/30'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-teal-300/80">Simulated account diff</div>
          <p className="text-xs text-slate-400">
            {ok ? 'Simulation OK' : `Simulation failed: ${result.err}`}
            {result.unitsConsumed != null ? ` · ${result.unitsConsumed.toLocaleString()} CU` : ''}
            {result.diffs.length ? ` · ${result.diffs.length} accounts change` : ' · no lamport/token deltas'}
          </p>
        </div>
        {result.logs.length > 0 && (
          <button
            type="button"
            onClick={() => setShowLogs((v) => !v)}
            className="text-[11px] text-slate-400 hover:text-white"
          >
            {showLogs ? 'Hide logs' : 'Program logs'}
          </button>
        )}
      </div>

      {result.diffs.length === 0 ? (
        <p className="text-xs text-slate-500">No account deltas in the simulated set (static keys only).</p>
      ) : (
        <div className={`overflow-auto ${compact ? 'max-h-40' : 'max-h-64'}`}>
          <table className="w-full text-[11px] font-mono">
            <thead className="sticky top-0 bg-slate-950 text-slate-500">
              <tr>
                <th className="text-left py-1 pr-2">Account</th>
                <th className="text-right py-1 pr-2">SOL</th>
                <th className="text-right py-1">Token Δ</th>
              </tr>
            </thead>
            <tbody>
              {result.diffs.map((d) => (
                <tr key={d.address} className="border-t border-slate-800/70">
                  <td className="py-1 pr-2 text-slate-300" title={d.address}>
                    {d.role ? <span className="text-teal-400 mr-1">{d.role}</span> : null}
                    {d.address.slice(0, 4)}…{d.address.slice(-4)}
                  </td>
                  <td
                    className={`py-1 pr-2 text-right ${
                      d.deltaLamports > 0 ? 'text-emerald-400' : d.deltaLamports < 0 ? 'text-red-400' : 'text-slate-500'
                    }`}
                  >
                    {formatLamportsDelta(d.deltaLamports)}
                  </td>
                  <td className="py-1 text-right text-slate-400" title={d.tokenMint}>
                    {formatTokenDelta(d.tokenDelta) || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showLogs && (
        <pre className="mt-2 max-h-40 overflow-auto rounded bg-black/40 p-2 text-[10px] text-slate-400 whitespace-pre-wrap">
          {result.logs.slice(-40).join('\n')}
        </pre>
      )}
    </div>
  );
}
