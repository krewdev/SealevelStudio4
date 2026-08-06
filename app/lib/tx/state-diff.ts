import {
  Connection,
  PublicKey,
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
};

export type StateDiffResult = {
  diffs: AccountDiffRow[];
  unitsConsumed?: number;
  err?: string;
  logs: string[];
};

function collectStaticKeys(tx: VersionedTransaction, limit = 24): string[] {
  try {
    const keys = tx.message.staticAccountKeys || [];
    const out: string[] = [];
    for (let i = 0; i < keys.length && out.length < limit; i++) {
      out.push(keys[i]!.toBase58());
    }
    return out;
  } catch {
    return [];
  }
}

export async function diffVersionedTransaction(
  connection: Connection,
  tx: VersionedTransaction
): Promise<StateDiffResult> {
  const addresses = collectStaticKeys(tx, 20);
  const beforeInfos = addresses.length
    ? await connection.getMultipleAccountsInfo(addresses.map((a) => new PublicKey(a)))
    : [];

  let sim: { value: SimulatedTransactionResponse };
  try {
    sim = await connection.simulateTransaction(tx, {
      sigVerify: false,
      replaceRecentBlockhash: true,
      accounts: addresses.length
        ? { encoding: 'base64', addresses }
        : undefined,
    } as any);
  } catch (err) {
    return {
      diffs: [],
      err: err instanceof Error ? err.message : String(err),
      logs: [],
    };
  }

  const afterAccounts = (sim.value as any).accounts as
    | { lamports: number; data?: unknown[]; owner?: string }[]
    | null
    | undefined;

  const diffs: AccountDiffRow[] = [];
  for (let i = 0; i < addresses.length; i++) {
    const before = beforeInfos[i];
    const after = afterAccounts?.[i];
    const lamportsBefore = before?.lamports ?? 0;
    const lamportsAfter = after?.lamports ?? lamportsBefore;
    const dataLenBefore = before?.data?.length ?? 0;
    let dataLenAfter = dataLenBefore;
    if (after?.data) {
      if (Array.isArray(after.data) && typeof after.data[0] === 'string') {
        try {
          dataLenAfter = Buffer.from(after.data[0], 'base64').length;
        } catch {
          dataLenAfter = dataLenBefore;
        }
      }
    }
    const ownerBefore = before?.owner?.toBase58();
    const ownerAfter = after?.owner || ownerBefore;
    if (lamportsBefore === lamportsAfter && dataLenBefore === dataLenAfter && ownerBefore === ownerAfter) {
      continue;
    }
    diffs.push({
      address: addresses[i]!,
      lamportsBefore,
      lamportsAfter,
      deltaLamports: lamportsAfter - lamportsBefore,
      dataLenBefore,
      dataLenAfter,
      ownerBefore,
      ownerAfter,
    });
  }

  diffs.sort((a, b) => Math.abs(b.deltaLamports) - Math.abs(a.deltaLamports));

  return {
    diffs: diffs.slice(0, 12),
    unitsConsumed: sim.value.unitsConsumed,
    err: sim.value.err ? JSON.stringify(sim.value.err) : undefined,
    logs: sim.value.logs || [],
  };
}

export function formatLamportsDelta(delta: number): string {
  const sol = delta / 1e9;
  const sign = sol > 0 ? '+' : '';
  return `${sign}${sol.toFixed(6)} SOL`;
}
