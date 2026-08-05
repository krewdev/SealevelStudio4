export function getKolRadarBase(): string {
  return (process.env.KOL_RADAR_URL || 'http://127.0.0.1:8088').replace(/\/$/, '');
}

export async function fetchKolRadar(path: string, init?: RequestInit): Promise<Response> {
  const url = `${getKolRadarBase()}${path.startsWith('/') ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    cache: 'no-store',
    signal: init?.signal,
  });
}
