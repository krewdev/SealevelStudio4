import {
  consumePendingArbOpportunity,
  peekPendingArbOpportunity,
  setPendingArbOpportunity,
} from '../../app/lib/arbitrage/pending-build';
import type { ArbitrageOpportunity } from '../../app/lib/pools/types';

describe('pending arb sessionStorage', () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    (global as any).window = global;
    (global as any).sessionStorage = {
      getItem: (k: string) => (memory.has(k) ? memory.get(k)! : null),
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: (k: string) => {
        memory.delete(k);
      },
    };
  });

  it('round-trips bigint amounts and consumes once', () => {
    const opportunity = {
      id: 'arb-1',
      type: 'simple',
      inputAmount: BigInt(1_000_000),
      outputAmount: BigInt(1_010_000),
      netProfit: 0.01,
      steps: [],
      timestamp: new Date('2026-01-01T00:00:00.000Z'),
    } as unknown as ArbitrageOpportunity;

    setPendingArbOpportunity(opportunity);
    const peeked = peekPendingArbOpportunity();
    expect(peeked?.id).toBe('arb-1');
    expect(peeked?.inputAmount).toBe(BigInt(1_000_000));
    expect(peeked?.timestamp instanceof Date).toBe(true);

    const consumed = consumePendingArbOpportunity();
    expect(consumed?.id).toBe('arb-1');
    expect(peekPendingArbOpportunity()).toBeNull();
  });
});
