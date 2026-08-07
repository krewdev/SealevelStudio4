/** Shared helpers for HTTP DEX pool ingestion. */

export function toRawAmount(amount: number, decimals: number): bigint {
  if (!Number.isFinite(amount) || amount <= 0) return BigInt(0);
  const d = Math.max(0, Math.min(12, decimals | 0));
  const [whole, frac = ''] = amount.toFixed(Math.min(d, 8)).split('.');
  const fracPadded = (frac + '0'.repeat(d)).slice(0, d);
  const digits = `${whole.replace(/^(-?)0+(?=\d)/, '$1')}${fracPadded}`.replace(/^-/, '');
  try {
    const value = BigInt(digits || '0');
    return amount < 0 ? -value : value;
  } catch {
    return BigInt(0);
  }
}

export function feeToBps(feeRate: number | undefined, fallback = 30): number {
  if (!Number.isFinite(feeRate as number)) return fallback;
  // 0.0025 -> 25 bps; 25 already bps; 0.25 -> 25 bps if someone passed percent
  if ((feeRate as number) > 0 && (feeRate as number) < 1) {
    return Math.round((feeRate as number) * 10_000);
  }
  if ((feeRate as number) > 0 && (feeRate as number) < 100) {
    return Math.round((feeRate as number) * 100);
  }
  return Math.round(feeRate as number) || fallback;
}

export async function fetchJson<T>(url: string, timeoutMs = 20_000): Promise<T> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      throw new Error(`${res.status} ${res.statusText} for ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(t);
  }
}
