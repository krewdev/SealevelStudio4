import { getPattern, type BotPatternId, type PhaseSide } from './patterns';
import { pushPaperTrade } from './trade-store';

export type PaperBotConfig = {
  mint: string;
  pattern: BotPatternId;
  bot: 'volume' | 'mm';
  amountMinSol: number;
  amountMaxSol: number;
  intervalMsMin: number;
  intervalMsMax: number;
  buyBelowMidPct?: number;
  sellAboveMidPct?: number;
};

type Curve = { virtualSol: number; virtualToken: number };

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pickSide(side: PhaseSide, altFlip: boolean): 'buy' | 'sell' {
  if (side === 'buy') return 'buy';
  if (side === 'sell') return 'sell';
  if (side === 'mostly-buy') return Math.random() < 0.75 ? 'buy' : 'sell';
  if (side === 'mostly-sell') return Math.random() < 0.75 ? 'sell' : 'buy';
  return altFlip ? 'buy' : 'sell';
}

function spot(c: Curve) {
  return c.virtualToken <= 0 ? 0 : c.virtualSol / c.virtualToken;
}

function applyTrade(c: Curve, side: 'buy' | 'sell', sol: number) {
  const price = spot(c);
  if (side === 'buy') {
    const k = c.virtualSol * c.virtualToken;
    c.virtualSol += sol;
    c.virtualToken = k / c.virtualSol;
    const newPrice = spot(c);
    const tokens = sol / Math.max(price, 1e-12);
    return { tokens, price: (price + newPrice) / 2 };
  }
  const tokens = sol / Math.max(price, 1e-12);
  const k = c.virtualSol * c.virtualToken;
  c.virtualToken += tokens;
  c.virtualSol = k / c.virtualToken;
  const newPrice = spot(c);
  return { tokens, price: (price + newPrice) / 2 };
}

export function startPaperBot(
  cfg: PaperBotConfig,
  onTick?: (info: { price: number; side: string; sol: number }) => void
): () => void {
  const pattern = getPattern(cfg.pattern);
  const curve: Curve = { virtualSol: 30, virtualToken: 1_000_000_000 };
  let mid = spot(curve);
  const prices: number[] = [mid];
  let altFlip = true;
  let phaseIdx = 0;
  let phaseElapsed = 0;
  const started = Date.now();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;

  const schedule = () => {
    if (stopped) return;
    const phase = pattern.phases[phaseIdx] || pattern.phases[0]!;
    const wait = rand(cfg.intervalMsMin, cfg.intervalMsMax) * phase.intervalMul;
    timer = setTimeout(runOnce, Math.max(250, wait));
  };

  const runOnce = () => {
    if (stopped) return;
    const elapsed = Date.now() - started;
    const phase = pattern.phases[phaseIdx] || pattern.phases[0]!;
    phaseElapsed += 1;
    // advance phase roughly by weights after ~12 ticks
    const ticksPerCycle = 12;
    if (phaseElapsed > ticksPerCycle * phase.weight * pattern.phases.length) {
      phaseIdx = (phaseIdx + 1) % pattern.phases.length;
      phaseElapsed = 0;
    }

    const priceNow = spot(curve);
    prices.push(priceNow);
    if (prices.length > 30) prices.shift();
    mid = prices.reduce((a, b) => a + b, 0) / prices.length;
    const devPct = mid > 0 ? ((priceNow - mid) / mid) * 100 : 0;

    let side: 'buy' | 'sell';
    if (cfg.bot === 'mm' || cfg.pattern === 'inventory-mm') {
      const buyBelow = cfg.buyBelowMidPct ?? 0.35;
      const sellAbove = cfg.sellAboveMidPct ?? 0.35;
      if (devPct <= -buyBelow) side = 'buy';
      else if (devPct >= sellAbove) side = 'sell';
      else {
        schedule();
        return;
      }
    } else {
      side = pickSide(phase.side, altFlip);
      altFlip = !altFlip;
    }

    const sol = rand(cfg.amountMinSol, cfg.amountMaxSol) * phase.sizeMul;
    const fill = applyTrade(curve, side, sol);
    pushPaperTrade({
      mint: cfg.mint || 'DEMO',
      side,
      sol,
      tokens: fill.tokens,
      price: fill.price,
      bot: cfg.bot,
      pattern: pattern.id,
    });
    onTick?.({ price: fill.price, side, sol });
    schedule();
  };

  schedule();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
