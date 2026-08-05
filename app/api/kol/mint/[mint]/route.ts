import { NextRequest, NextResponse } from 'next/server';
import { fetchKolRadar, getKolRadarBase } from '@/app/lib/kol/radar';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { mint: string } }
) {
  try {
    const mint = encodeURIComponent(params.mint);
    const res = await fetchKolRadar(`/api/mint/${mint}`);
    const data = await res.json();
    return NextResponse.json({ ok: res.ok, upstream: getKolRadarBase(), ...data }, { status: res.ok ? 200 : res.status });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        upstream: getKolRadarBase(),
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}
