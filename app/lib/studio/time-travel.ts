import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import bs58 from 'bs58';
import type { BuiltInstruction } from '../instructions/types';
import { getTemplateById } from '../instructions/templates';
import { mapParsedIxToBuilt, type ParsedMessageLike } from '../transaction-importer';
import { diffAnyTransaction, type StateDiffResult } from '../tx/state-diff';
import { isVersionedRpcTx } from './tx-kind';

export type AccountSnapshot = {
  address: string;
  lamports: number;
  owner?: string;
  tokenAmount?: string;
  tokenMint?: string;
};

export type StepSnapshot = {
  source: 'meta-pre' | 'meta-post' | 'live-prefix-sim';
  slot?: number;
  accounts: AccountSnapshot[];
  note: string;
  err?: string;
};

export type TimeTravelStep = {
  index: number;
  outerIndex: number;
  inner: boolean;
  programId: string;
  name: string;
  accounts: string[];
  built: BuiltInstruction | null;
  historical?: StepSnapshot;
  livePrefix?: StepSnapshot;
};

export type ParsedTxLike = {
  transaction: { message: ParsedMessageLike & { instructions: any[] } };
  meta?: {
    innerInstructions?: Array<{ index: number; instructions: any[] }>;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: Array<{ accountIndex: number; mint: string; uiTokenAmount: { amount: string } }>;
    postTokenBalances?: Array<{ accountIndex: number; mint: string; uiTokenAmount: { amount: string } }>;
    slot?: number;
  };
  slot?: number;
};

function pk(v: any): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  if (typeof v.toBase58 === 'function') return v.toBase58();
  if (v.pubkey) return pk(v.pubkey);
  return String(v);
}

export function flattenToTimeTravelSteps(tx: ParsedTxLike, signature = 'imported'): TimeTravelStep[] {
  const message = tx.transaction.message;
  const outers = message.instructions || [];
  const inners = tx.meta?.innerInstructions || [];
  const steps: TimeTravelStep[] = [];
  let n = 0;

  outers.forEach((ix: any, outerIndex: number) => {
    const built = mapParsedIxToBuilt(ix, signature, message.accountKeys || []);
    steps.push({
      index: n++,
      outerIndex,
      inner: false,
      programId: pk(ix.programId),
      name: built?.template.name || ix.program || 'Instruction',
      accounts: built ? Object.values(built.accounts).filter(Boolean) : (ix.accounts || []).map(pk),
      built,
    });
    const group = inners.find((g) => g.index === outerIndex);
    for (const inner of group?.instructions || []) {
      const b = mapParsedIxToBuilt(inner, signature, message.accountKeys || []);
      steps.push({
        index: n++,
        outerIndex,
        inner: true,
        programId: pk(inner.programId),
        name: `↳ ${b?.template.name || inner.program || 'CPI'}`,
        accounts: b ? Object.values(b.accounts).filter(Boolean) : (inner.accounts || []).map(pk),
        built: b,
      });
    }
  });

  return steps;
}

export function snapshotsFromMeta(
  keys: string[],
  balances: number[] | undefined,
  tokenBalances:
    | Array<{ accountIndex: number; mint: string; uiTokenAmount: { amount: string } }>
    | undefined
): AccountSnapshot[] {
  if (!keys.length || !balances?.length) return [];
  const tokens = new Map<number, { mint: string; amount: string }>();
  for (const t of tokenBalances || []) {
    tokens.set(t.accountIndex, { mint: t.mint, amount: t.uiTokenAmount.amount });
  }
  return keys.slice(0, Math.min(keys.length, balances.length, 24)).map((address, i) => {
    const tok = tokens.get(i);
    return {
      address,
      lamports: balances[i] ?? 0,
      tokenMint: tok?.mint,
      tokenAmount: tok?.amount,
    };
  });
}

export function headerBits(
  index: number,
  keyCount: number,
  header: {
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
  }
): { isSigner: boolean; isWritable: boolean } {
  const isSigner = index < header.numRequiredSignatures;
  if (isSigner) {
    return {
      isSigner: true,
      isWritable: index < header.numRequiredSignatures - header.numReadonlySignedAccounts,
    };
  }
  const unsigned = keyCount - header.numRequiredSignatures;
  const writableUnsigned = unsigned - header.numReadonlyUnsignedAccounts;
  return {
    isSigner: false,
    isWritable: index - header.numRequiredSignatures < writableUnsigned,
  };
}

