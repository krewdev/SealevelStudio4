import { startPaperBot, type PaperBotConfig } from './paper-engine';
import type { BotPatternId } from './patterns';
import { isDisarmed } from './kill-switch';

export type PaperBotStatus = {
  mint: string;
  pattern: string;
  bot: string;
  startedAt: number;
};

const EVENT = 'sealevel-paper-bot';

let stopFn: (() => void) | null = null;
let running: PaperBotStatus | null = null;

function emit() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: running }));
}

export function isPaperBotRunning() {
  return !!running;
}

export function getPaperBotStatus() {
  return running;
}

export function subscribePaperBotStatus(fn: (status: PaperBotStatus | null) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => fn(running);
  window.addEventListener(EVENT, handler);
  fn(running);
  return () => window.removeEventListener(EVENT, handler);
}

export function startControlledPaperBot(cfg: Partial<PaperBotConfig> & { pattern?: BotPatternId }) {
  if (isDisarmed()) {
    throw new Error('Desk is disarmed. Re-arm before starting paper bots.');
  }
  stopControlledPaperBot();
  const full: PaperBotConfig = {
    mint: cfg.mint || 'DEMO',
    pattern: cfg.pattern || (cfg.bot === 'mm' ? 'inventory-mm' : 'volume-tight'),
    bot: cfg.bot || 'volume',
    amountMinSol: cfg.amountMinSol ?? (cfg.bot === 'mm' ? 0.01 : 0.002),
    amountMaxSol: cfg.amountMaxSol ?? (cfg.bot === 'mm' ? 0.04 : 0.012),
    intervalMsMin: cfg.intervalMsMin ?? 800,
    intervalMsMax: cfg.intervalMsMax ?? 2000,
    buyBelowMidPct: cfg.buyBelowMidPct ?? 0.4,
    sellAboveMidPct: cfg.sellAboveMidPct ?? 0.4,
  };
  stopFn = startPaperBot(full);
  running = {
    mint: full.mint,
    pattern: full.pattern,
    bot: full.bot,
    startedAt: Date.now(),
  };
  emit();
  return running;
}

export function stopControlledPaperBot() {
  if (stopFn) stopFn();
  stopFn = null;
  const prev = running;
  running = null;
  emit();
  return prev;
}
