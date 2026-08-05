import { NextResponse } from 'next/server';
import { fetchKolRadar, getKolRadarBase } from '@/app/lib/kol/radar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetchKolRadar('/api/hot');
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json({ ok: false, upstream: getKolRadarBase(), ...data }, { status: res.status });
    }
    return NextResponse.json({ ok: true, upstream: getKolRadarBase(), ...data });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        upstream: getKolRadarBase(),
        error: error instanceof Error ? error.message : String(error),
        tokens: [],
      },
      { status: 503 }
    );
  }
}
