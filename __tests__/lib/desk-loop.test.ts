import { buildCandles } from '../../app/lib/bots/candles';
import { getPattern } from '../../app/lib/bots/patterns';
import {
  rankOpportunity,
  sortOpportunitiesByQuoteQuality,
} from '../../app/lib/arbitrage/quote-verify';
import type { ArbitrageOpportunity } from '../../app/lib/pools/types';
import { CLIENT_TOOL_NAMES } from '../../app/lib/ai/grok-tools';

function opp(partial: Partial<ArbitrageOpportunity>): ArbitrageOpportunity {
  return {
    id: 'x',
    path: { type: 'simple', steps: [], startToken: {} as any, endToken: {} as any, totalHops: 2 },
    type: 'simple',
    profit: 0,
    profitPercent: 0,
    inputAmount: BigInt(0),
    outputAmount: BigInt(0),
    gasEstimate: 0,
    netProfit: 0,
    confidence: 0.5,
    steps: [],
    timestamp: new Date(),
    ...partial,
  };
}

describe('desk loop unit tests', () => {
  it('builds OHLC candles from paper fills', () => {
    const trades = [
      { id: 'a', ts: 1_000, mint: 'DEMO', side: 'buy' as const, sol: 0.1, tokens: 1, price: 1, bot: 'volume' as const, pattern: 'volume-tight' },
      { id: 'b', ts: 1_200, mint: 'DEMO', side: 'sell' as const, sol: 0.2, tokens: 1, price: 1.2, bot: 'volume' as const, pattern: 'volume-tight' },
      { id: 'c', ts: 9_000, mint: 'DEMO', side: 'buy' as const, sol: 0.05, tokens: 1, price: 0.9, bot: 'volume' as const, pattern: 'volume-tight' },
    ];
    const candles = buildCandles(trades, 5000);
    expect(candles.length).toBe(2);
    expect(candles[0]!.open).toBe(1);
    expect(candles[0]!.high).toBe(1.2);
    expect(candles[0]!.low).toBe(1);
    expect(candles[0]!.close).toBe(1.2);
    expect(candles[0]!.buys).toBe(1);
    expect(candles[0]!.sells).toBe(1);
    expect(candles[1]!.close).toBe(0.9);
  });

  it('returns empty candles for no trades', () => {
    expect(buildCandles([])).toEqual([]);
  });

  it('resolves known paper patterns', () => {
    expect(getPattern('inventory-mm').kind).toBe('mm');
    expect(getPattern('volume-tight').phases.length).toBeGreaterThan(0);
  });

  it('ranks quote_verified profitable opps first', () => {
    const verified = opp({ id: 'v', accuracy: 'quote_verified', netProfit: 0.02 });
    const stale = opp({
      id: 's',
      accuracy: 'heuristic',
      netProfit: 9,
      warnings: ['Jupiter round-trip is currently unprofitable'],
    });
    const heuristic = opp({ id: 'h', accuracy: 'heuristic', netProfit: 0.5 });
    const sorted = sortOpportunitiesByQuoteQuality([stale, heuristic, verified]);
    expect(sorted.map((o) => o.id)).toEqual(['v', 'h', 's']);
    expect(rankOpportunity(verified)).toBeGreaterThan(rankOpportunity(heuristic));
  });

  it('never treats execute_built_arb or arm_sniper as server-side tools', () => {
    expect(CLIENT_TOOL_NAMES.has('execute_built_arb')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('arm_sniper')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('start_paper_bot')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('jupiter_quote')).toBe(false);
  });
});
