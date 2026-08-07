import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  type SimulatedTransactionResponse,
} from '@solana/web3.js';

export type AccountDiffRow = {
  address: string;
  lamportsBefore: number;
  lamportsAfter: number;
  deltaLamports: number;
  dataLenBefore: number;
  dataLenAfter: number;
  ownerBefore?: string;
  ownerAfter?: string;
  tokenDelta?: string;
  tokenMint?: string;
  role?: string;
};

export type StateDiffResult = {
  diffs: AccountDiffRow[];
  unitsConsumed?: number;
  err?: string;
  logs: string[];
};

export function parseSplTokenMeta(data: Buffer | Uint8Array | undefined | null): {
  mint: string;
  amount: bigint;
} | null {
  if (!data || data.length < 72) return null;
  try {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const mint = new PublicKey(buf.subarray(0, 32)).toBase58();
    const amount = buf.readBigUInt64LE(64);
    return { mint, amount };
  } catch {
    return null;
  }
}

export function collectTxAddresses(tx: Transaction | VersionedTransaction, limit = 24): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (pk: PublicKey | string | undefined) => {
    if (!pk) return;
    const s = typeof pk === 'string' ? pk : pk.toBase58();
    if (seen.has(s) || out.length >= limit) return;
    seen.add(s);
    out.push(s);
  };

  try {
    if (tx instanceof VersionedTransaction || ('message' in tx && !('instructions' in (tx as Transaction)))) {
      const keys = (tx as VersionedTransaction).message.staticAccountKeys || [];
      for (const k of keys) push(k);
      return out;
    }
    const legacy = tx as Transaction;
    if (legacy.feePayer) push(legacy.feePayer);
    for (const ix of legacy.instructions || []) {
      push(ix.programId);
      for (const k of ix.keys || []) push(k.pubkey);
    }
  } catch {
    /* ignore */
  }
  return out;
}

function decodeSimAccountData(data: unknown): Buffer | undefined {
  if (!data) return undefined;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (Array.isArray(data) && typeof data[0] === 'string') {
    try {
      return Buffer.from(data[0], 'base64');
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export async function diffAnyTransaction(
  connection: Connection,
  tx: Transaction | VersionedTransaction,
  opts?: { payer?: string | null }
): Promise<StateDiffResult> {
  const addresses = collectTxAddresses(tx, 20);
  const beforeInfos = addresses.length
    ? await connection.getMultipleAccountsInfo(addresses.map((a) => new PublicKey(a)))
    : [];

  let sim: { value: SimulatedTransactionResponse };
  try {
    if (tx instanceof VersionedTransaction || ('message' in tx && !('instructions' in (tx as Transaction)))) {
      sim = await connection.simulateTransaction(tx as VersionedTransaction, {
        sigVerify: false,
        replaceRecentBlockhash: true,
        accounts: addresses.length ? { encoding: 'base64', addresses } : undefined,
      } as any);
    } else {
      const legacy = tx as Transaction;
      if (!legacy.recentBlockhash) {
        legacy.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
      }
      if (!legacy.feePayer && opts?.payer) {
        legacy.feePayer = new PublicKey(opts.payer);
      }
      sim = await connection.simulateTransaction(legacy, undefined, addresses.map((a) => new PublicKey(a)));
    }
  } catch (err) {
    return {
      diffs: [],
      err: err instanceof Error ? err.message : String(err),
      logs: [],
    };
  }

  const afterAccounts = (sim.value as any).accounts as
    | { lamports: number; data?: unknown; owner?: string }[]
    | null
    | undefined;

  const diffs: AccountDiffRow[] = [];
  for (let i = 0; i < addresses.length; i++) {
    const before = beforeInfos[i];
    const after = afterAccounts?.[i];
    const lamportsBefore = before?.lamports ?? 0;
    const lamportsAfter = after?.lamports ?? lamportsBefore;
    const dataLenBefore = before?.data?.length ?? 0;
    const afterData = decodeSimAccountData(after?.data);
    const dataLenAfter = afterData?.length ?? dataLenBefore;
    const ownerBefore = before?.owner?.toBase58();
    const ownerAfter = after?.owner || ownerBefore;

    const beforeTok = parseSplTokenMeta(before?.data);
    const afterTok = parseSplTokenMeta(afterData ?? before?.data);
    let tokenDelta: string | undefined;
    let tokenMint: string | undefined;
    if (beforeTok || afterTok) {
      const b = beforeTok?.amount ?? BigInt(0);
      const a = afterTok?.amount ?? b;
      if (a !== b) {
        tokenDelta = (a - b).toString();
        tokenMint = afterTok?.mint || beforeTok?.mint;
      }
    }

    if (
      lamportsBefore === lamportsAfter &&
      dataLenBefore === dataLenAfter &&
      ownerBefore === ownerAfter &&
      !tokenDelta
    ) {
      continue;
    }

    let role: string | undefined;
    if (opts?.payer && addresses[i] === opts.payer) role = 'payer';

    diffs.push({
      address: addresses[i]!,
      lamportsBefore,
      lamportsAfter,
      deltaLamports: lamportsAfter - lamportsBefore,
      dataLenBefore,
      dataLenAfter,
      ownerBefore,
      ownerAfter,
      tokenDelta,
      tokenMint,
      role,
    });
  }

  diffs.sort((a, b) => Math.abs(b.deltaLamports) - Math.abs(a.deltaLamports));

  return {
    diffs: diffs.slice(0, 16),
    unitsConsumed: sim.value.unitsConsumed,
    err: sim.value.err ? JSON.stringify(sim.value.err) : undefined,
    logs: sim.value.logs || [],
  };
}

/** @deprecated prefer diffAnyTransaction */
export async function diffVersionedTransaction(
  connection: Connection,
  tx: VersionedTransaction
): Promise<StateDiffResult> {
  return diffAnyTransaction(connection, tx);
}

export function formatLamportsDelta(delta: number): string {
  const sol = delta / 1e9;
  const sign = sol > 0 ? '+' : '';
  return `${sign}${sol.toFixed(6)} SOL`;
}

export function formatTokenDelta(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const n = BigInt(raw);
    const sign = n > BigInt(0) ? '+' : '';
    return `${sign}${n.toString()}`;
  } catch {
    return raw;
  }
}
