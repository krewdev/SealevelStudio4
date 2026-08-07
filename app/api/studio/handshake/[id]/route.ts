import { NextRequest, NextResponse } from 'next/server';
import {
  readHandshakeRoom,
  updateHandshakeRoom,
  handshakeBlockhashStatus,
} from '../../../../lib/studio/handshake-store';
import { Connection } from '@solana/web3.js';
import { getSolanaRpcUrl } from '../../../../lib/quicknode/rpc';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const room = await readHandshakeRoom(params.id);
    if (!room) {
      return NextResponse.json({ ok: false, error: 'Room not found or expired' }, { status: 410 });
    }
    let stale: { ok: boolean; stale: boolean; reason?: string } = {
      ok: false,
      stale: false,
      reason: 'not-prepared',
    };
    try {
      const connection = new Connection(getSolanaRpcUrl('mainnet'), 'confirmed');
      const height = await connection.getBlockHeight('confirmed');
      stale = await handshakeBlockhashStatus(height, room.offer);
    } catch {
      stale = { ok: false, stale: false, reason: 'Could not read chain height' };
    }
    return NextResponse.json({ ok: true, room, blockhash: stale });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    if (!body?.offer) {
      return NextResponse.json({ ok: false, error: 'offer required' }, { status: 400 });
    }
    const room = await updateHandshakeRoom(params.id, body.offer);
    if (!room) {
      return NextResponse.json({ ok: false, error: 'Room not found or expired' }, { status: 410 });
    }
    return NextResponse.json({ ok: true, room });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
