export type DeskSource = 'kol' | 'scanner' | 'sniper' | 'manual' | 'grok' | 'replay';

export type DeskSession = {
  mint: string;
  source?: DeskSource;
  reason?: string;
  pattern?: string;
  maxSol?: number;
  intentTab?: 'volume' | 'mm' | 'sniper';
  opportunityId?: string;
  lastSim?: { ok: boolean; units?: number; profitHint?: string; at: number };
  replay?: {
    mint: string;
    completedAt: number;
    pnlSol: number;
    trades: number;
    seconds: number;
    buys?: number;
    sells?: number;
  };
  lastPreflight?: {
    at: number;
    venue: string;
    worstCaseSol: number;
    blockers: number;
  };
  dailyLossSol?: number;
  dailyLossDay?: string; // YYYY-MM-DD UTC
  updatedAt: number;
};

const KEY = 'sealevel-desk-session';
export const DESK_SESSION_EVENT = 'sealevel-session';

const empty = (): DeskSession => ({ mint: '', updatedAt: Date.now() });

function read(): DeskSession {
  if (typeof window === 'undefined') return empty();
  try {
    const raw = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw) as DeskSession;
    return { ...empty(), ...parsed };
  } catch {
    return empty();
  }
}

function write(next: DeskSession) {
  next.updatedAt = Date.now();
  if (typeof window === 'undefined') return next;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(next));
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore quota */
  }
  window.dispatchEvent(new CustomEvent(DESK_SESSION_EVENT, { detail: next }));
  return next;
}

export function getDeskSession(): DeskSession {
  return read();
}

export function patchDeskSession(partial: Partial<DeskSession>): DeskSession {
  const cur = read();
  const next: DeskSession = { ...cur, ...partial, mint: (partial.mint ?? cur.mint) || '' };
  return write(next);
}

export function subscribeDeskSession(fn: (s: DeskSession) => void): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => fn(read());
  window.addEventListener(DESK_SESSION_EVENT, handler);
  fn(read());
  return () => window.removeEventListener(DESK_SESSION_EVENT, handler);
}

export function attachMintToDesk(params: {
  mint: string;
  source: DeskSource;
  reason?: string;
  maxSol?: number;
  intentTab?: DeskSession['intentTab'];
  navigate?: boolean;
}): DeskSession {
  const next = patchDeskSession({
    mint: params.mint.trim(),
    source: params.source,
    reason: params.reason,
    maxSol: params.maxSol,
    intentTab: params.intentTab || 'sniper',
  });
  if (params.navigate !== false && typeof window !== 'undefined') {
    const view = params.intentTab === 'mm' || params.intentTab === 'volume' ? 'bots' : 'pumpfun-sniper';
    window.dispatchEvent(new CustomEvent('sealevel-navigate', { detail: view }));
  }
  return next;
}

export function utcDay(ts = Date.now()): string {
  return new Date(ts).toISOString().slice(0, 10);
}

export function addDailyLoss(sol: number): number {
  const s = read();
  const day = utcDay();
  const base = s.dailyLossDay === day ? s.dailyLossSol || 0 : 0;
  const next = base + Math.max(0, sol);
  write({ ...s, dailyLossSol: next, dailyLossDay: day });
  return next;
}

export function getDailyLoss(): number {
  const s = read();
  return s.dailyLossDay === utcDay() ? s.dailyLossSol || 0 : 0;
}
