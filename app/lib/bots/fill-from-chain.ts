/**
 * Turn a confirmed signature into actual SOL / token deltas.
 * Live tape should show chain meta, not the Jupiter quote that was signed.
 */

import { Connection, PublicKey } from '@solana/web3.js';

export type TokenBalanceLike = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: {
    amount: string;
    decimals: number;
    uiAmount?: number | null;
  };
};

export type ParsedMetaLike = {
  err?: unknown;
  fee?: number;
  preBalances: number[];
  postBalances: number[];
  preTokenBalances?: TokenBalanceLike[] | null;
  postTokenBalances?: TokenBalanceLike[] | null;
};

export type ChainFill = {
  signature: string;
  solDelta: number;
  tokenDeltaRaw: bigint;
  tokenUi: number;
  decimals: number;
  feeLamports: number;
  err?: string;
};

export type FillAmounts = {
  sol: number;
  tokens: number;
  price: number;
  feeSol: number;
  settled: boolean;
};

function keyStr(k: { pubkey: PublicKey | string } | PublicKey | string): string {
  if (typeof k === 'string') return k;
  if ('pubkey' in k) {
    const pk = k.pubkey;
    return typeof pk === 'string' ? pk : pk.toBase58();
  }
  return k.toBase58();
}

function tokenRawAt(
  balances: TokenBalanceLike[] | null | undefined,
  payer: string,
  mint: string
): { raw: bigint; decimals: number } {
  if (!balances?.length) return { raw: BigInt(0), decimals: 0 };
  let raw = BigInt(0);
  let decimals = 0;
  for (const b of balances) {
    if (b.mint !== mint) continue;
    if (b.owner && b.owner !== payer) continue;
    if (!b.owner) continue;
    try {
      raw += BigInt(b.uiTokenAmount.amount || '0');
      decimals = b.uiTokenAmount.decimals ?? decimals;
    } catch {
      /* ignore */
    }
  }
  return { raw, decimals };
}

export function fillFromParsedMeta(
  meta: ParsedMetaLike,
  accountKeys: Array<{ pubkey: PublicKey | string } | PublicKey | string>,
  opts: { payer: string; mint?: string; signature?: string }
): ChainFill {
  const keys = accountKeys.map(keyStr);
  const payerIdx = keys.findIndex((k) => k === opts.payer);
  const pre = payerIdx >= 0 ? meta.preBalances[payerIdx] ?? 0 : 0;
  const post = payerIdx >= 0 ? meta.postBalances[payerIdx] ?? 0 : 0;
  const solDelta = (post - pre) / 1e9;

  let tokenDeltaRaw = BigInt(0);
  let decimals = 0;
  let tokenUi = 0;
  if (opts.mint) {
    const before = tokenRawAt(meta.preTokenBalances, opts.payer, opts.mint);
    const after = tokenRawAt(meta.postTokenBalances, opts.payer, opts.mint);
    tokenDeltaRaw = after.raw - before.raw;
    decimals = after.decimals || before.decimals;
    tokenUi = decimals ? Number(tokenDeltaRaw) / 10 ** decimals : 0;
  }

  return {
    signature: opts.signature || '',
    solDelta,
    tokenDeltaRaw,
    tokenUi,
    decimals,
    feeLamports: meta.fee ?? 0,
    err: meta.err ? JSON.stringify(meta.err) : undefined,
  };
}

export function amountsFromFill(
  fill: ChainFill,
  side: 'buy' | 'sell',
  fallback: { sol: number; tokens: number; price: number }
): FillAmounts {
  const solSpent = Math.abs(Math.min(0, fill.solDelta));
  const solGot = Math.max(0, fill.solDelta);
  const tokenAbs = fill.tokenDeltaRaw < BigInt(0) ? -fill.tokenDeltaRaw : fill.tokenDeltaRaw;
  const tokensN = tokenAbs > BigInt(Number.MAX_SAFE_INTEGER) ? fallback.tokens : Number(tokenAbs);
  const sol = side === 'buy' ? solSpent : solGot;

  if (fill.err || (sol === 0 && tokensN === 0)) {
    return { ...fallback, feeSol: fill.feeLamports / 1e9, settled: false };
  }

  const price = sol > 0 ? tokensN / sol : fallback.price;
  return {
    sol: sol || fallback.sol,
    tokens: tokensN || fallback.tokens,
    price: price || fallback.price,
    feeSol: fill.feeLamports / 1e9,
    settled: true,
  };
}

export async function parseFillFromChain(
  connection: Connection,
  signature: string,
  opts: { payer: string; mint?: string }
): Promise<ChainFill> {
  const tx = await connection.getParsedTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: 'confirmed',
  });
  if (!tx?.meta || !tx.transaction) {
    throw new Error(`Transaction ${signature.slice(0, 8)}… not found or missing meta`);
  }
  return fillFromParsedMeta(tx.meta, tx.transaction.message.accountKeys, {
    payer: opts.payer,
    mint: opts.mint,
    signature,
  });
}

export async function resolveFillAmounts(
  connection: Connection,
  signature: string,
  opts: {
    payer: string;
    mint: string;
    side: 'buy' | 'sell';
    fallback: { sol: number; tokens: number; price: number };
  }
): Promise<FillAmounts> {
  try {
    const fill = await parseFillFromChain(connection, signature, {
      payer: opts.payer,
      mint: opts.mint,
    });
    return amountsFromFill(fill, opts.side, opts.fallback);
  } catch {
    return { ...opts.fallback, feeSol: 0, settled: false };
  }
}
