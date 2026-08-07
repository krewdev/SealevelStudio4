import type { Connection } from '@solana/web3.js';
import { importTransactionDetailed } from '../transaction-importer';
import { computeTxDna } from './tx-dna';
import { flattenToTimeTravelSteps, hydrateTimeTravelSnapshots, type TimeTravelStep } from './time-travel';
import { resolveFillAmounts, type FillAmounts } from '../bots/fill-from-chain';
import type { BuiltInstruction } from '../instructions/types';

export const LANDED_EVENT = 'sealevel-landed-sig';
export const LANDED_STORAGE_KEY = 'sealevel-last-landed';
export const STUDIO_TAB_EVENT = 'sealevel-studio-tab';

export type LandedSource = 'builder' | 'live' | 'handshake' | 'import';

export type LandedRecord = {
  signature: string;
  source: LandedSource;
  payer?: string | null;
  mint?: string | null;
  dnaLabel?: string;
  dnaHash?: string;
  instructionCount: number;
  at: number;
  fill?: FillAmounts;
};

export function readLastLanded(): LandedRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LANDED_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LandedRecord) : null;
  } catch {
    return null;
  }
}

export function publishLanded(record: LandedRecord) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANDED_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* quota */
  }
  window.dispatchEvent(new CustomEvent(LANDED_EVENT, { detail: record }));
}

/** Lightweight notice from live bot / handshake before full ingest. */
export function noticeLanded(partial: {
  signature: string;
  source: LandedSource;
  payer?: string | null;
  mint?: string | null;
}) {
  publishLanded({
    signature: partial.signature,
    source: partial.source,
    payer: partial.payer,
    mint: partial.mint,
    instructionCount: 0,
    at: Date.now(),
  });
}

export async function ingestLandedSignature(
  connection: Connection,
  opts: {
    signature: string;
    source: LandedSource;
    payer?: string | null;
    mint?: string | null;
    runLivePrefix?: boolean;
  }
): Promise<{ record: LandedRecord; instructions: BuiltInstruction[]; steps: TimeTravelStep[] }> {
  const { instructions, parsed } = await importTransactionDetailed(connection, opts.signature);
  let steps = flattenToTimeTravelSteps(parsed as any, opts.signature);
  try {
    steps = await hydrateTimeTravelSnapshots({
      connection,
      signature: opts.signature,
      steps,
      payer: opts.payer,
      runLivePrefix: Boolean(opts.runLivePrefix && opts.payer),
    });
  } catch {
    /* keep flat steps */
  }
  const dna = computeTxDna({ instructions });
  let fill: FillAmounts | undefined;
  if (opts.payer && opts.mint) {
    fill = await resolveFillAmounts(connection, opts.signature, {
      payer: opts.payer,
      mint: opts.mint,
      side: 'buy',
      fallback: { sol: 0, tokens: 0, price: 0 },
    });
  }
  const record: LandedRecord = {
    signature: opts.signature,
    source: opts.source,
    payer: opts.payer,
    mint: opts.mint,
    dnaLabel: dna.label,
    dnaHash: dna.hash,
    instructionCount: instructions.length,
    at: Date.now(),
    fill,
  };
  publishLanded(record);
  return { record, instructions, steps };
}

export function openStudioDebugTab() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(STUDIO_TAB_EVENT, { detail: 'debug' }));
}
