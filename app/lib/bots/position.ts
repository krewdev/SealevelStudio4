import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, getMint } from '@solana/spl-token';
import type { PaperTrade } from './trade-store';

export type OnchainPosition = {
  mint: string;
  sol: number;
  tokenUi: number;
  tokenRaw: bigint;
  decimals: number;
};

export async function fetchOnchainPosition(
  connection: Connection,
  owner: PublicKey,
  mintStr: string
): Promise<OnchainPosition> {
  const mint = new PublicKey(mintStr);
  const sol = (await connection.getBalance(owner, 'confirmed')) / LAMPORTS_PER_SOL;
  let decimals = 6;
  let tokenRaw = BigInt(0);
  try {
    const mintAcc = await getMint(connection, mint);
    decimals = mintAcc.decimals;
    const ata = await getAssociatedTokenAddress(mint, owner);
    const acc = await getAccount(connection, ata);
    tokenRaw = BigInt(acc.amount.toString());
  } catch {
    tokenRaw = BigInt(0);
  }
  const tokenUi = Number(tokenRaw) / Math.pow(10, decimals);
  return { mint: mintStr, sol, tokenUi, tokenRaw, decimals };
}

export function pnlFromTrades(trades: PaperTrade[]): { realizedSol: number; liveTrades: number; paperTrades: number } {
  let realized = 0;
  let liveTrades = 0;
  let paperTrades = 0;
  for (const t of trades) {
    if (t.error) continue;
    if (t.side === 'buy') realized -= t.sol;
    else realized += t.sol;
    if (t.live) liveTrades += 1;
    else paperTrades += 1;
  }
  return { realizedSol: realized, liveTrades, paperTrades };
}