export function transactionFromCompiledPrefix(opts: {
  keys: string[];
  header: {
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
  };
  instructions: Array<{ programIdIndex: number; accounts: number[]; data: string }>;
  endExclusive: number;
  payer: string;
  blockhash: string;
}): Transaction {
  const tx = new Transaction();
  const slice = opts.instructions.slice(0, Math.max(0, opts.endExclusive));
  for (const ix of slice) {
    const programId = new PublicKey(opts.keys[ix.programIdIndex]!);
    const keys = ix.accounts.map((idx) => {
      const bits = headerBits(idx, opts.keys.length, opts.header);
      return { pubkey: new PublicKey(opts.keys[idx]!), ...bits };
    });
    tx.add(
      new TransactionInstruction({
        programId,
        keys,
        data: Buffer.from(bs58.decode(ix.data)),
      })
    );
  }
  tx.feePayer = new PublicKey(opts.payer);
  tx.recentBlockhash = opts.blockhash;
  return tx;
}

export function collectRpcAccountKeys(rpcTx: any): string[] {
  const msg = rpcTx.transaction?.message;
  if (!msg) return [];
  if (Array.isArray(msg.staticAccountKeys)) {
    const staticKeys = msg.staticAccountKeys.map((k: any) => pk(k));
    const loaded = rpcTx.meta?.loadedAddresses || {};
    const w = (loaded.writable || []).map((k: any) => pk(k));
    const r = (loaded.readonly || []).map((k: any) => pk(k));
    return [...staticKeys, ...w, ...r];
  }
  return (msg.accountKeys || []).map((k: any) => pk(k));
}

/**
 * Attach true historical meta snapshots (pre at first outer, post at last outer).
 * Inner CPIs cannot have unique historical banks — Solana meta is tx-granular only.
 * Optional live prefix sims are current-bank reconstructions, labeled as such.
 */
export async function hydrateTimeTravelSnapshots(opts: {
  connection: Connection;
  signature: string;
  steps: TimeTravelStep[];
  payer?: string | null;
  runLivePrefix?: boolean;
}): Promise<TimeTravelStep[]> {
  const rpcTx = await opts.connection.getTransaction(opts.signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });
  if (!rpcTx?.meta) return opts.steps;

  const versioned = isVersionedRpcTx(rpcTx);
  const keys = collectRpcAccountKeys(rpcTx);
  const slot = rpcTx.slot;
  const pre = snapshotsFromMeta(keys, rpcTx.meta.preBalances, rpcTx.meta.preTokenBalances as any);
  const post = snapshotsFromMeta(keys, rpcTx.meta.postBalances, rpcTx.meta.postTokenBalances as any);
  const lastOuter = Math.max(0, ...opts.steps.filter((s) => !s.inner).map((s) => s.outerIndex));

  const msg = rpcTx.transaction.message as any;
  const compiled: Array<{ programIdIndex: number; accounts: number[]; data: string }> =
    msg.compiledInstructions?.map((ix: any) => ({
      programIdIndex: ix.programIdIndex,
      accounts: Array.from(ix.accountKeyIndexes || ix.accounts || []),
      data: typeof ix.data === 'string' ? ix.data : bs58.encode(Buffer.from(ix.data || [])),
    })) ||
    (msg.instructions || []).map((ix: any) => ({
      programIdIndex: ix.programIdIndex,
      accounts: ix.accounts,
      data: ix.data,
    }));
  const header = msg.header || {
    numRequiredSignatures: 1,
    numReadonlySignedAccounts: 0,
    numReadonlyUnsignedAccounts: 0,
  };

  const steps = opts.steps.map((s) => ({ ...s }));
  let liveBlockhash: string | null = null;
  if (opts.runLivePrefix && compiled.length && opts.payer && !versioned) {
    liveBlockhash = (await opts.connection.getLatestBlockhash('confirmed')).blockhash;
  }

  for (const step of steps) {
    if (!step.inner && step.outerIndex === 0) {
      step.historical = {
        source: 'meta-pre',
        slot,
        accounts: pre,
        note: 'Landed meta.preBalances / preTokenBalances — bank immediately before this signature.',
      };
    }
    if (!step.inner && step.outerIndex === lastOuter) {
      step.historical = {
        source: 'meta-post',
        slot,
        accounts: post,
        note: 'Landed meta.postBalances / postTokenBalances — bank immediately after this signature. No mid-tx historical banks exist in RPC meta.',
      };
    }
    if (versioned && !step.inner) {
      step.livePrefix = {
        source: 'live-prefix-sim',
        accounts: [],
        note: 'Versioned/ALT transaction: compiled prefix sim is disabled. Historical meta pre/post below are still from the landed signature.',
      };
    }
    if (step.inner) {
      step.historical = {
        source: step.outerIndex === lastOuter ? 'meta-post' : 'meta-pre',
        slot,
        accounts: step.outerIndex === lastOuter ? post : pre,
        note: `Inner CPI has no unique snapshot. Solana only records pre/post for the whole tx. Showing ${
          step.outerIndex === lastOuter ? 'post' : 'pre'
        }-tx meta (enclosing outer #${step.outerIndex}).`,
      };
    }

    if (liveBlockhash && opts.payer && !step.inner && compiled.length) {
      try {
        const prefix = transactionFromCompiledPrefix({
          keys,
          header,
          instructions: compiled,
          endExclusive: step.outerIndex + 1,
          payer: opts.payer,
          blockhash: liveBlockhash,
        });
        const sim = await diffAnyTransaction(opts.connection, prefix, { payer: opts.payer });
        step.livePrefix = {
          source: 'live-prefix-sim',
          accounts: sim.diffs.map((d) => ({
            address: d.address,
            lamports: d.lamportsAfter,
            owner: d.ownerAfter,
            tokenAmount: d.tokenDelta,
            tokenMint: d.tokenMint,
          })),
          err: sim.err,
          note: `simulateTransaction of compiled outers 0..${step.outerIndex} on the CURRENT bank (not slot ${slot}). Historical mid-tx state is not replayable via public RPC.`,
        };
      } catch (err) {
        step.livePrefix = {
          source: 'live-prefix-sim',
          accounts: [],
          err: err instanceof Error ? err.message : String(err),
          note: 'Live prefix rebuild failed (likely versioned/ALT). Historical mid-CPI still unavailable.',
        };
      }
    }
  }

  return steps;
}

