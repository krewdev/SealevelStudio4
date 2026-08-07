import { Transaction, VersionedTransaction } from '@solana/web3.js';

export type BuiltTxKind = 'none' | 'legacy' | 'versioned';

export function classifyBuiltTx(tx: unknown): BuiltTxKind {
  if (!tx) return 'none';
  if (tx instanceof Transaction) return 'legacy';
  if (tx instanceof VersionedTransaction) return 'versioned';
  if (typeof tx === 'object' && tx !== null && 'message' in tx && !('instructions' in (tx as object))) {
    return 'versioned';
  }
  if (typeof tx === 'object' && tx !== null && 'instructions' in (tx as object)) return 'legacy';
  return 'none';
}

export function isVersionedRpcTx(rpcTx: any): boolean {
  const msg = rpcTx?.transaction?.message;
  if (!msg) return false;
  if (Array.isArray(msg.staticAccountKeys)) return true;
  if (rpcTx?.meta?.loadedAddresses) return true;
  return false;
}

export function versionedLimitation(kind: BuiltTxKind): string | null {
  if (kind === 'none') return 'Build a transaction first.';
  if (kind === 'versioned') {
    return 'This built tx is versioned (Jupiter / atomic arb / ALT). Live adversarial forks and compiled prefix sims only run on legacy Transaction objects. Historical meta pre/post from a landed sig still work.';
  }
  return null;
}
