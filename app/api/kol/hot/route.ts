import { NextResponse } from 'next/server';
import { fetchKolRadar, getKolRadarBase } from '@/app/lib/kol/radar';

export const dynamic = 'force-dynamic';

async function dexFallback() {
  try {
    const res = await fetch('https://api.dexscreener.com/token-boosts/latest/v1', {
      headers: { Accept: 'application/json' },
    });
    const data = await res.json();
    const rows = Array.isArray(data) ? data : [];
    const tokens = rows
      .filter((t: any) => String(t.chainId || '').toLowerCase() === 'solana' && t.tokenAddress)
      .slice(0, 24)
      .map((t: any) => ({
        mint: t.tokenAddress,
        symbol: t.description?.slice?.(0, 24) || t.tokenAddress.slice(0, 6),
        heat: Number(t.totalAmount || t.amount || 0),
        bundle: 0,
        correlation: 0,
        prediction: 0,
        bias: 'neutral',
        confidence: 0.4,
        kol_buyers: 0,
        buyers: 0,
        source: 'dexscreener_boost',
      }));
    return tokens;
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const res = await fetchKolRadar('/api/hot');
    const data = await res.json();
    const tokens = data.tokens || [];
    if (res.ok && tokens.length) {
      return NextResponse.json({ ok: true, upstream: getKolRadarBase(), source: 'radar', ...data });
    }
    const fallback = await dexFallback();
    return NextResponse.json({
      ok: fallback.length > 0,
      upstream: getKolRadarBase(),
      source: fallback.length ? 'dexscreener_fallback' : 'empty',
      ts: Date.now() / 1000,
      tokens: fallback,
      error: data.error || (!res.ok ? `radar ${res.status}` : 'radar board empty'),
    });
  } catch (error) {
    const fallback = await dexFallback();
    return NextResponse.json(
      {
        ok: fallback.length > 0,
        upstream: getKolRadarBase(),
        source: fallback.length ? 'dexscreener_fallback' : 'down',
        ts: Date.now() / 1000,
        tokens: fallback,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: fallback.length ? 200 : 503 }
    );
  }
}
