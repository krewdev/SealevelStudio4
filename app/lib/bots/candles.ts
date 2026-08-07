import type { PaperTrade } from './trade-store';

export type Ohlc = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  buys: number;
  sells: number;
};

export function buildCandles(trades: PaperTrade[], intervalMs = 5000): Ohlc[] {
  if (!trades || trades.length === 0) return [];
  const sorted = trades.slice().sort((a, b) => a.ts - b.ts);
  const map = new Map<number, Ohlc>();
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i]!;
    const bucket = Math.floor(t.ts / intervalMs) * intervalMs;
    const existing = map.get(bucket);
    if (!existing) {
      map.set(bucket, {
        time: bucket,
        open: t.price,
        high: t.price,
        low: t.price,
        close: t.price,
        volume: t.sol,
        buys: t.side === 'buy' ? 1 : 0,
        sells: t.side === 'sell' ? 1 : 0,
      });
    } else {
      existing.high = Math.max(existing.high, t.price);
      existing.low = Math.min(existing.low, t.price);
      existing.close = t.price;
      existing.volume += t.sol;
      if (t.side === 'buy') existing.buys += 1;
      else existing.sells += 1;
    }
  }
  const out: Ohlc[] = [];
  map.forEach((candle) => {
    out.push(candle);
  });
  out.sort((a, b) => a.time - b.time);
  return out;
}
