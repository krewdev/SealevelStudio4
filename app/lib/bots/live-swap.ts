import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js';

export const WSOL_MINT = 'So11111111111111111111111111111111111111112';

export type WalletSender = (
  transaction: VersionedTransaction,
  connection: Connection,
  opts?: { skipPreflight?: boolean; maxRetries?: number }
) => Promise<string>;

function decodeTx(b64: string): VersionedTransaction {
  const binary = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return VersionedTransaction.deserialize(bytes);
}

export async function fetchJupiterQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}): Promise<any> {
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps ?? 75),
  });
  const res = await fetch(`/api/jupiter/quote?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok || data?.error) {
    throw new Error(data?.error || `Jupiter quote failed (${res.status})`);
  }
  if (!data?.outAmount) throw new Error('Jupiter quote returned no outAmount');
  return data;
}

export async function executeJupiterSwap(params: {
  connection: Connection;
  publicKey: PublicKey;
  sendTransaction: WalletSender;
  inputMint: string;
  outputMint: string;
  amountRaw: string;
  slippageBps?: number;
}): Promise<{ signature: string; inAmount: string; outAmount: string; price: number }> {
  const quote = await fetchJupiterQuote({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amountRaw,
    slippageBps: params.slippageBps,
  });

  const swapRes = await fetch('/api/jupiter/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: params.publicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
    }),
  });
  const swapJson = await swapRes.json();
  if (!swapRes.ok || !swapJson?.swapTransaction) {
    throw new Error(swapJson?.error || swapJson?.details || 'Jupiter swap build failed');
  }

  const tx = decodeTx(String(swapJson.swapTransaction));
  const signature = await params.sendTransaction(tx, params.connection, {
    skipPreflight: false,
    maxRetries: 2,
  });
  await params.connection.confirmTransaction(signature, 'confirmed');

  const inAmount = String(quote.inAmount || params.amountRaw);
  const outAmount = String(quote.outAmount || '0');
  const inN = Number(inAmount);
  const outN = Number(outAmount);
  const price = inN > 0 ? outN / inN : 0;

  return { signature, inAmount, outAmount, price };
}
