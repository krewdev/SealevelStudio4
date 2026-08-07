import { NextRequest, NextResponse } from 'next/server';
import { createHandshakeRoom } from '../../../lib/studio/handshake-store';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.offer?.partyA) {
      return NextResponse.json({ ok: false, error: 'offer.partyA required' }, { status: 400 });
    }
    const room = await createHandshakeRoom(body.offer);
    return NextResponse.json({
      ok: true,
      id: room.id,
      expiresAt: room.expiresAt,
      path: `/h/${room.id}`,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
