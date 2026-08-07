import type { StateDiffResult } from '../tx/state-diff';

export type AdversarialForkId = 'now' | 'plus2' | 'sandwich' | 'fail-closed';

export type AdversarialFork = {
  id: AdversarialForkId;
  label: string;
  payerDeltaSol: number | null;
  err?: string;
  note: string;
};

function payerDelta(sim?: StateDiffResult | null): number | null {
  if (!sim) return null;
  const row = sim.diffs.find((d) => d.role === 'payer');
  if (row) return row.deltaLamports / 1e9;
  return null;
}

export function projectAdversarialForks(
  sim: StateDiffResult | null | undefined,
  opts?: { sandwichBps?: number; plus2Bps?: number }
): AdversarialFork[] {
  const sandwichBps = opts?.sandwichBps ?? 80;
  const plus2Bps = opts?.plus2Bps ?? 15;
  const base = payerDelta(sim);
  const now: AdversarialFork = {
    id: 'now',
    label: 'This slot (clean)',
    payerDeltaSol: base,
    err: sim?.err,
    note: sim?.err ? 'Base sim already fails.' : 'Current RPC state, no attacker ix.',
  };

  const plus2Delta =
    base == null ? null : base - Math.abs(base) * (plus2Bps / 10_000) - 0.000005;
  const plus2: AdversarialFork = {
    id: 'plus2',
    label: '+2 slots',
    payerDeltaSol: plus2Delta,
    note: `Assume curve/oracle moves ${plus2Bps} bps against you plus one extra fee tick.`,
  };

  const sandwichDelta =
    base == null ? null : base - Math.abs(base || 0.01) * (sandwichBps / 10_000);
  const sandwich: AdversarialFork = {
    id: 'sandwich',
    label: 'Sandwiched',
    payerDeltaSol: sandwichDelta,
    note: `Attacker ix front+back, ~${sandwichBps} bps worse payer Δ. Searchers do this; we show it.`,
  };

  const missingAta = (sim?.diffs || []).some(
    (d) => (d.dataLenBefore === 0 || d.dataLenAfter === 0) && Boolean(d.tokenMint || d.tokenDelta)
  );
  const failClosed: AdversarialFork = {
    id: 'fail-closed',
    label: 'Fail-closed (ATA/account gone)',
    payerDeltaSol: missingAta || sim?.err ? 0 : base,
    err: missingAta || sim?.err ? 'Would revert if ATA missing / account closed' : undefined,
    note: missingAta
      ? 'A token account in the diff is empty — this fork reverts.'
      : 'No empty token account in the sim set. Still assume close/ATA race can revert.',
  };

  return [now, plus2, sandwich, failClosed];
}

export function worstPayerDelta(forks: AdversarialFork[]): number | null {
  const nums = forks.map((f) => f.payerDeltaSol).filter((n): n is number => n != null);
  if (!nums.length) return null;
  return Math.min(...nums);
}
