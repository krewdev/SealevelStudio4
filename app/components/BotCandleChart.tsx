'use client';

import React, { useMemo } from 'react';
import { buildCandles } from '../lib/bots/candles';
import type { PaperTrade } from '../lib/bots/trade-store';

export function BotCandleChart({ trades }: { trades: PaperTrade[] }) {
  const candles = useMemo(() => buildCandles(trades, 4000), [trades]);
  const width = 920;
  const height = 280;
  const pad = 16;
  if (candles.length === 0) {
    return (
      <div className="h-[280px] border border-slate-800 rounded-lg flex items-center justify-center text-slate-500 text-sm">
        Start a paper bot to print candles
      </div>
    );
  }
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const maxP = Math.max(...highs);
  const minP = Math.min(...lows);
  const span = Math.max(maxP - minP, maxP * 0.0001, 1e-18);
  const slot = (width - pad * 2) / candles.length;
  const y = (p: number) => pad + ((maxP - p) / span) * (height - pad * 2);

  return (
    <div className="border border-slate-800 rounded-lg bg-slate-900/40 overflow-hidden">
      <div className="px-3 py-2 text-xs text-slate-400 flex justify-between">
        <span>Pattern candles · {candles.length} bars</span>
        <span>
          last {candles[candles.length - 1]!.close.toExponential(3)} · vol{' '}
          {candles[candles.length - 1]!.volume.toFixed(3)}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[280px]">
        {candles.map((c, i) => {
          const x = pad + i * slot + slot / 2;
          const up = c.close >= c.open;
          const color = up ? '#34d399' : '#f87171';
          const top = y(Math.max(c.open, c.close));
          const bot = y(Math.min(c.open, c.close));
          const bodyH = Math.max(bot - top, 1.5);
          return (
            <g key={c.time}>
              <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} />
              <rect x={x - Math.max(slot * 0.28, 1.5)} y={top} width={Math.max(slot * 0.56, 3)} height={bodyH} fill={color} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
