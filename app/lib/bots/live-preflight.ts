import type { Connection } from '@solana/web3.js';
import { PublicKey } from '@solana/web3.js';
import {
  LIVE_DAILY_LOSS_CAP,
  LIVE_MAX_SOL_PER_TRADE,
  LIVE_MAX_TRADES,
  LIVE_MIN_INTERVAL_MS,
  LIVE_SESSION_LOSS_CAP,
} from './live-engine';
import { fetchJupiterQuote, WSOL_MINT } from './live-swap';
import { isOnPumpBondingCurve } from '../pumpfun/curve-buy';
import { REPLAY_MAX_AGE_MS } from './replay-engine';

export type LiveVenueKind = 'jupiter' | 'pump-curve' | 'none';

export type LiveVenueResult = {
  kind: LiveVenueKind;
  label: string;
  quoteOk: boolean;
  error?: string;
};

export type LiveReplaySnapshot = {
  mint: string;
  completedAt: number;
  pnlSol: number;
  trades: number;
  seconds: number;
  buys?: number;
  sells?: number;
};

export type LivePreflightInput = {
  mint: string;
  pattern: string;
  livePatternAllowed: boolean;
  maxSolPerTrade: number;
  intervalMs: number;
  maxTrades: number;
  signerSource: 'phantom' | 'studio' | null;
  signerAddress: string | null;
  canSignVersioned: boolean;
  disarmed: boolean;
  dailyLossSol: number;
  walletSol?: number | null;
  replay?: LiveReplaySnapshot | null;
  venue: { kind: LiveVenueKind | 'pending'; label: string; error?: string };
  now?: number;
};

export type LivePreflightPlan = {
  mint: string;
  pattern: string;
  signer: string;
  venueKind: LiveVenueKind | 'pending';
  venueLabel: string;
  maxSolPerTrade: number;
  intervalMs: number;
  maxTrades: number;
  worstCaseSol: number;
  sessionLossCap: number;
  dailyLossCap: number;
  dailyLossUsed: number;
  dailyLossRemaining: number;
  replay: null | {
    trades: number;
    buys?: number;
    sells?: number;
    pnlSol: number;
    seconds: number;
    ageMs: number;
    ageLabel: string;
    stale: boolean;
  };
  blockers: string[];
  warnings: string[];
  canArm: boolean;
};

export function formatAge(ms: number): string {
  if (ms < 60_000) return `${Math.max(1, Math.round(ms / 1000))}s ago`;
  if (ms < 3_600_000) return `${Math.round(ms / 60_000)}m ago`;
  return `${Math.round(ms / 3_600_000)}h ago`;
}

