import { Connection, PublicKey } from '@solana/web3.js';
import type { BotPatternId } from './patterns';
import { pushPaperTrade } from './trade-store';
import { resolveFillAmounts } from './fill-from-chain';
import { executeJupiterSwap, fetchJupiterQuote, WSOL_MINT, type WalletSender } from './live-swap';
import { isDisarmed, disarmAll } from './kill-switch';
import { addDailyLoss, getDailyLoss } from '../session/desk-session';
import { fetchOnchainPosition } from './position';
import { executePumpCurveBuy, executePumpCurveSell, isOnPumpBondingCurve } from '../pumpfun/curve-buy';

/** Patterns that are not two-sided wash/volume tape. */
export const LIVE_ALLOWED_PATTERNS: BotPatternId[] = ['inventory-mm', 'buy-drip', 'sell-drip'];

export function isLivePatternAllowed(id: BotPatternId): boolean {
  return LIVE_ALLOWED_PATTERNS.includes(id);
}

export type LiveBotConfig = {
  mint: string;
  pattern: BotPatternId;
  maxSolPerTrade: number;
  intervalMs: number;
  maxTrades: number;
  slippageBps: number;
  buyBelowMidPct: number;
  sellAboveMidPct: number;
  maxDrawdownSol?: number;
  dailyLossCapSol?: number;
  publicKey: PublicKey;
  connection: Connection;
  sendTransaction: WalletSender;
};

export const LIVE_MAX_SOL_PER_TRADE = 0.05;
export const LIVE_MIN_INTERVAL_MS = 8000;
export const LIVE_MAX_TRADES = 20;
export const LIVE_SESSION_LOSS_CAP = 0.05;
export const LIVE_DAILY_LOSS_CAP = 0.08;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clampLive(cfg: LiveBotConfig): LiveBotConfig {
  return {
    ...cfg,
    maxSolPerTrade: Math.min(LIVE_MAX_SOL_PER_TRADE, Math.max(0.001, cfg.maxSolPerTrade)),
    intervalMs: Math.max(LIVE_MIN_INTERVAL_MS, cfg.intervalMs),
    maxTrades: Math.min(LIVE_MAX_TRADES, Math.max(1, Math.floor(cfg.maxTrades))),
  };
}

