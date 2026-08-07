import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import type { StateDiffResult } from '../tx/state-diff';
import { diffAnyTransaction } from '../tx/state-diff';
import { cloneLegacyTx } from './tx-clone';

export type AdversarialForkId = 'now' | 'plus2' | 'sandwich' | 'fail-closed';

export type AdversarialFork = {
  id: AdversarialForkId;
  label: string;
  payerDeltaSol: number | null;
  err?: string;
  note: string;
  method: 'simulated' | 'projected' | 'unavailable';
  slot?: number;
  unitsConsumed?: number;
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
  return [
    {
      id: 'now',
      label: 'This slot (clean)',
      payerDeltaSol: base,
      err: sim?.err,
      note: sim?.err ? 'Base sim already fails.' : 'Projection only — run live forks for real simulateTransaction.',
      method: 'projected',
    },
    {
      id: 'plus2',
      label: '+2 slots',
      payerDeltaSol: base == null ? null : base - Math.abs(base) * (plus2Bps / 10_000) - 0.000005,
      note: `Arithmetic stand-in (${plus2Bps} bps). Not a future bank.`,
      method: 'projected',
    },
    {
      id: 'sandwich',
      label: 'Sandwiched',
      payerDeltaSol: base == null ? null : base - Math.abs(base || 0.01) * (sandwichBps / 10_000),
      note: `Arithmetic stand-in (~${sandwichBps} bps). Not a third-party searcher.`,
      method: 'projected',
    },
    {
      id: 'fail-closed',
      label: 'Fail-closed (ATA/account gone)',
      payerDeltaSol: (sim?.diffs || []).some((d) => d.dataLenBefore === 0 && d.tokenMint) ? 0 : base,
      err: (sim?.diffs || []).some((d) => d.dataLenBefore === 0 && d.tokenMint)
        ? 'Would revert if ATA missing / account closed'
        : undefined,
      note: 'Heuristic from empty token accounts in the clean sim.',
      method: 'projected',
    },
  ];
}

export function worstPayerDelta(forks: AdversarialFork[]): number | null {
  const nums = forks
    .filter((f) => !f.err)
    .map((f) => f.payerDeltaSol)
    .filter((n): n is number => n != null);
  if (!nums.length) return null;
  return Math.min(...nums);
}

export async function waitForSlotAdvance(
  connection: Connection,
  extraSlots: number,
  timeoutMs = 4500
): Promise<{ start: number; end: number; advanced: number }> {
  const start = await connection.getSlot('processed');
  const deadline = Date.now() + timeoutMs;
  let end = start;
  while (end < start + extraSlots && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 180));
    end = await connection.getSlot('processed');
  }
  return { start, end, advanced: Math.max(0, end - start) };
}

function firstHostileTarget(tx: Transaction, payer: PublicKey): PublicKey | null {
  const programs = new Set(tx.instructions.map((ix) => ix.programId.toBase58()));
  for (const ix of tx.instructions) {
    for (const k of ix.keys) {
      if (!k.isWritable) continue;
      if (k.pubkey.equals(payer)) continue;
      if (programs.has(k.pubkey.toBase58())) continue;
      return k.pubkey;
    }
  }
  return null;
}

/**
 * Real simulateTransaction forks of a legacy builder tx.
 * Sandwich = same-payer 1-lamport write to the first foreign writable + trailing self-transfer.
 * That is contention on the write set, NOT a funded third-party AMM sandwich (we cannot invent attacker inventory).
 */
