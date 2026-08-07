import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { getSolanaRpcUrl, redactRpc } from '@/app/lib/quicknode/rpc';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rpcUrl = getSolanaRpcUrl('mainnet');
  const started = Date.now();
  try {
    const connection = new Connection(rpcUrl, 'confirmed');
    const slot = await connection.getSlot('confirmed');
    const latencyMs = Date.now() - started;
    const provider = /quiknode\.pro/i.test(rpcUrl)
      ? 'quicknode'
      : /helius/i.test(rpcUrl)
        ? 'helius'
        : 'public';
    return NextResponse.json({
      ok: true,
      slot,
      latencyMs,
      provider,
      rpc: redactRpc(rpcUrl),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        latencyMs: Date.now() - started,
        rpc: redactRpc(rpcUrl),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
