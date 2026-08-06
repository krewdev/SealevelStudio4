import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import type { WalletSender } from '../bots/live-swap';

export const PUMP_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

export function bondingCurvePda(mint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    PUMP_PROGRAM_ID
  )[0];
}

export async function isOnPumpBondingCurve(connection: Connection, mint: PublicKey): Promise<boolean> {
  const info = await connection.getAccountInfo(bondingCurvePda(mint), 'confirmed');
  return !!info && info.data.length > 0;
}

function decodeTx(bytes: Uint8Array): VersionedTransaction | Transaction {
  try {
    return VersionedTransaction.deserialize(bytes);
  } catch {
    return Transaction.from(bytes);
  }
}

/**
 * Build + send a pump.fun bonding-curve buy.
 * Uses pumpportal trade-local to assemble the unsigned tx (wallet still signs).
 */
export async function executePumpCurveBuy(params: {
  connection: Connection;
  publicKey: PublicKey;
  sendTransaction: WalletSender | ((tx: any, connection: Connection, opts?: any) => Promise<string>);
  mint: string;
  solAmount: number;
  slippagePercent?: number;
}): Promise<{ signature: string; venue: 'pump-curve' }> {
  const mint = new PublicKey(params.mint);
  const onCurve = await isOnPumpBondingCurve(params.connection, mint);
  if (!onCurve) {
    throw new Error('Mint is not on an active pump.fun bonding curve');
  }

  const res = await fetch('https://pumpportal.fun/api/trade-local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      publicKey: params.publicKey.toBase58(),
      action: 'buy',
      mint: mint.toBase58(),
      denominatedInSol: 'true',
      amount: params.solAmount,
      slippage: params.slippagePercent ?? 15,
      priorityFee: 0.0001,
      pool: 'pump',
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Pump curve buy build failed (${res.status}): ${text.slice(0, 240)}`);
  }

  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length < 32) {
    throw new Error('Pump curve buy returned an empty transaction');
  }
  const tx = decodeTx(buf);
  const signature = await params.sendTransaction(tx as any, params.connection, {
    skipPreflight: false,
    maxRetries: 2,
  });
  await params.connection.confirmTransaction(signature, 'confirmed');
  return { signature, venue: 'pump-curve' };
}
