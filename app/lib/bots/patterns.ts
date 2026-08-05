export type BotPatternId =
  | 'volume-tight'
  | 'volume-wide'
  | 'wash-chop'
  | 'buy-drip'
  | 'buy-pump'
  | 'sell-drip'
  | 'shake-out'
  | 'organic'
  | 'inventory-mm';

export type PhaseSide = 'buy' | 'sell' | 'alt' | 'mostly-buy' | 'mostly-sell';

export type PatternPhase = {
  weight: number;
  side: PhaseSide;
  sizeMul: number;
  intervalMul: number;
  label: string;
};

export type BotPattern = {
  id: BotPatternId;
  label: string;
  description: string;
  kind: 'volume' | 'mm' | 'directional';
  phases: PatternPhase[];
};

export const BOT_PATTERNS: BotPattern[] = [
  {
    id: 'volume-tight',
    label: 'Volume · tight',
    description: 'Fast small alternating buys/sells — dense tape.',
    kind: 'volume',
    phases: [{ weight: 1, side: 'alt', sizeMul: 0.7, intervalMul: 0.6, label: 'tight alt' }],
  },
  {
    id: 'volume-wide',
    label: 'Volume · wide',
    description: 'Slower larger alts — bigger wicks.',
    kind: 'volume',
    phases: [{ weight: 1, side: 'alt', sizeMul: 1.4, intervalMul: 1.2, label: 'wide alt' }],
  },
  {
    id: 'wash-chop',
    label: 'Chop',
    description: 'Random-ish two-way flow around mid.',
    kind: 'volume',
    phases: [{ weight: 1, side: 'alt', sizeMul: 1, intervalMul: 0.9, label: 'chop' }],
  },
  {
    id: 'buy-drip',
    label: 'Buy drip',
    description: 'Mostly small buys over time.',
    kind: 'directional',
    phases: [{ weight: 1, side: 'mostly-buy', sizeMul: 0.8, intervalMul: 1, label: 'drip' }],
  },
  {
    id: 'buy-pump',
    label: 'Buy pump',
    description: 'Accelerating buys then pause.',
    kind: 'directional',
    phases: [
      { weight: 0.7, side: 'buy', sizeMul: 1.3, intervalMul: 0.55, label: 'impulse' },
      { weight: 0.3, side: 'mostly-buy', sizeMul: 0.5, intervalMul: 1.4, label: 'cool' },
    ],
  },
  {
    id: 'sell-drip',
    label: 'Sell drip',
    description: 'Mostly small sells / distribution.',
    kind: 'directional',
    phases: [{ weight: 1, side: 'mostly-sell', sizeMul: 0.9, intervalMul: 1, label: 'distribute' }],
  },
  {
    id: 'shake-out',
    label: 'Shake-out',
    description: 'Dump then reclaim.',
    kind: 'directional',
    phases: [
      { weight: 0.35, side: 'sell', sizeMul: 1.6, intervalMul: 0.5, label: 'dump' },
      { weight: 0.65, side: 'mostly-buy', sizeMul: 1.1, intervalMul: 0.8, label: 'reclaim' },
    ],
  },
  {
    id: 'organic',
    label: 'Organic',
    description: 'Sparse mixed flow.',
    kind: 'volume',
    phases: [{ weight: 1, side: 'alt', sizeMul: 0.6, intervalMul: 1.8, label: 'sparse' }],
  },
  {
    id: 'inventory-mm',
    label: 'Inventory MM',
    description: 'Buy dips / sell rips around a rolling mid (single-wallet MM).',
    kind: 'mm',
    phases: [{ weight: 1, side: 'alt', sizeMul: 1, intervalMul: 1, label: 'inventory' }],
  },
];

export function getPattern(id: BotPatternId): BotPattern {
  return BOT_PATTERNS.find((p) => p.id === id) || BOT_PATTERNS[0]!;
}
