import { buildCandles } from '../../app/lib/bots/candles';
import { getPattern } from '../../app/lib/bots/patterns';
import {
  rankOpportunity,
  sortOpportunitiesByQuoteQuality,
} from '../../app/lib/arbitrage/quote-verify';
import type { ArbitrageOpportunity } from '../../app/lib/pools/types';
import { CLIENT_TOOL_NAMES } from '../../app/lib/ai/grok-tools';
import { HIGHLIGHT_ONLY_TARGETS, SAFE_CLICK_TARGETS } from '../../app/lib/ai/page-actions';
import { isLivePatternAllowed } from '../../app/lib/bots/live-engine';
import { formatLamportsDelta, formatTokenDelta, parseSplTokenMeta } from '../../app/lib/tx/state-diff';
import { pnlFromTrades } from '../../app/lib/bots/position';
import { bondingCurvePda, PUMP_PROGRAM_ID } from '../../app/lib/pumpfun/curve-buy';
import { PublicKey } from '@solana/web3.js';

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

  it('blocks wash/volume patterns from live mode', () => {
    expect(isLivePatternAllowed('inventory-mm')).toBe(true);
    expect(isLivePatternAllowed('buy-drip')).toBe(true);
    expect(isLivePatternAllowed('sell-drip')).toBe(true);
    expect(isLivePatternAllowed('volume-tight')).toBe(false);
    expect(isLivePatternAllowed('wash-chop')).toBe(false);
    expect(isLivePatternAllowed('buy-pump')).toBe(false);
    expect(isLivePatternAllowed('shake-out')).toBe(false);
  });

  it('parses SPL token account amount and formats token deltas', () => {
    const buf = Buffer.alloc(72);
    const mint = Buffer.alloc(32, 1);
    mint.copy(buf, 0);
    buf.writeBigUInt64LE(BigInt(1_500), 64);
    const meta = parseSplTokenMeta(buf);
    expect(meta?.amount).toBe(BigInt(1500));
    expect(formatTokenDelta('42')).toBe('+42');
    expect(formatTokenDelta('-7')).toBe('-7');
  });

  it('formats lamport deltas and tape PnL', () => {
    expect(formatLamportsDelta(1_000_000_000)).toBe('+1.000000 SOL');
    expect(formatLamportsDelta(-500_000_000)).toBe('-0.500000 SOL');
    const pnl = pnlFromTrades([
      { id: '1', ts: 1, mint: 'm', side: 'buy', sol: 0.02, tokens: 1, price: 1, bot: 'mm', pattern: 'x', live: true },
      { id: '2', ts: 2, mint: 'm', side: 'sell', sol: 0.025, tokens: 1, price: 1, bot: 'mm', pattern: 'x', live: true },
    ]);
    expect(pnl.realizedSol).toBeCloseTo(0.005);
    expect(pnl.liveTrades).toBe(2);
  });

  it('derives pump bonding-curve PDA on the known program', () => {
    const mint = new PublicKey('11111111111111111111111111111111');
    const pda = bondingCurvePda(mint);
    expect(pda.toBase58()).not.toBe(mint.toBase58());
    expect(PUMP_PROGRAM_ID.toBase58().startsWith('6EF8')).toBe(true);
  });

  it('never treats execute_built_arb or arm_sniper as server-side tools', () => {
    expect(CLIENT_TOOL_NAMES.has('execute_built_arb')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('arm_sniper')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('start_paper_bot')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('disarm_all')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('get_desk_session')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('click_ui')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('highlight_ui')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('start_quote_replay')).toBe(true);
    expect(CLIENT_TOOL_NAMES.has('jupiter_quote')).toBe(false);
  });

  it('treats confirm-live as highlight-only, not a safe click', () => {
    expect(HIGHLIGHT_ONLY_TARGETS.has('desk-confirm-live')).toBe(true);
    expect(SAFE_CLICK_TARGETS.has('desk-confirm-live')).toBe(false);
    expect(HIGHLIGHT_ONLY_TARGETS.has('desk-start-live')).toBe(true);
    expect(HIGHLIGHT_ONLY_TARGETS.has('firewall-override')).toBe(true);
    expect(HIGHLIGHT_ONLY_TARGETS.has('handshake-create')).toBe(true);
  });
});
