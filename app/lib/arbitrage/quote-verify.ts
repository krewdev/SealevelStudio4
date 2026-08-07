import type { ArbitrageOpportunity } from '../pools/types';

const JUPITER_QUOTE = 'https://lite-api.jup.ag/swap/v1/quote';

function timeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

async function quoteHop(inputMint: string, outputMint: string, amount: string, slippageBps = 75) {
  const url = `${JUPITER_QUOTE}?inputMint=${encodeURIComponent(inputMint)}&outputMint=${encodeURIComponent(outputMint)}&amount=${encodeURIComponent(amount)}&slippageBps=${slippageBps}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: timeoutSignal(4500),
  });
  if (!res.ok) throw new Error(`quote ${res.status}`);
  return res.json() as Promise<{ inAmount?: string; outAmount?: string }>;
}

export function rankOpportunity(o: ArbitrageOpportunity): number {
  if (o.accuracy === 'quote_verified' && (o.netProfit || 0) > 0) return 4;
  const jupDead = (o.warnings || []).some((w) => /unprofitable/i.test(w));
  if (jupDead) return 0;
  return 1;
}

export function sortOpportunitiesByQuoteQuality(opps: ArbitrageOpportunity[]): ArbitrageOpportunity[] {
  return [...opps].sort((a, b) => {
    const diff = rankOpportunity(b) - rankOpportunity(a);
    if (diff) return diff;
    return (b.netProfit || 0) - (a.netProfit || 0);
  });
}

export async function verifyOpportunitiesWithJupiter(
  opportunities: ArbitrageOpportunity[],
  limit = 12
): Promise<ArbitrageOpportunity[]> {
  const head = opportunities.slice(0, limit);
  const rest = opportunities.slice(limit);

  const verified = await Promise.all(
    head.map(async (opp) => {
      const steps = opp.steps?.length ? opp.steps : opp.path?.steps || [];
      if (steps.length < 2) return opp;
      try {
        let amount = steps[0]!.amountIn.toString();
        for (const step of steps) {
          const q = await quoteHop(step.tokenIn.mint, step.tokenOut.mint, amount);
          amount = String(q.outAmount || '0');
        }
        const inAmt = BigInt(steps[0]!.amountIn.toString());
        const outAmt = BigInt(amount || '0');
        const profitRaw = outAmt - inAmt;
        const decimals = steps[0]!.tokenIn.decimals || 9;
        const profit = Number(profitRaw) / Math.pow(10, decimals);
        const profitPercent = Number(inAmt) > 0 ? (Number(profitRaw) / Number(inAmt)) * 100 : 0;
        const warnings = [...(opp.warnings || [])];

        if (profitRaw > BigInt(0)) {
          return {
            ...opp,
            profit,
            profitPercent,
            netProfit: profit,
            outputAmount: outAmt,
            accuracy: 'quote_verified' as const,
            confidence: Math.min(0.92, Math.max(opp.confidence, 0.55) + 0.2),
            warnings: [
              ...warnings.filter((w) => !/heuristic|synthetic/i.test(w)),
              'Live Jupiter round-trip quote is profitable (aggregator route, not locked pool IDs).',
            ],
          };
        }

        return {
          ...opp,
          profit,
          profitPercent,
          netProfit: profit,
          outputAmount: outAmt,
          accuracy: 'heuristic' as const,
          confidence: Math.min(opp.confidence, 0.22),
          warnings: [
            ...warnings,
            'Jupiter round-trip is currently unprofitable — scanner edge is likely stale/synthetic.',
          ],
        };
      } catch (err) {
        return {
          ...opp,
          warnings: [
            ...(opp.warnings || []),
            `Quote verify failed: ${err instanceof Error ? err.message : String(err)}`,
          ],
        };
      }
    })
  );

  return sortOpportunitiesByQuoteQuality([...verified, ...rest]);
}
