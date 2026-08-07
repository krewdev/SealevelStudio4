import { NextRequest, NextResponse } from 'next/server';
import {
  jitoGetBundleStatuses,
  jitoGetInflightStatuses,
  jitoGetTipAccounts,
  jitoSendBundle,
  waitForBundleLand,
} from '../../../lib/studio/jito-rpc';

/**
 * Server proxy for Jito Block Engine (avoids browser CORS).
 * POST { action, txs?, bundleId?, wait? }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = String(body.action || '');

    if (action === 'tipAccounts') {
      const accounts = await jitoGetTipAccounts();
      return NextResponse.json({ ok: true, accounts });
    }

    if (action === 'sendBundle') {
      const txs = Array.isArray(body.txs) ? body.txs.map(String) : [];
      const bundleId = await jitoSendBundle(txs);
      if (body.wait) {
        const landed = await waitForBundleLand(bundleId);
        return NextResponse.json({ ok: true, bundleId, ...landed });
      }
      return NextResponse.json({ ok: true, bundleId });
    }

    if (action === 'status') {
      const id = String(body.bundleId || '');
      if (!id) return NextResponse.json({ ok: false, error: 'bundleId required' }, { status: 400 });
      const [inflight, statuses] = await Promise.all([
        jitoGetInflightStatuses([id]).catch(() => []),
        jitoGetBundleStatuses([id]).catch(() => []),
      ]);
      return NextResponse.json({ ok: true, inflight: inflight[0] || null, status: statuses[0] || null });
    }

    if (action === 'wait') {
      const id = String(body.bundleId || '');
      if (!id) return NextResponse.json({ ok: false, error: 'bundleId required' }, { status: 400 });
      const landed = await waitForBundleLand(id, Number(body.timeoutMs) || 18_000);
      return NextResponse.json({ ok: true, bundleId: id, ...landed });
    }

    return NextResponse.json({ ok: false, error: `Unknown action ${action}` }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
