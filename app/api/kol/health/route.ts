import { NextResponse } from 'next/server';
import { fetchKolRadar, getKolRadarBase } from '@/app/lib/kol/radar';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetchKolRadar('/api/health');
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({
      ok: res.ok,
      upstream: getKolRadarBase(),
      ...data,
    }, { status: res.ok ? 200 : 503 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        upstream: getKolRadarBase(),
        error: error instanceof Error ? error.message : String(error),
        hint: 'Start local radar: cd ~/solana-kol-radar && ./start.sh all-local — or set KOL_RADAR_URL.',
      },
      { status: 503 }
    );
  }
}
