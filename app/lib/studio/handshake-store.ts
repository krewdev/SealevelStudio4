import fs from 'fs';
import path from 'path';
import type { HandshakeOffer } from './handshake';

export const HANDSHAKE_TTL_MS = 2 * 60 * 60 * 1000;

export type HandshakeRoom = {
  id: string;
  offer: HandshakeOffer;
  expiresAt: number;
  updatedAt: number;
};

function newId(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let s = '';
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function dirCandidates(): string[] {
  return [
    path.join(process.cwd(), 'data', 'handshakes'),
    path.join('/tmp', 'sealevel-handshakes'),
  ];
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

let memory = new Map<string, HandshakeRoom>();

async function pgQuery(text: string, params: any[] = []) {
  const { getPool } = await import('../database/connection');
  const pool = getPool();
  if (!pool) return null;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS handshake_rooms (
      id TEXT PRIMARY KEY,
      offer JSONB NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL
    )
  `);
  return pool.query(text, params);
}

export async function createHandshakeRoom(offer: HandshakeOffer): Promise<HandshakeRoom> {
  const id = offer.roomId || newId();
  const now = Date.now();
  const room: HandshakeRoom = {
    id,
    offer: { ...offer, roomId: id, v: 2 },
    expiresAt: now + HANDSHAKE_TTL_MS,
    updatedAt: now,
  };
  await writeRoom(room);
  return room;
}

export async function readHandshakeRoom(id: string): Promise<HandshakeRoom | null> {
  const room = await loadRoom(id);
  if (!room) return null;
  if (Date.now() > room.expiresAt) {
    await deleteRoom(id);
    return null;
  }
  return room;
}

export async function updateHandshakeRoom(id: string, offer: HandshakeOffer): Promise<HandshakeRoom | null> {
  const existing = await readHandshakeRoom(id);
  if (!existing) return null;
  const room: HandshakeRoom = {
    id,
    offer: { ...offer, roomId: id },
    expiresAt: existing.expiresAt,
    updatedAt: Date.now(),
  };
  await writeRoom(room);
  return room;
}

async function writeRoom(room: HandshakeRoom) {
  memory.set(room.id, room);
  try {
    await pgQuery(
      `INSERT INTO handshake_rooms (id, offer, expires_at, updated_at)
       VALUES ($1, $2::jsonb, to_timestamp($3/1000.0), to_timestamp($4/1000.0))
       ON CONFLICT (id) DO UPDATE SET
         offer = EXCLUDED.offer,
         updated_at = EXCLUDED.updated_at`,
      [room.id, JSON.stringify(room.offer), room.expiresAt, room.updatedAt]
    );
  } catch {
    /* no db */
  }
  for (const dir of dirCandidates()) {
    try {
      ensureDir(dir);
      fs.writeFileSync(path.join(dir, `${room.id}.json`), JSON.stringify(room), 'utf8');
      break;
    } catch {
      continue;
    }
  }
}

async function loadRoom(id: string): Promise<HandshakeRoom | null> {
  try {
    const res = await pgQuery(
      `SELECT id, offer, (extract(epoch from expires_at)*1000)::bigint AS exp, (extract(epoch from updated_at)*1000)::bigint AS upd
       FROM handshake_rooms WHERE id = $1`,
      [id]
    );
    const row = res?.rows?.[0];
    if (row) {
      return {
        id: row.id,
        offer: row.offer,
        expiresAt: Number(row.exp),
        updatedAt: Number(row.upd),
      };
    }
  } catch {
    /* */
  }
  for (const dir of dirCandidates()) {
    try {
      const p = path.join(dir, `${id}.json`);
      if (fs.existsSync(p)) {
        return JSON.parse(fs.readFileSync(p, 'utf8')) as HandshakeRoom;
      }
    } catch {
      continue;
    }
  }
  return memory.get(id) || null;
}

async function deleteRoom(id: string) {
  memory.delete(id);
  try {
    await pgQuery(`DELETE FROM handshake_rooms WHERE id = $1`, [id]);
  } catch {
    /* */
  }
  for (const dir of dirCandidates()) {
    try {
      fs.unlinkSync(path.join(dir, `${id}.json`));
    } catch {
      /* */
    }
  }
}

export async function handshakeBlockhashStatus(
  currentBlockHeight: number,
  offer: { lastValidBlockHeight?: number; blockhash?: string }
): Promise<{ ok: boolean; stale: boolean; reason?: string }> {
  if (!offer.blockhash || offer.lastValidBlockHeight == null) {
    return { ok: false, stale: false, reason: 'Bundle not prepared yet.' };
  }
  if (currentBlockHeight > offer.lastValidBlockHeight) {
    return {
      ok: false,
      stale: true,
      reason: `Blockhash expired (chain height ${currentBlockHeight} > lastValid ${offer.lastValidBlockHeight}). Re-prepare.`,
    };
  }
  return { ok: true, stale: false };
}
