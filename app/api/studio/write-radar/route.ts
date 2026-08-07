import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { getSolanaRpcUrl } from '../../../lib/quicknode/rpc';

type SigRow = {
  signature: string;
  slot?: number;
  err?: unknown;
  blockTime?: number | null;
  confirmationStatus?: string | null;
};

async function signaturesProcessed(connection: Connection, address: string): Promise<SigRow[]> {
  const pk = new PublicKey(address);
  try {
    const raw = await (connection as unknown as { _rpcRequest: Function })._rpcRequest(
      'getSignaturesForAddress',
      [address, { limit: 12, commitment: 'processed' }]
    );
    const list = raw?.result || [];
    if (Array.isArray(list) && list.length) {
      return list.map((s: any) => ({
        signature: String(s.signature),
        slot: s.slot,
        err: s.err,
        blockTime: s.blockTime ?? null,
        confirmationStatus: s.confirmationStatus || 'processed',
      }));
    }
  } catch {
    /* fall back */
  }
  const confirmed = await connection.getSignaturesForAddress(pk, { limit: 12 });
  return confirmed.map((s) => ({
    signature: s.signature,
    slot: s.slot,
    err: s.err,
    blockTime: s.blockTime ?? null,
    confirmationStatus: s.confirmationStatus ?? 'confirmed',
  }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const addresses: string[] = Array.isArray(body.addresses) ? body.addresses.map(String).slice(0, 6) : [];
    if (!addresses.length) {
      return NextResponse.json({ ok: true, slot: null, sigsByAddress: {}, caveat: 'no addresses' });
    }

    const connection = new Connection(getSolanaRpcUrl('mainnet'), { commitment: 'processed' });
    const slot = await connection.getSlot('processed');
    const sigsByAddress: Record<string, SigRow[]> = {};

    await Promise.all(
      addresses.map(async (addr) => {
        try {
          const rows = await signaturesProcessed(connection, addr);
          const sigs = rows.map((r) => r.signature);
          if (sigs.length) {
            const statuses = await connection.getSignatureStatuses(sigs, {
              searchTransactionHistory: false,
            });
            statuses.value.forEach((st, i) => {
              if (!st || !rows[i]) return;
              rows[i]!.confirmationStatus = st.confirmationStatus || rows[i]!.confirmationStatus;
              rows[i]!.slot = st.slot || rows[i]!.slot;
              rows[i]!.err = st.err ?? rows[i]!.err;
            });
          }
          sigsByAddress[addr] = rows;
        } catch {
          sigsByAddress[addr] = [];
        }
      })
    );

    return NextResponse.json({
      ok: true,
      slot,
      sigsByAddress,
      caveat:
        'processed commitment + getSignatureStatuses. Not a private mempool — Jito/TPU shreds that never hit this RPC are invisible.',
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