export function buildLivePreflightPlan(input: LivePreflightInput): LivePreflightPlan {
  const now = input.now ?? Date.now();
  const mint = input.mint.trim();
  const maxSol = Math.min(LIVE_MAX_SOL_PER_TRADE, Math.max(0, input.maxSolPerTrade || 0));
  const maxTrades = Math.min(LIVE_MAX_TRADES, Math.max(0, Math.floor(input.maxTrades || 0)));
  const intervalMs = Math.max(0, Math.floor(input.intervalMs || 0));
  const worstCaseSol = maxSol * maxTrades;
  const dailyUsed = Math.max(0, input.dailyLossSol || 0);
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!mint || mint.toUpperCase() === 'DEMO') blockers.push('Live needs a real mint (not DEMO).');
  if (!input.livePatternAllowed) blockers.push(`${input.pattern} is paper-only.`);
  if (input.disarmed) blockers.push('Kill switch is on — re-arm first.');
  if (!input.canSignVersioned || input.signerSource !== 'phantom' || !input.signerAddress) {
    blockers.push('Live requires Phantom / Solflare as the active signer.');
  }
  if (input.maxSolPerTrade > LIVE_MAX_SOL_PER_TRADE) {
    blockers.push(`Max SOL per trade exceeds ${LIVE_MAX_SOL_PER_TRADE} cap.`);
  }
  if (intervalMs < LIVE_MIN_INTERVAL_MS) {
    blockers.push(`Interval must be ≥ ${LIVE_MIN_INTERVAL_MS} ms.`);
  }
  if (maxTrades < 1) blockers.push('Max signed swaps must be at least 1.');

  let replay: LivePreflightPlan['replay'] = null;
  if (!input.replay || input.replay.mint !== mint) {
    blockers.push('Run a 60s quote replay on this mint first.');
  } else {
    const ageMs = Math.max(0, now - input.replay.completedAt);
    const stale = ageMs >= REPLAY_MAX_AGE_MS;
    replay = {
      trades: input.replay.trades,
      buys: input.replay.buys,
      sells: input.replay.sells,
      pnlSol: input.replay.pnlSol,
      seconds: input.replay.seconds,
      ageMs,
      ageLabel: formatAge(ageMs),
      stale,
    };
    if (stale) blockers.push('Replay is stale (>30m). Re-run quote replay.');
    if (input.replay.pnlSol < 0) {
      warnings.push(
        `Replay estimated ${input.replay.pnlSol.toFixed(4)} SOL (fees not included). Size down or skip.`
      );
    }
    if (input.replay.trades === 0) {
      warnings.push('Replay printed 0 fills — mid may be too quiet for this pattern.');
    }
  }

  if (input.venue.kind === 'none') {
    blockers.push(input.venue.error || 'No Jupiter route and mint is not on a pump curve.');
  }
  if (input.venue.kind === 'pump-curve') {
    warnings.push('Venue is pump bonding curve via official Pump SDK. Higher slippage than Jupiter.');
  }

  if (dailyUsed >= LIVE_DAILY_LOSS_CAP) {
    blockers.push(`Daily loss cap already hit (${dailyUsed.toFixed(4)} / ${LIVE_DAILY_LOSS_CAP} SOL).`);
  } else if (dailyUsed >= LIVE_DAILY_LOSS_CAP * 0.5) {
    warnings.push(`Daily loss already ${dailyUsed.toFixed(4)} SOL of ${LIVE_DAILY_LOSS_CAP} cap.`);
  }

  if (input.walletSol != null && input.walletSol < maxSol) {
    warnings.push(`Wallet has ${input.walletSol.toFixed(4)} SOL — less than one max trade (${maxSol} SOL).`);
  }

  const canArm = blockers.length === 0 && input.venue.kind !== 'pending';

  return {
    mint,
    pattern: input.pattern,
    signer: input.signerAddress
      ? `${input.signerSource === 'phantom' ? 'Phantom' : 'Studio'} ${input.signerAddress.slice(0, 4)}…${input.signerAddress.slice(-4)}`
      : 'none',
    venueKind: input.venue.kind,
    venueLabel: input.venue.label,
    maxSolPerTrade: maxSol,
    intervalMs,
    maxTrades,
    worstCaseSol,
    sessionLossCap: LIVE_SESSION_LOSS_CAP,
    dailyLossCap: LIVE_DAILY_LOSS_CAP,
    dailyLossUsed: dailyUsed,
    dailyLossRemaining: Math.max(0, LIVE_DAILY_LOSS_CAP - dailyUsed),
    replay,
    blockers,
    warnings,
    canArm,
  };
}

export async function resolveLiveVenue(
  connection: Connection,
  mint: string,
  maxSolPerTrade: number,
  slippageBps = 75
): Promise<LiveVenueResult> {
  const probeSol = Math.min(Math.max(maxSolPerTrade, 0.001), 0.01);
  try {
    const quote = await fetchJupiterQuote({
      inputMint: WSOL_MINT,
      outputMint: mint,
      amount: String(Math.floor(probeSol * 1e9)),
      slippageBps,
    });
    if (quote?.outAmount) {
      return { kind: 'jupiter', label: 'Jupiter (aggregated AMM)', quoteOk: true };
    }
  } catch (err) {
    const jupErr = err instanceof Error ? err.message : String(err);
    try {
      const pk = new PublicKey(mint);
      if (await isOnPumpBondingCurve(connection, pk)) {
        return {
          kind: 'pump-curve',
          label: 'Pump.fun bonding curve (official SDK)',
          quoteOk: false,
          error: jupErr,
        };
      }
    } catch {
      /* ignore invalid mint — handled as none */
    }
    return {
      kind: 'none',
      label: 'No route',
      quoteOk: false,
      error: jupErr,
    };
  }
  return { kind: 'none', label: 'No route', quoteOk: false, error: 'Empty Jupiter quote' };
}
