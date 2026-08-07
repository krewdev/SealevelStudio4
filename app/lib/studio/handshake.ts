import type { BuiltInstruction, TransactionDraft } from '../instructions/types';
import { computeTxDna } from './tx-dna';

export type HandshakeParty = {
  label?: string;
  address?: string;
  instructions: BuiltInstruction[];
};

export type HandshakeOffer = {
  v: 1;
  id: string;
  note?: string;
  createdAt: number;
  tipLamports: number;
  partyA: HandshakeParty;
  partyB?: HandshakeParty;
  status: 'open' | 'countered' | 'ready';
};

function randomId(): string {
  return `hs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createHandshake(opts: {
  partyA: HandshakeParty;
  note?: string;
  tipLamports?: number;
}): HandshakeOffer {
  return {
    v: 1,
    id: randomId(),
    note: opts.note,
    createdAt: Date.now(),
    tipLamports: opts.tipLamports ?? 10_000,
    partyA: opts.partyA,
    status: 'open',
  };
}

export function counterHandshake(offer: HandshakeOffer, partyB: HandshakeParty): HandshakeOffer {
  return {
    ...offer,
    partyB,
    status: partyB.instructions?.length ? 'ready' : 'countered',
  };
}

export function encodeHandshake(offer: HandshakeOffer): string {
  const json = JSON.stringify(offer);
  const b64 =
    typeof Buffer !== 'undefined'
      ? Buffer.from(json, 'utf8').toString('base64')
      : btoa(json);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function decodeHandshake(raw: string): HandshakeOffer {
  const s = raw.trim().replace(/-/g, '+').replace(/_/g, '/');
  const pad = s + '='.repeat((4 - (s.length % 4)) % 4);
  let json: string;
  if (typeof Buffer !== 'undefined') {
    json = Buffer.from(pad, 'base64').toString('utf8');
  } else {
    json = atob(pad);
  }
  const parsed = JSON.parse(json) as HandshakeOffer;
  if (parsed?.v !== 1 || !parsed.partyA) throw new Error('Not a Sealevel handshake v1 blob');
  return parsed;
}

export function handshakeSummary(offer: HandshakeOffer): string {
  const a = computeTxDna({ instructions: offer.partyA.instructions || [] });
  const b = offer.partyB
    ? computeTxDna({ instructions: offer.partyB.instructions || [] })
    : null;
  return [
    `A ${offer.partyA.address?.slice(0, 4) || 'anon'}… ${a.roleSketch}`,
    b ? `B ${offer.partyB?.address?.slice(0, 4) || 'anon'}… ${b.roleSketch}` : 'B waiting',
    `tip ${offer.tipLamports} · ${offer.status}`,
  ].join(' · ');
}

export function combinedDraft(offer: HandshakeOffer): TransactionDraft {
  return {
    instructions: [
      ...(offer.partyA.instructions || []),
      ...(offer.partyB?.instructions || []),
    ],
    memo: `handshake ${offer.id}`,
  };
}
