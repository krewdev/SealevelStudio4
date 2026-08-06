import type { BotPatternId } from './patterns';
import { pushPaperTrade } from './trade-store';
import { fetchJupiterQuote, WSOL_MINT } from './live-swap';
import { isLivePatternAllowed } from './live-engine';
import { getDeskSession, patchDeskSession } from '../session/desk-session';

export type ReplayResult = {
  mint: string;
  seconds: number;
  trades: number;
  buys: number;
  sells: number;
  pnlSol: number;
  lastSpot: number;
};

export async function runQuoteReplay(params: {
  mint: string;
  pattern: BotPatternId;
  maxSolPerTrade: number;
  seconds?: number;
  slippageBps?: number;
  buyBelowMidPct?: number;
  sellAboveMidPct?: number;
  onStatus?: (msg: string) => void;
  signal?: { stopped: boolean };
}): Promise<ReplayResult> {
  if (!isLivePatternAllowed(params.pattern)) {
    throw new Error('Replay-for-live only applies to inventory MM / buy drip / sell drip.');
  }
  const mint = params.mint.trim();
  if (!mint || mint.toUpperCase() === 'DEMO') {
    throw new Error('Replay needs a real mint (not DEMO).');
  }

  const seconds = Math.min(90, Math.max(20, params.seconds ?? 60));
  const deadline = Date.now() + seconds * 1000;
  const buyBelow = params.buyBelowMidPct ?? 0.4;
  const sellAbove = params.sellAboveMidPct ?? 0.4;
  let mid = 0;
  let inv = 0;
  let solSpent = 0;
  let solGot = 0;
  let buys = 0;
  let sells = 0;
  let lastSpot = 0;

  params.onStatus?.(`Replay ${seconds}s on live Jupiter quotes (no broadcast)…`);

  while (Date.now() < deadline) {
    if (params.signal?.stopped) break;
    try {
      const probeSol = Math.min(params.maxSolPerTrade, 0.01);
      const quote = await fetchJupiterQuote({
        inputMint: WSOL_MINT,
        outputMint: mint,
        amount: String(Math.floor(probeSol * 1e9)),
        slippageBps: params.slippageBps ?? 75,
      });
      const spot = Number(quote.outAmount) / Math.max(Number(quote.inAmount), 1);
      lastSpot = spot;
      mid = mid <= 0 ? spot : mid * 0.7 + spot * 0.3;
      const devPct = mid > 0 ? ((spot - mid) / mid) * 100 : 0;

      let side: 'buy' | 'sell' | 'skip' = 'skip';
      if (params.pattern === 'buy-drip') side = 'buy';
      else if (params.pattern === 'sell-drip') side = inv > 0 ? 'sell' : 'skip';
      else if (devPct <= -buyBelow) side = 'buy';
      else if (devPct >= sellAbove && inv > 0) side = 'sell';

      if (side === 'buy') {
        const sol = params.maxSolPerTrade * (0.5 + Math.random() * 0.5);
        const tokens = sol * 1e9 * spot;
        inv += tokens;
        solSpent += sol;
        buys += 1;
        pushPaperTrade({
          mint,
          side: 'buy',
          sol,
          tokens,
          price: spot,
          bot: 'mm',
          pattern: `${params.pattern}-replay`,
        });
        params.onStatus?.(`Replay BUY ${sol.toFixed(4)} SOL · ${devPct.toFixed(2)}% vs mid`);
      } else if (side === 'sell') {
        const tokens = Math.max(1, inv * 0.35);
        const solOut = tokens / Math.max(spot * 1e9, 1e-12);
        inv = Math.max(0, inv - tokens);
        solGot += solOut;
        sells += 1;
        pushPaperTrade({
          mint,
          side: 'sell',
          sol: solOut,
          tokens,
          price: spot,
          bot: 'mm',
          pattern: `${params.pattern}-replay`,
        });
        params.onStatus?.(`Replay SELL ~${solOut.toFixed(4)} SOL · ${devPct.toFixed(2)}% vs mid`);
      } else {
        params.onStatus?.(`Replay idle · ${devPct.toFixed(2)}% vs mid`);
      }
    } catch (err) {
      params.onStatus?.(`Replay quote failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    await new Promise((r) => setTimeout(r, 2500));
  }

  const leftoverSol = inv > 0 && lastSpot > 0 ? inv / (lastSpot * 1e9) : 0;
  const pnlSol = solGot + leftoverSol - solSpent;
  const trades = buys + sells;
  patchDeskSession({
    mint,
    source: 'replay',
    replay: { mint, completedAt: Date.now(), pnlSol, trades, seconds, buys, sells },
  });
  params.onStatus?.(
    `Replay done: ${trades} prints, est. PnL ${pnlSol >= 0 ? '+' : ''}${pnlSol.toFixed(4)} SOL (fees not included). Live unlocked for this mint.`
  );
  return { mint, seconds, trades, buys, sells, pnlSol, lastSpot };
}

export const REPLAY_MAX_AGE_MS = 30 * 60 * 1000;

export function replayUnlocksLive(mint: string, maxAgeMs = REPLAY_MAX_AGE_MS): boolean {
  const s = getDeskSession();
  if (!s.replay || s.replay.mint !== mint) return false;
  return Date.now() - s.replay.completedAt < maxAgeMs;
}
