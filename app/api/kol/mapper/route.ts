import { NextRequest, NextResponse } from 'next/server';
import { fetchKolRadar, getKolRadarBase } from '@/app/lib/kol/radar';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const src = request.nextUrl.searchParams;
    const qs = new URLSearchParams();
    for (const key of ['seed', 'hops', 'live', 'sigs', 'max_wallets', 'min_sol']) {
      const v = src.get(key);
      if (v != null && v !== '') qs.set(key, v);
    }
    const path = `/api/mapper${qs.toString() ? `?${qs}` : ''}`;
    const res = await fetchKolRadar(path);
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(
      { ok: res.ok, upstream: getKolRadarBase(), ...data },
      { status: res.ok ? 200 : res.status >= 400 ? res.status : 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        upstream: getKolRadarBase(),
        error: error instanceof Error ? error.message : String(error),
        nodes: [],
        edges: [],
      },
      { status: 503 }
    );
  }
}
