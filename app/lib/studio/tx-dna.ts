import type { TransactionDraft, BuiltInstruction } from '../instructions/types';
import { programLabel } from './programs';

export type TxDna = {
  hash: string;
  programs: string[];
  roleSketch: string;
  shape: 'transfer' | 'token' | 'swap' | 'create' | 'suspicious' | 'custom';
  label: string;
};

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function computeTxDna(draft: TransactionDraft | BuiltInstruction[]): TxDna {
  const instructions = Array.isArray(draft) ? draft : draft.instructions || [];
  const programs = [
    ...new Set(instructions.map((ix) => ix.template.programId).filter(Boolean)),
  ].sort();
  let signers = 0;
  let writable = 0;
  let readonly = 0;
  for (const ix of instructions) {
    for (const acc of ix.template.accounts || []) {
      if (acc.type === 'signer') signers += 1;
      else if (acc.type === 'writable') writable += 1;
      else readonly += 1;
    }
  }
  const roleSketch = `S:${signers} W:${writable} R:${readonly} P:${programs.length} I:${instructions.length}`;
  const templateIds = instructions.map((ix) => ix.template.id).sort().join(',');
  const hash = fnv1a(`${programs.join('|')}#${roleSketch}#${templateIds}`);

  const ids = new Set(instructions.map((ix) => ix.template.id));
  const unknownPrograms = programs.filter(
    (p) =>
      !p.startsWith('1111') &&
      !p.startsWith('Token') &&
      !p.startsWith('AToken') &&
      !p.startsWith('JUP') &&
      !p.startsWith('Compute') &&
      !p.startsWith('6EF8') &&
      p !== 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'
  );

  let shape: TxDna['shape'] = 'custom';
  if (ids.has('jupiter_swap') || programs.some((p) => p.startsWith('JUP') || p.startsWith('6EF8'))) {
    shape = 'swap';
  } else if (ids.has('spl_token_create_mint') || ids.has('system_create_account')) {
    shape = 'create';
  } else if (ids.has('spl_token_transfer') || ids.has('spl_token_mint_to') || ids.has('spl_token_burn')) {
    shape = 'token';
  } else if (ids.has('system_transfer') && instructions.length <= 2) {
    shape = 'transfer';
  }
  if (unknownPrograms.length > 0 && ids.has('system_transfer') && writable >= 4) {
    shape = 'suspicious';
  }

  const label =
    shape === 'suspicious'
      ? `⚠ ${hash} · unknown program + transfer`
      : `${hash} · ${shape} · ${programs.map(programLabel).slice(0, 3).join(' + ') || 'empty'}`;

  return { hash, programs, roleSketch, shape, label };
}

export function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

export type KnownShape = { id: string; name: string; programs: string[]; note: string };

export const KNOWN_SHAPES: KnownShape[] = [
  {
    id: 'sys-transfer',
    name: 'Plain SOL transfer',
    programs: ['11111111111111111111111111111111', '11111111111111111111111111111112'],
    note: 'Single system transfer',
  },
  {
    id: 'jupiter-swap',
    name: 'Jupiter swap skeleton',
    programs: ['JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'],
    note: 'Aggregator swap',
  },
  {
    id: 'pump-buy',
    name: 'Pump.fun curve',
    programs: ['6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'],
    note: 'Bonding-curve buy/sell',
  },
  {
    id: 'drain-shape',
    name: 'Drain-like (unknown + system transfer)',
    programs: ['11111111111111111111111111111111', 'Unknown1111111111111111111111111111111111111'],
    note: 'Common approval-drain topology',
  },
];

export function matchKnownShapes(dna: TxDna): Array<KnownShape & { score: number }> {
  return KNOWN_SHAPES.map((s) => ({
    ...s,
    score: jaccard(dna.programs, s.programs),
  }))
    .filter((s) => s.score > 0.2 || (dna.shape === 'suspicious' && s.id === 'drain-shape'))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}
