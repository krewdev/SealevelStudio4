import type { ArbitrageOpportunity } from '../pools/types';

const KEY = 'sealevel-arb-pending-build';

function replacer(_key: string, value: unknown): unknown {
  if (typeof value === 'bigint') return { __bigint: value.toString() };
  return value;
}

function reviver(key: string, value: unknown): unknown {
  if (value && typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.__bigint === 'string' && Object.keys(rec).length === 1) {
      return BigInt(rec.__bigint);
    }
  }
  if ((key === 'timestamp' || key === 'expiresAt') && typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return value;
}

export function setPendingArbOpportunity(opportunity: ArbitrageOpportunity): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(opportunity, replacer));
  } catch (err) {
    console.warn('[arb] failed to persist pending opportunity', err);
  }
}

export function peekPendingArbOpportunity(): ArbitrageOpportunity | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw, reviver) as ArbitrageOpportunity;
  } catch {
    return null;
  }
}

export function consumePendingArbOpportunity(): ArbitrageOpportunity | null {
  const opp = peekPendingArbOpportunity();
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(KEY);
  }
  return opp;
}
