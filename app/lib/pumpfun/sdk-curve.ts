/**
 * Official @pump-fun/pump-sdk bonding-curve buy/sell.
 * Wallet still signs — we only assemble instructions locally.
 */

import {
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import BN from 'bn.js';
import {
  OnlinePumpSdk,
  PUMP_PROGRAM_ID,
  PUMP_SDK,
  bondingCurvePda,
  getBuyTokenAmountFromSolAmount,
  getSellSolAmountFromTokenAmount,
} from '@pump-fun/pump-sdk';

export { PUMP_PROGRAM_ID, bondingCurvePda };

const NATIVE_SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const CU_LIMIT = 400_000;
const CU_PRICE = 50_000;

export type CurveVenue = 'pump-curve';

export type WalletTxSender = (
  tx: Transaction,
  connection: Connection,
  opts?: { skipPreflight?: boolean; maxRetries?: number }
) => Promise<string>;

export async function getMintTokenProgram(connection: Connection, mint: PublicKey): Promise<PublicKey> {
  const info = await connection.getAccountInfo(mint, 'confirmed');
  if (!info) return TOKEN_2022_PROGRAM_ID;
  if (info.owner.equals(TOKEN_2022_PROGRAM_ID)) return TOKEN_2022_PROGRAM_ID;
  if (info.owner.equals(TOKEN_PROGRAM_ID)) return TOKEN_PROGRAM_ID;
  return TOKEN_2022_PROGRAM_ID;
}

export async function isOnPumpBondingCurve(connection: Connection, mint: PublicKey): Promise<boolean> {
  const info = await connection.getAccountInfo(bondingCurvePda(mint), 'confirmed');
  if (!info || info.data.length === 0) return false;
  try {
    const curve = PUMP_SDK.decodeBondingCurve(info);
    return !curve.complete;
  } catch {
    return true;
  }
}

async function sendIxs(params: {
  connection: Connection;
  publicKey: PublicKey;
  sendTransaction: WalletTxSender;
  ixs: TransactionInstruction[];
}): Promise<string> {
  const { blockhash, lastValidBlockHeight } = await params.connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({ feePayer: params.publicKey, recentBlockhash: blockhash });
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: CU_LIMIT }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: CU_PRICE }),
    ...params.ixs
  );
  const signature = await params.sendTransaction(tx, params.connection, {
    skipPreflight: false,
    maxRetries: 2,
  });
  await params.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  return signature;
}

export async function buildPumpCurveBuyIxs(params: {
  connection: Connection;
  mint: PublicKey;
  user: PublicKey;
  solAmount: number;
  slippagePercent?: number;
}): Promise<{ ixs: TransactionInstruction[]; tokenAmount: BN; solLamports: BN }> {
  const online = new OnlinePumpSdk(params.connection);
  const global = await online.fetchGlobal();
  let feeConfig = null;
  try {
    feeConfig = await online.fetchFeeConfig();
  } catch {
    feeConfig = null;
  }
  const tokenProgram = await getMintTokenProgram(params.connection, params.mint);
  const { bondingCurveAccountInfo, bondingCurve, associatedUserAccountInfo } = await online.fetchBuyState(
    params.mint,
    params.user,
    tokenProgram
  );
  if (bondingCurve.complete) {
    throw new Error('Bonding curve is graduated — use Jupiter instead of pump curve');
  }
  const solLamports = new BN(Math.round(params.solAmount * 1e9));
  const quoteMint = bondingCurve.quoteMint ?? NATIVE_SOL_MINT;
  const tokenAmount = getBuyTokenAmountFromSolAmount({
    global,
    feeConfig,
    mintSupply: bondingCurve.tokenTotalSupply,
    bondingCurve,
    amount: solLamports,
    quoteMint,
  });
  const ixs = await PUMP_SDK.buyInstructions({
    global,
    bondingCurveAccountInfo,
    bondingCurve,
    associatedUserAccountInfo,
    mint: params.mint,
    user: params.user,
    amount: tokenAmount,
    solAmount: solLamports,
    slippage: params.slippagePercent ?? 5,
    tokenProgram,
  });
  return { ixs, tokenAmount, solLamports };
}