export async function runAdversarialSims(
  connection: Connection,
  tx: Transaction,
  payer: string,
  opts?: { waitExtraSlots?: number }
): Promise<AdversarialFork[]> {
  const payerPk = new PublicKey(payer);
  const baseSlot = await connection.getSlot('processed');

  const nowSim = await diffAnyTransaction(connection, cloneLegacyTx(tx), { payer });
  const forks: AdversarialFork[] = [
    {
      id: 'now',
      label: 'This slot (clean)',
      payerDeltaSol: payerDelta(nowSim),
      err: nowSim.err,
      note: `simulateTransaction @ processed slot ${baseSlot}.`,
      method: 'simulated',
      slot: baseSlot,
      unitsConsumed: nowSim.unitsConsumed,
    },
  ];

  const target = firstHostileTarget(tx, payerPk);
  const sandwichTx = cloneLegacyTx(tx);
  if (target) {
    sandwichTx.instructions.unshift(
      SystemProgram.transfer({
        fromPubkey: payerPk,
        toPubkey: target,
        lamports: 1,
      })
    );
  }
  sandwichTx.add(
    SystemProgram.transfer({
      fromPubkey: payerPk,
      toPubkey: payerPk,
      lamports: 1,
    })
  );
  if (!sandwichTx.feePayer) sandwichTx.feePayer = payerPk;
  const sandwichSim = await diffAnyTransaction(connection, sandwichTx, { payer });
  forks.push({
    id: 'sandwich',
    label: 'Write-set contention (same payer)',
    payerDeltaSol: payerDelta(sandwichSim),
    err: sandwichSim.err,
    note: target
      ? `Prepended 1-lamport transfer to ${target.toBase58().slice(0, 4)}… (first foreign writable) and appended 1-lamport self-transfer, then simulateTransaction. Not a third-party searcher with inventory.`
      : 'No foreign writable to contend; only a 1-lamport self-transfer was added. Price-sandwich is not applicable to this tx shape.',
    method: 'simulated',
    slot: baseSlot,
    unitsConsumed: sandwichSim.unitsConsumed,
  });

  const victim = target;
  if (victim) {
    const ghost = Keypair.generate().publicKey;
    const failTx = replaceOrNote(tx, victim, ghost, payerPk);
    const failSim = await diffAnyTransaction(connection, failTx, { payer });
    forks.push({
      id: 'fail-closed',
      label: 'Fail-closed (writable replaced with empty key)',
      payerDeltaSol: payerDelta(failSim),
      err: failSim.err || (!failSim.err ? undefined : failSim.err),
      note: `Replaced ${victim.toBase58().slice(0, 4)}… with a never-created key ${ghost.toBase58().slice(0, 4)}… and re-simmed. ${
        failSim.err ? 'Reverted as expected if that account is required.' : 'Did not revert — that writable is not load-critical.'
      }`,
      method: 'simulated',
      slot: baseSlot,
      unitsConsumed: failSim.unitsConsumed,
    });
  } else {
    forks.push({
      id: 'fail-closed',
      label: 'Fail-closed',
      payerDeltaSol: null,
      err: 'No foreign writable account to delete',
      note: 'Cannot simulate a missing ATA/account without a non-payer writable key in the tx.',
      method: 'unavailable',
    });
  }

  const wait = Math.max(0, opts?.waitExtraSlots ?? 0);
  if (wait > 0) {
    const advanced = await waitForSlotAdvance(connection, wait);
    const later = await diffAnyTransaction(connection, cloneLegacyTx(tx), { payer });
    forks.push({
      id: 'plus2',
      label: `+${wait} slots (waited ${advanced.advanced})`,
      payerDeltaSol: payerDelta(later),
      err: later.err,
      note:
        advanced.advanced < wait
          ? `Only advanced ${advanced.advanced}/${wait} processed slots before timeout (start ${advanced.start} → ${advanced.end}). This is that bank, not a synthetic drift model.`
          : `Waited until processed slot ${advanced.end} (from ${advanced.start}), then simulateTransaction again on live state.`,
      method: 'simulated',
      slot: advanced.end,
      unitsConsumed: later.unitsConsumed,
    });
  } else {
    forks.push({
      id: 'plus2',
      label: '+2 slots',
      payerDeltaSol: null,
      note: 'Not run. Click “Wait 2 slots & re-sim” — we will poll getSlot(processed) then simulateTransaction. No arithmetic drift.',
      method: 'unavailable',
    });
  }

  const order: AdversarialForkId[] = ['now', 'plus2', 'sandwich', 'fail-closed'];
  return order.map((id) => forks.find((f) => f.id === id)!).filter(Boolean);
}

function replaceOrNote(tx: Transaction, from: PublicKey, to: PublicKey, payer: PublicKey): Transaction {
  const clone = cloneLegacyTx(tx);
  for (const ix of clone.instructions) {
    for (const k of ix.keys) {
      if (k.pubkey.equals(from)) k.pubkey = to;
    }
  }
  if (!clone.feePayer) clone.feePayer = payer;
  return clone;
}