/** Remaining outer instructions from this step onward, as builder cards. */
export function forkDraftFromStep(steps: TimeTravelStep[], fromIndex: number): BuiltInstruction[] {
  const start = Math.max(0, fromIndex);
  const custom = getTemplateById('custom_instruction');
  return steps
    .slice(start)
    .filter((s) => !s.inner)
    .map((s) => {
      if (s.built) return s.built;
      const accounts: Record<string, string> = {};
      const accDefs =
        custom?.accounts.slice() ||
        s.accounts.map((addr, i) => {
          const name = `Account ${i + 1}`;
          accounts[name] = addr;
          return { name, type: 'writable' as const, description: name };
        });
      s.accounts.forEach((addr, i) => {
        accounts[`Account ${i + 1}`] = addr;
      });
      return {
        template: {
          ...(custom || {
            id: 'custom_instruction',
            programId: s.programId,
            name: s.name,
            description: 'Forked',
            category: 'custom' as const,
            accounts: accDefs,
            args: [],
          }),
          programId: s.programId || custom?.programId || '',
          name: s.name,
        },
        accounts,
        args: {},
      };
    });
}

export function snapshotAtStep(steps: TimeTravelStep[], fromIndex: number): StepSnapshot | null {
  const start = Math.max(0, fromIndex);
  for (let i = start; i >= 0; i--) {
    const s = steps[i];
    if (s?.historical) return s.historical;
  }
  return steps[0]?.historical || null;
}

export async function resimTailDraft(
  connection: Connection,
  remaining: BuiltInstruction[],
  payer: string
): Promise<StateDiffResult> {
  const { TransactionBuilder } = await import('../transaction-builder');
  const builder = new TransactionBuilder(connection);
  const tx = await builder.buildTransaction({ instructions: remaining }, { skipUnsupported: true });
  if (!tx.instructions.length) {
    return { diffs: [], err: 'Fork produced no buildable instructions', logs: [] };
  }
  await builder.prepareTransaction(tx, new PublicKey(payer));
  return diffAnyTransaction(connection, tx, { payer });
}
