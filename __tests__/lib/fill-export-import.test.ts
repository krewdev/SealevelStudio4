import { PublicKey } from '@solana/web3.js';
import {
  amountsFromFill,
  fillFromParsedMeta,
} from '../../app/lib/bots/fill-from-chain';
import { exportDraftToTypeScript } from '../../app/lib/tx/export-typescript';
import { mapParsedIxToBuilt, mapParsedMessageToBuiltInstructions } from '../../app/lib/transaction-importer';
import { patchPaperTrade, pushPaperTrade, listPaperTrades, clearPaperTrades } from '../../app/lib/bots/trade-store';
import { getTemplateById } from '../../app/lib/instructions/templates';

const PAYER = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const DEST = 'DQWGg7KiL9cYzJSyL7pi8aN1nFGXjLLCtTVWCnk32Vq3';

describe('chain fill tape', () => {
  it('reads payer SOL + token deltas from parsed meta', () => {
    const fill = fillFromParsedMeta(
      {
        fee: 5000,
        preBalances: [2_000_000_000, 1_000_000_000],
        postBalances: [1_499_995_000, 1_500_000_000],
        preTokenBalances: [
          {
            accountIndex: 2,
            mint: MINT,
            owner: PAYER,
            uiTokenAmount: { amount: '0', decimals: 6, uiAmount: 0 },
          },
        ],
        postTokenBalances: [
          {
            accountIndex: 2,
            mint: MINT,
            owner: PAYER,
            uiTokenAmount: { amount: '2500000', decimals: 6, uiAmount: 2.5 },
          },
        ],
      },
      [PAYER, DEST],
      { payer: PAYER, mint: MINT, signature: 'sig111' }
    );
    expect(fill.solDelta).toBeCloseTo(-0.500005);
    expect(fill.tokenDeltaRaw).toBe(BigInt(2_500_000));
    expect(fill.tokenUi).toBeCloseTo(2.5);
    expect(fill.feeLamports).toBe(5000);

    const buy = amountsFromFill(fill, 'buy', { sol: 0.5, tokens: 0, price: 0 });
    expect(buy.settled).toBe(true);
    expect(buy.sol).toBeCloseTo(0.500005);
    expect(buy.tokens).toBe(2_500_000);
  });

  it('falls back when meta has no movement', () => {
    const fill = fillFromParsedMeta(
      { fee: 5000, preBalances: [1e9], postBalances: [1e9] },
      [PAYER],
      { payer: PAYER, mint: MINT }
    );
    const got = amountsFromFill(fill, 'buy', { sol: 0.02, tokens: 10, price: 500 });
    expect(got.settled).toBe(false);
    expect(got.sol).toBe(0.02);
    expect(got.tokens).toBe(10);
  });
});

describe('export typescript', () => {
  it('emits SystemProgram.transfer matching the draft that was simulated', () => {
    const template = getTemplateById('system_transfer')!;
    const code = exportDraftToTypeScript({
      draft: {
        instructions: [
          {
            template,
            accounts: { from: PAYER, to: DEST },
            args: { amount: 1_000_000_000 },
          },
        ],
      },
      payer: PAYER,
      sim: {
        diffs: [
          {
            address: PAYER,
            lamportsBefore: 2e9,
            lamportsAfter: 1e9,
            deltaLamports: -1e9,
            dataLenBefore: 0,
            dataLenAfter: 0,
            role: 'payer',
          },
        ],
        unitsConsumed: 450,
        logs: [],
      },
    });
    expect(code).toContain('SystemProgram.transfer');
    expect(code).toContain(DEST);
    expect(code).toContain("BigInt('1000000000')");
    expect(code).toContain('CU used: 450');
    expect(code).toContain('payer');
  });
});

describe('import sig → cards', () => {
  it('maps a parsed system transfer onto the same template the builder uses', () => {
    const ix = {
      programId: new PublicKey('11111111111111111111111111111111'),
      program: 'system',
      parsed: {
        type: 'transfer',
        info: { source: PAYER, destination: DEST, lamports: 42_000 },
      },
    } as any;
    const built = mapParsedIxToBuilt(ix, 'sigABC');
    expect(built?.template.id).toBe('system_transfer');
    expect(built?.accounts.from).toBe(PAYER);
    expect(built?.accounts.to).toBe(DEST);
    expect(built?.args.amount).toBe(42_000);
  });

  it('maps transferChecked and compiled custom ixs', () => {
    const checked = mapParsedIxToBuilt(
      {
        programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        program: 'spl-token',
        parsed: {
          type: 'transferChecked',
          info: {
            source: 'SrcAta11111111111111111111111111111111111',
            destination: 'DstAta11111111111111111111111111111111111',
            authority: PAYER,
            tokenAmount: { amount: '99', decimals: 6 },
          },
        },
      } as any,
      'sig'
    );
    expect(checked?.template.id).toBe('spl_token_transfer');
    expect(checked?.args.amount).toBe('99');

    const compiled = mapParsedMessageToBuiltInstructions(
      {
        accountKeys: [
          { pubkey: new PublicKey(PAYER), signer: true, writable: true },
          { pubkey: new PublicKey(DEST), signer: false, writable: true },
        ],
        instructions: [
          {
            programId: new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
            accounts: [new PublicKey(PAYER), new PublicKey(DEST)],
            data: '3Bxs4h24hBtQy9rw',
          } as any,
        ],
      },
      'JupSig111'
    );
    expect(compiled).toHaveLength(1);
    expect(compiled[0]!.template.id).toBe('custom_instruction');
    expect(compiled[0]!.template.programId.startsWith('JUP')).toBe(true);
    expect(compiled[0]!.accounts['Account 1']).toBe(PAYER);
  });
});

describe('trade store patch', () => {
  beforeEach(() => clearPaperTrades());

  it('patches a live row after chain settle', () => {
    const row = pushPaperTrade({
      mint: MINT,
      side: 'buy',
      sol: 0.05,
      tokens: 0,
      price: 0,
      bot: 'mm',
      pattern: 'inventory-mm:jupiter',
      live: true,
      signature: 'sig',
    });
    patchPaperTrade(row.id, { sol: 0.041, tokens: 12, settled: true, feeSol: 0.000005 });
    const listed = listPaperTrades(MINT);
    expect(listed[0]!.settled).toBe(true);
    expect(listed[0]!.sol).toBeCloseTo(0.041);
  });
});
