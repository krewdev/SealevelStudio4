export type RadarHit = {
  address: string;
  signature: string;
  slot?: number;
  err?: string | null;
  ageMs?: number;
};

export type WriteRadarReport = {
  writable: string[];
  hits: RadarHit[];
  collisions: number;
  note: string;
};

export function summarizeWriteRadar(
  writable: string[],
  sigsByAddress: Record<string, Array<{ signature: string; slot?: number; err?: unknown; blockTime?: number | null }>>,
  now = Date.now()
): WriteRadarReport {
  const hits: RadarHit[] = [];
  for (const addr of writable.slice(0, 6)) {
    for (const s of sigsByAddress[addr] || []) {
      hits.push({
        address: addr,
        signature: s.signature,
        slot: s.slot,
        err: s.err ? String(s.err) : null,
        ageMs: s.blockTime ? Math.max(0, now - s.blockTime * 1000) : undefined,
      });
    }
  }
  hits.sort((a, b) => (a.ageMs ?? 9e15) - (b.ageMs ?? 9e15));
  const recent = hits.filter((h) => (h.ageMs ?? 0) < 15_000).length;
  return {
    writable,
    hits: hits.slice(0, 12),
    collisions: recent,
    note: recent
      ? `${recent} other tx(s) touched your write set in the last 15s.`
      : writable.length
        ? 'No recent foreign signatures on these writables (confirmed feed only — not a mempool).'
        : 'No writable accounts in the draft yet.',
  };
}
