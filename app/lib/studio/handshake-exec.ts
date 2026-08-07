import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { TransactionBuilder } from '../transaction-builder';
import {
  deriveHandshakeStatus,
  type HandshakeOffer,
} from './handshake';
import { serializeSigned, serializeUnsigned } from './tx-clone';

export type HandshakeSigner = (tx: Transaction) => Promise<Transaction>;

async function fetchTipAccount(): Promise<string> {
  try {
    const res = await fetch('/api/studio/jito', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'tipAccounts' }),
    });
    const json = await res.json();
    if (json.ok && json.accounts?.[0]) return String(json.accounts[0]);
  } catch {
    /* fall through */
  }
  return '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZ8Nonsp8qrdNiy';
}

/**
 * Build both legs against one blockhash. Tip is appended to party B only.
 * Platform fee is skipped so the deal is exactly the two drafts + tip.
 */
export async function prepareHandshakeBundle(
  connection: Connection,
  offer: HandshakeOffer
): Promise<HandshakeOffer> {
  if (!offer.partyA.address) throw new Error('Party A address missing');
  if (!offer.partyB?.address) throw new Error('Party B address missing — attach counterparty first');
  if (!offer.partyA.instructions.length) throw new Error('Party A has no instructions');
  if (!offer.partyB.instructions.length) throw new Error('Party B has no instructions');

  const payerA = new PublicKey(offer.partyA.address);
  const payerB = new PublicKey(offer.partyB.address);
  const tipAccount = offer.tipAccount || (await fetchTipAccount());
  const tipPk = new PublicKey(tipAccount);

  const builder = new TransactionBuilder(connection);
  const txA = await builder.buildTransaction(
    { instructions: offer.partyA.instructions, memo: `hs ${offer.id} A` },
    { skipUnsupported: true }
  );
  const txB = await builder.buildTransaction(
    { instructions: offer.partyB.instructions, memo: `hs ${offer.id} B` },
    { skipUnsupported: true }
  );
  if (!txA.instructions.length) throw new Error('Party A draft produced no buildable instructions');
  if (!txB.instructions.length) throw new Error('Party B draft produced no buildable instructions');

  txB.add(
    SystemProgram.transfer({
      fromPubkey: payerB,
      toPubkey: tipPk,
      lamports: Math.max(1_000, offer.tipLamports || 10_000),
    })
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  txA.recentBlockhash = blockhash;
  txA.lastValidBlockHeight = lastValidBlockHeight;
  txA.feePayer = payerA;
  txB.recentBlockhash = blockhash;
  txB.lastValidBlockHeight = lastValidBlockHeight;
  txB.feePayer = payerB;

  const next: HandshakeOffer = {
    ...offer,
    v: 2,
    tipAccount,
    blockhash,
    lastValidBlockHeight,
    unsignedTxA: serializeUnsigned(txA),
    unsignedTxB: serializeUnsigned(txB),
    partyA: { ...offer.partyA, signedTxBase64: undefined },
    partyB: { ...offer.partyB, signedTxBase64: undefined },
    status: 'ready',
    submitError: undefined,
    bundleId: undefined,
    landedSignatures: undefined,
  };
  next.status = deriveHandshakeStatus(next);
  return next;
}

export async function signHandshakeLeg(
  offer: HandshakeOffer,
  which: 'A' | 'B',
  signerAddress: string,
  signTransaction: HandshakeSigner
): Promise<HandshakeOffer> {
  const unsigned = which === 'A' ? offer.unsignedTxA : offer.unsignedTxB;
  if (!unsigned) throw new Error('Prepare the bundle first (shared blockhash + tip on B).');

  const expected = which === 'A' ? offer.partyA.address : offer.partyB?.address;
  if (!expected || expected !== signerAddress) {
    throw new Error(
      `Active signer ${signerAddress.slice(0, 4)}… is not party ${which} (${(expected || 'unset').slice(0, 4)}…)`
    );
  }

  const tx = Transaction.from(Buffer.from(unsigned, 'base64'));
  if (!tx.feePayer || tx.feePayer.toBase58() !== signerAddress) {
    throw new Error('Deserialized fee payer mismatch — regenerate the handshake bundle.');
  }
  const signed = await signTransaction(tx);
  const signedB64 = serializeSigned(signed);

  const next: HandshakeOffer = {
    ...offer,
    partyA:
      which === 'A' ? { ...offer.partyA, signedTxBase64: signedB64 } : offer.partyA,
    partyB:
      which === 'B' && offer.partyB
        ? { ...offer.partyB, signedTxBase64: signedB64 }
        : offer.partyB,
  };
  next.status = deriveHandshakeStatus(next);
  return next;
}

export async function submitHandshakeBundle(offer: HandshakeOffer): Promise<HandshakeOffer> {
  const a = offer.partyA.signedTxBase64;
  const b = offer.partyB?.signedTxBase64;
  if (!a || !b) throw new Error('Both legs must be signed before submit');

  const res = await fetch('/api/studio/jito', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'sendBundle', txs: [a, b], wait: true }),
  });
  const json = await res.json();
  if (!json.ok) {
    return {
      ...offer,
      status: 'failed',
      submitError: json.error || `Jito HTTP ${res.status}`,
      bundleId: json.bundleId,
    };
  }

  const landed = json.status === 'landed' || json.slot;
  return {
    ...offer,
    status: landed ? 'landed' : json.status === 'failed' ? 'failed' : 'submitted',
    bundleId: json.bundleId,
    landedSignatures: json.signatures || [],
    landedSlot: json.slot,
    submitError: landed ? undefined : json.status === 'pending' ? 'Bundle sent; not confirmed in wait window' : json.error,
  };
}
