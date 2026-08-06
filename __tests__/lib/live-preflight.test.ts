import { describe, it, expect } from '@jest/globals';
import { buildLivePreflightPlan, formatAge } from '../../app/lib/bots/live-preflight';

const base = {
  mint: 'So11111111111111111111111111111111111111112',
  pattern: 'inventory-mm',
  livePatternAllowed: true,
  maxSolPerTrade: 0.01,
  intervalMs: 12000,
  maxTrades: 8,
  signerSource: 'phantom' as const,
  signerAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
  canSignVersioned: true,
  disarmed: false,
  dailyLossSol: 0,
  walletSol: 1.2,
  replay: {
    mint: 'So11111111111111111111111111111111111111112',
    completedAt: 1_000_000,
    pnlSol: 0.002,
    trades: 5,
    seconds: 60,
    buys: 3,
    sells: 2,
  },
  venue: { kind: 'jupiter' as const, label: 'Jupiter (aggregated AMM)' },
  now: 1_000_000 + 90_000,
};

describe('live preflight plan', () => {
  it('formats ages', () => {
    expect(formatAge(12_000)).toBe('12s ago');
    expect(formatAge(180_000)).toBe('3m ago');
  });

  it('arms when phantom + fresh replay + jupiter venue', () => {
    const plan = buildLivePreflightPlan(base);
    expect(plan.canArm).toBe(true);
    expect(plan.blockers).toEqual([]);
    expect(plan.worstCaseSol).toBeCloseTo(0.08);
    expect(plan.replay?.stale).toBe(false);
    expect(plan.replay?.trades).toBe(5);
    expect(plan.venueKind).toBe('jupiter');
  });

  it('blocks DEMO mint, paper patterns, studio signer, and missing replay', () => {
    expect(buildLivePreflightPlan({ ...base, mint: 'DEMO' }).canArm).toBe(false);
    expect(buildLivePreflightPlan({ ...base, livePatternAllowed: false, pattern: 'wash-chop' }).blockers.join(' ')).toMatch(
      /paper-only/
    );
    expect(
      buildLivePreflightPlan({
        ...base,
        signerSource: 'studio',
        canSignVersioned: false,
        signerAddress: base.signerAddress,
      }).blockers.join(' ')
    ).toMatch(/Phantom/);
    expect(buildLivePreflightPlan({ ...base, replay: null }).blockers.join(' ')).toMatch(/replay/);
  });

  it('blocks stale replay and no venue', () => {
    const stale = buildLivePreflightPlan({
      ...base,
      now: base.replay.completedAt + 31 * 60 * 1000,
    });
    expect(stale.replay?.stale).toBe(true);
    expect(stale.canArm).toBe(false);

    const none = buildLivePreflightPlan({
      ...base,
      venue: { kind: 'none', label: 'No route', error: 'no path' },
    });
    expect(none.canArm).toBe(false);
    expect(none.blockers.join(' ')).toMatch(/no path/i);
  });

  it('warns on negative replay PnL and pump-curve venue, waits on pending venue', () => {
    const neg = buildLivePreflightPlan({
      ...base,
      replay: { ...base.replay, pnlSol: -0.004 },
    });
    expect(neg.canArm).toBe(true);
    expect(neg.warnings.some((w) => w.includes('-0.0040'))).toBe(true);

    const curve = buildLivePreflightPlan({
      ...base,
      venue: { kind: 'pump-curve', label: 'Pump.fun bonding curve' },
    });
    expect(curve.canArm).toBe(true);
    expect(curve.warnings.join(' ')).toMatch(/bonding curve/i);

    const pending = buildLivePreflightPlan({
      ...base,
      venue: { kind: 'pending', label: 'Probing…' },
    });
    expect(pending.canArm).toBe(false);
    expect(pending.blockers).toEqual([]);
  });
});