export async function buildPumpCurveSellIxs(params: {
  connection: Connection;
  mint: PublicKey;
  user: PublicKey;
  tokenAmountRaw: bigint | number | string;
  slippagePercent?: number;
}): Promise<{ ixs: TransactionInstruction[]; solLamports: BN; tokenAmount: BN }> {
  const online = new OnlinePumpSdk(params.connection);
  const global = await online.fetchGlobal();
  let feeConfig = null;
  try {
    feeConfig = await online.fetchFeeConfig();
  } catch {
    feeConfig = null;
  }
  const tokenProgram = await getMintTokenProgram(params.connection, params.mint);
  const { bondingCurveAccountInfo, bondingCurve } = await online.fetchSellState(
    params.mint,
    params.user,
    tokenProgram
  );
  if (bondingCurve.complete) {
    throw new Error('Bonding curve is graduated — use Jupiter instead of pump curve');
  }
  const tokenAmount = new BN(params.tokenAmountRaw.toString());
  const solLamports = getSellSolAmountFromTokenAmount({
    global,
    feeConfig,
    mintSupply: bondingCurve.tokenTotalSupply,
    bondingCurve,
    amount: tokenAmount,
  });
  const ixs = await PUMP_SDK.sellInstructions({
    global,
    bondingCurveAccountInfo,
    bondingCurve,
    mint: params.mint,
    user: params.user,
    amount: tokenAmount,
    solAmount: solLamports,
    slippage: params.slippagePercent ?? 5,
    tokenProgram,
    mayhemMode: Boolean((bondingCurve as { isMayhemMode?: boolean }).isMayhemMode),
  });
  return { ixs, solLamports, tokenAmount };
}

export async function executePumpCurveBuy(params: {
  connection: Connection;
  publicKey: PublicKey;
  sendTransaction: WalletTxSender;
  mint: string;
  solAmount: number;
  slippagePercent?: number;
}): Promise<{ signature: string; venue: CurveVenue; tokenAmount: string; solLamports: string }> {
  const mint = new PublicKey(params.mint);
  if (!(await isOnPumpBondingCurve(params.connection, mint))) {
    throw new Error('Mint is not on an active pump.fun bonding curve');
  }
  const { ixs, tokenAmount, solLamports } = await buildPumpCurveBuyIxs({
    connection: params.connection,
    mint,
    user: params.publicKey,
    solAmount: params.solAmount,
    slippagePercent: params.slippagePercent,
  });
  const signature = await sendIxs({
    connection: params.connection,
    publicKey: params.publicKey,
    sendTransaction: params.sendTransaction,
    ixs,
  });
  return {
    signature,
    venue: 'pump-curve',
    tokenAmount: tokenAmount.toString(),
    solLamports: solLamports.toString(),
  };
}

export async function executePumpCurveSell(params: {
  connection: Connection;
  publicKey: PublicKey;
  sendTransaction: WalletTxSender;
  mint: string;
  tokenAmountRaw: bigint | number | string;
  slippagePercent?: number;
}): Promise<{ signature: string; venue: CurveVenue; solOut: number; tokenAmount: string }> {
  const mint = new PublicKey(params.mint);
  if (!(await isOnPumpBondingCurve(params.connection, mint))) {
    throw new Error('Mint is not on an active pump.fun bonding curve');
  }
  const { ixs, solLamports, tokenAmount } = await buildPumpCurveSellIxs({
    connection: params.connection,
    mint,
    user: params.publicKey,
    tokenAmountRaw: params.tokenAmountRaw,
    slippagePercent: params.slippagePercent,
  });
  const signature = await sendIxs({
    connection: params.connection,
    publicKey: params.publicKey,
    sendTransaction: params.sendTransaction,
    ixs,
  });
  return {
    signature,
    venue: 'pump-curve',
    solOut: Number(solLamports.toString()) / 1e9,
    tokenAmount: tokenAmount.toString(),
  };
}
