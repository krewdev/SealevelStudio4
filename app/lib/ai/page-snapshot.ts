import { getDeskSession } from '../session/desk-session';
import { getPaperBotStatus, isPaperBotRunning } from '../bots/controller';
import { disarmReason, isDisarmed } from '../bots/kill-switch';
import { listPaperTrades } from '../bots/trade-store';
import { replayUnlocksLive } from '../bots/replay-engine';

export type GrokMode = 'explain' | 'plan' | 'act';

export type PageSnapshot = {
  view: string;
  network?: string;
  wallet: {
    phantom?: string | null;
    studio?: string | null;
    connected: boolean;
  };
  session: ReturnType<typeof getDeskSession>;
  paperBot: ReturnType<typeof getPaperBotStatus>;
  paperRunning: boolean;
  disarmed: boolean;
  disarmReason?: string;
  replayUnlocked: boolean;
  recentTrades: number;
  visibleTargets: string[];
  title?: string;
};

export function collectPageSnapshot(extra?: {
  phantom?: string | null;
  studio?: string | null;
  network?: string;
}): PageSnapshot {
  const view =
    typeof window !== 'undefined' ? localStorage.getItem('sealevel-active-view') || 'home' : 'home';
  const session = getDeskSession();
  const mint = session.mint || '';
  const targets =
    typeof document !== 'undefined'
      ? Array.from(document.querySelectorAll<HTMLElement>('[data-sealevel-target]'))
          .map((el) => el.dataset.sealevelTarget || '')
          .filter(Boolean)
          .slice(0, 40)
      : [];

  return {
    view,
    network: extra?.network,
    wallet: {
      phantom: extra?.phantom || null,
      studio: extra?.studio || null,
      connected: !!(extra?.phantom || extra?.studio),
    },
    session,
    paperBot: getPaperBotStatus(),
    paperRunning: isPaperBotRunning(),
    disarmed: isDisarmed(),
    disarmReason: disarmReason() || undefined,
    replayUnlocked: mint ? replayUnlocksLive(mint) : false,
    recentTrades: listPaperTrades(mint || undefined).length,
    visibleTargets: targets,
    title: typeof document !== 'undefined' ? document.title : undefined,
  };
}

export function snapshotToPrompt(snap: PageSnapshot): string {
  return [
    `VIEW=${snap.view}`,
    `NETWORK=${snap.network || 'unknown'}`,
    `PHANTOM=${snap.wallet.phantom || 'none'}`,
    `STUDIO_WALLET=${snap.wallet.studio || 'none'}`,
    `SESSION_MINT=${snap.session.mint || 'none'}`,
    `SESSION_SOURCE=${snap.session.source || 'none'}`,
    `SESSION_REASON=${snap.session.reason || 'none'}`,
    `REPLAY_UNLOCKED=${snap.replayUnlocked}`,
    `PAPER_BOT=${snap.paperRunning ? JSON.stringify(snap.paperBot) : 'stopped'}`,
    `DISARMED=${snap.disarmed}${snap.disarmReason ? `(${snap.disarmReason})` : ''}`,
    `RECENT_TRADES=${snap.recentTrades}`,
    `UI_TARGETS=${snap.visibleTargets.join(',') || 'none'}`,
  ].join('\n');
}