export function startLiveBot(
  raw: LiveBotConfig,
  onStatus?: (msg: string) => void
): () => void {
  const cfg = clampLive(raw);
  if (!isLivePatternAllowed(cfg.pattern)) {
    throw new Error(`${cfg.pattern} is paper-only (would fake two-sided volume). Use inventory MM, buy drip, or sell drip.`);
  }
  let mint: PublicKey;
  try {
    mint = new PublicKey(cfg.mint.trim());
  } catch {
    throw new Error('Live mode needs a real mint address (not DEMO).');
  }

  let stopped = false;
  let trades = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let mid = 0;
  let inventoryTokens = 0;
  let solSpent = 0;
  let solGot = 0;
  const maxDd = cfg.maxDrawdownSol ?? LIVE_SESSION_LOSS_CAP;
  const dailyCap = cfg.dailyLossCapSol ?? LIVE_DAILY_LOSS_CAP;

  const mintStr = mint.toBase58();

  const tripKill = (why: string) => {
    stopped = true;
    addDailyLoss(Math.max(0, solSpent - solGot));
    disarmAll(why);
    onStatus?.(why);
  };

  const schedule = (delay?: number) => {
    if (stopped) return;
    timer = setTimeout(runOnce, delay ?? cfg.intervalMs);
  };

  const runOnce = async () => {
    if (stopped) return;
    if (isDisarmed()) {
      stopped = true;
      onStatus?.(`Disarmed: ${'kill switch'}`);
      return;
    }
    if (trades >= cfg.maxTrades) {
      onStatus?.(`Live bot hit max ${cfg.maxTrades} signed swaps — stopped.`);
      stopped = true;
      return;
    }
    const openLoss = solSpent - solGot;
    if (openLoss >= maxDd) {
      tripKill(`Kill switch: session loss ${openLoss.toFixed(4)} SOL ≥ ${maxDd} cap`);
      return;
    }
    if (getDailyLoss() >= dailyCap) {
      tripKill(`Kill switch: daily loss ${getDailyLoss().toFixed(4)} SOL ≥ ${dailyCap} cap`);
      return;
    }

    try {
      const probeSol = Math.min(cfg.maxSolPerTrade, 0.01);
      let venue: 'jupiter' | 'pump-curve' = 'jupiter';
      let spot = 0;
      try {
        const probe = await fetchJupiterQuote({
          inputMint: WSOL_MINT,
          outputMint: mintStr,
          amount: String(Math.floor(probeSol * 1e9)),
          slippageBps: cfg.slippageBps,
        });
        spot = Number(probe.outAmount) / Math.max(Number(probe.inAmount), 1);
      } catch (quoteErr) {
        if (await isOnPumpBondingCurve(cfg.connection, mint)) {
          venue = 'pump-curve';
          spot = mid > 0 ? mid : 1;
        } else {
          throw quoteErr;
        }
      }
      if (mid <= 0) mid = spot;
      else mid = mid * 0.7 + spot * 0.3;
      const devPct = mid > 0 ? ((spot - mid) / mid) * 100 : 0;

      let side: 'buy' | 'sell' | 'skip' = 'skip';
      if (cfg.pattern === 'buy-drip') side = 'buy';
      else if (cfg.pattern === 'sell-drip') side = inventoryTokens > 0 ? 'sell' : 'skip';
      else if (devPct <= -cfg.buyBelowMidPct) side = 'buy';
      else if (devPct >= cfg.sellAboveMidPct && inventoryTokens > 0) side = 'sell';

      if (side === 'skip') {
        onStatus?.(`Live idle · ${venue} · spot ${spot.toExponential(3)} mid ${mid.toExponential(3)} (${devPct.toFixed(2)}%)`);
        schedule();
        return;
      }

      const sol = rand(cfg.maxSolPerTrade * 0.5, cfg.maxSolPerTrade);
      onStatus?.(`Signing live ${side.toUpperCase()} ${sol.toFixed(4)} SOL via ${venue}…`);

      if (side === 'buy') {
        let signature = '';
        let tokens = 0;
        let price = spot;
        try {
          if (venue === 'jupiter') {
            const result = await executeJupiterSwap({
              connection: cfg.connection,
              publicKey: cfg.publicKey,
              sendTransaction: cfg.sendTransaction,
              inputMint: WSOL_MINT,
              outputMint: mintStr,
              amountRaw: String(Math.floor(sol * 1e9)),
              slippageBps: cfg.slippageBps,
            });
            signature = result.signature;
            tokens = Number(result.outAmount);
            price = result.price;
          } else {
            throw new Error('curve-only');
          }
        } catch (jupErr) {
          if (!(await isOnPumpBondingCurve(cfg.connection, mint))) throw jupErr;
          const curve = await executePumpCurveBuy({
            connection: cfg.connection,
            publicKey: cfg.publicKey,
            sendTransaction: cfg.sendTransaction as any,
            mint: mintStr,
            solAmount: sol,
            slippagePercent: Math.max(5, Math.round(cfg.slippageBps / 100)),
          });
          signature = curve.signature;
          tokens = Number(curve.tokenAmount);
          venue = 'pump-curve';
        }
        const fill = await resolveFillAmounts(cfg.connection, signature, {
          payer: cfg.publicKey.toBase58(),
          mint: mintStr,
          side: 'buy',
          fallback: { sol, tokens, price },
        });
        inventoryTokens += fill.tokens;
        trades += 1;
        solSpent += fill.sol;
        pushPaperTrade({
          mint: mintStr,
          side: 'buy',
          sol: fill.sol,
          tokens: fill.tokens,
          price: fill.price,
          bot: 'mm',
          pattern: `${cfg.pattern}:${venue}`,
          live: true,
          signature,
          settled: fill.settled,
          feeSol: fill.feeSol,
        });
        onStatus?.(
          `LIVE BUY ${fill.sol.toFixed(4)} SOL · ${venue}${fill.settled ? ' · chain' : ' · quote'} · ${signature.slice(0, 8)}…`
        );
      } else {
        try {
          const pos = await fetchOnchainPosition(cfg.connection, cfg.publicKey, mintStr);
          if (pos.tokenRaw > BigInt(0)) inventoryTokens = Number(pos.tokenRaw);
        } catch {
          /* keep local inventory */
        }
        const tokenRaw = Math.max(1, Math.floor(inventoryTokens * 0.35));
        let signature = '';
        let solOut = 0;
        let price = spot;
        try {
          if (venue === 'jupiter') {
            const result = await executeJupiterSwap({
              connection: cfg.connection,
              publicKey: cfg.publicKey,
              sendTransaction: cfg.sendTransaction,
              inputMint: mintStr,
              outputMint: WSOL_MINT,
              amountRaw: String(tokenRaw),
              slippageBps: cfg.slippageBps,
            });
            signature = result.signature;
            solOut = Number(result.outAmount) / 1e9;
            price = result.price;
          } else {
            throw new Error('curve-only');
          }
        } catch (jupErr) {
          if (!(await isOnPumpBondingCurve(cfg.connection, mint))) throw jupErr;
          const curve = await executePumpCurveSell({
            connection: cfg.connection,
            publicKey: cfg.publicKey,
            sendTransaction: cfg.sendTransaction as any,
            mint: mintStr,
            tokenAmountRaw: tokenRaw,
            slippagePercent: Math.max(5, Math.round(cfg.slippageBps / 100)),
          });
          signature = curve.signature;
          solOut = curve.solOut;
          venue = 'pump-curve';
        }
        const fill = await resolveFillAmounts(cfg.connection, signature, {
          payer: cfg.publicKey.toBase58(),
          mint: mintStr,
          side: 'sell',
          fallback: { sol: solOut, tokens: tokenRaw, price },
        });
        inventoryTokens = Math.max(0, inventoryTokens - fill.tokens);
        trades += 1;
        solGot += fill.sol;
        pushPaperTrade({
          mint: mintStr,
          side: 'sell',
          sol: fill.sol,
          tokens: fill.tokens,
          price: fill.price,
          bot: 'mm',
          pattern: `${cfg.pattern}:${venue}`,
          live: true,
          signature,
          settled: fill.settled,
          feeSol: fill.feeSol,
        });
        onStatus?.(
          `LIVE SELL ~${fill.sol.toFixed(4)} SOL · ${venue}${fill.settled ? ' · chain' : ' · quote'} · ${signature.slice(0, 8)}…`
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      onStatus?.(`Live tick failed: ${msg}`);
      pushPaperTrade({
        mint: mintStr,
        side: 'buy',
        sol: 0,
        tokens: 0,
        price: mid || 0,
        bot: 'mm',
        pattern: cfg.pattern,
        live: true,
        error: msg,
      });
    }

    if (!stopped) schedule();
  };

  onStatus?.('Live bot armed — Jupiter first, pump SDK curve if no route. Approve each wallet popup.');
  schedule(1500);

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
