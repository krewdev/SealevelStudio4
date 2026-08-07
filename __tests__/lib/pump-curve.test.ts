import { describe, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { bondingCurvePda, PUMP_PROGRAM_ID } from '../../app/lib/pumpfun/curve-buy';
import { PublicKey } from '@solana/web3.js';

describe('pump curve SDK path', () => {
  it('still derives the official pump bonding-curve PDA', () => {
    const mint = new PublicKey('11111111111111111111111111111111');
    const pda = bondingCurvePda(mint);
    expect(pda.toBase58()).not.toBe(mint.toBase58());
    expect(PUMP_PROGRAM_ID.toBase58().startsWith('6EF8')).toBe(true);
  });

  it('does not call pumpportal for curve assembly', () => {
    const root = path.join(__dirname, '../../app/lib/pumpfun');
    const src =
      fs.readFileSync(path.join(root, 'curve-buy.ts'), 'utf8') +
      fs.readFileSync(path.join(root, 'sdk-curve.ts'), 'utf8');
    expect(src).not.toMatch(/pumpportal/i);
    expect(src).toMatch(/@pump-fun\/pump-sdk/);
  });
});
