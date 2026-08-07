export type RadarHit = {
  address: string;
  signature: string;
  slot?: number;
  err?: string | null;
  ageMs?: number;
  confirmation?: string | null;
  pending: boolean;
  nearHead: boolean;
};

export type WriteRadarReport = {
  writable: string[];
  hits: RadarHit[];
  collisions: number;
  pending: number;
  currentSlot?: number;
  note: string;
  caveat: string;
};

export const RADAR_CAVEAT =
  'processed commitment + signature statuses. Not a private mempool — Jito/TPU-only shreds are invisible.';

export function summarizeWriteRadar(
  writable: string[],
  sigsByAddress: Record<
    string,
    Array<{
      signature: string;
      slot?: number;
      err?: unknown;
      blockTime?: number | null;
      confirmationStatus?: string | null;
    }>
  >,
  now = Date.now(),
  currentSlot?: number
): WriteRadarReport {
  const hits: RadarHit[] = [];
  for (const addr of writable.slice(0, 6)) {
    for (const s of sigsByAddress[addr] || []) {
      const confirmation = s.confirmationStatus || null;
      const pending = confirmation === 'processed' || confirmation === 'received';
      const nearHead =
        currentSlot != null && s.slot != null ? currentSlot - s.slot <= 2 && currentSlot - s.slot >= 0 : false;
      hits.push({
        address: addr,
        signature: s.signature,
        slot: s.slot,
        err: s.err ? String(s.err) : null,
        ageMs: s.blockTime ? Math.max(0, now - s.blockTime * 1000) : undefined,
        confirmation,
        pending,
        nearHead,
      });
    }
  }
  hits.sort((a, b) => {
    if (a.pending !== b.pending) return a.pending ? -1 : 1;
    if ((a.slot ?? 0) !== (b.slot ?? 0)) return (b.slot ?? 0) - (a.slot ?? 0);
    return (a.ageMs ?? 9e15) - (b.ageMs ?? 9e15);
  });
  const pending = hits.filter((h) => h.pending && !h.err).length;
  const near = hits.filter((h) => h.nearHead && !h.err).length;
  const collisions = pending + near;
  let note: string;
  if (!writable.length) note = 'No writable accounts in the draft yet.';
  else if (collisions) {
    note = `${pending} processed/unconfirmed + ${near} within 2 slots of head ${
      currentSlot ?? '?'
    } on your write set.`;
  } else {
    note = `No processed-head collisions on these writables @ slot ${currentSlot ?? '?'}.`;
  }
  return {
    writable,
    hits: hits.slice(0, 16),
    collisions,
    pending,
    currentSlot,
    note,
    caveat: RADAR_CAVEAT,
  };
}
