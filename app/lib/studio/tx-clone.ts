import { PublicKey, Transaction } from '@solana/web3.js';

export function cloneLegacyTx(tx: Transaction): Transaction {
  return Transaction.from(
    tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    })
  );
}

export function replaceAccountInTx(tx: Transaction, from: PublicKey, to: PublicKey): Transaction {
  const clone = cloneLegacyTx(tx);
  for (const ix of clone.instructions) {
    for (const k of ix.keys) {
      if (k.pubkey.equals(from)) k.pubkey = to;
    }
  }
  return clone;
}

export function serializeUnsigned(tx: Transaction): string {
  return tx
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString('base64');
}

export function serializeSigned(tx: Transaction): string {
  return tx.serialize().toString('base64');
}
