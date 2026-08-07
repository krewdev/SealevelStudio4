export type PaperTrade = {
  id: string;
  ts: number;
  mint: string;
  side: 'buy' | 'sell';
  sol: number;
  tokens: number;
  price: number;
  bot: 'volume' | 'mm' | 'sniper';
  pattern: string;
  live?: boolean;
  signature?: string;
  error?: string;
  /** True when sol/tokens came from confirmed tx meta, not the quote. */
  settled?: boolean;
  feeSol?: number;
};

type Listener = () => void;

const trades: PaperTrade[] = [];
const listeners = new Set<Listener>();
const MAX = 4000;

export function pushPaperTrade(trade: Omit<PaperTrade, 'id' | 'ts'> & { ts?: number }): PaperTrade {
  const full: PaperTrade = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    ts: trade.ts ?? Date.now(),
    mint: trade.mint,
    side: trade.side,
    sol: trade.sol,
    tokens: trade.tokens,
    price: trade.price,
    bot: trade.bot,
    pattern: trade.pattern,
    live: trade.live,
    signature: trade.signature,
    error: trade.error,
    settled: trade.settled,
    feeSol: trade.feeSol,
  };
  trades.push(full);
  if (trades.length > MAX) trades.splice(0, trades.length - MAX);
  listeners.forEach((l) => l());
  return full;
}

export function patchPaperTrade(id: string, patch: Partial<PaperTrade>): PaperTrade | null {
  const row = trades.find((t) => t.id === id);
  if (!row) return null;
  Object.assign(row, patch);
  listeners.forEach((l) => l());
  return row;
}

export function listPaperTrades(mint?: string): PaperTrade[] {
  if (!mint) return [...trades];
  return trades.filter((t) => t.mint === mint);
}

export function clearPaperTrades(mint?: string) {
  if (!mint) trades.splice(0, trades.length);
  else {
    for (let i = trades.length - 1; i >= 0; i--) {
      if (trades[i]!.mint === mint) trades.splice(i, 1);
    }
  }
  listeners.forEach((l) => l());
}

export function subscribePaperTrades(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
