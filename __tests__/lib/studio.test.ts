import { getTemplateById } from '../../app/lib/instructions/templates';
import type { TransactionDraft } from '../../app/lib/instructions/types';
import {
  applyFailurePatch,
  buildCeremonyInstructions,
  ceremonyChecklist,
  CEREMONY_LAMPORTS,
  classifyBuiltTx,
  combinedDraft,
  computeTxDna,
  counterfactualFill,
  counterHandshake,
  createHandshake,
  decodeHandshake,
  deriveHandshakeStatus,
  encodeHandshake,
  evaluateFirewall,
  evaluateLiveCapability,
  flattenToTimeTravelSteps,
  forkDraftFromStep,
  headerBits,
  isHandshakeBlockhashStale,
  isVersionedRpcTx,
  jaccard,
  matchKnownShapes,
  projectAdversarialForks,
  suggestFailurePatches,
  summarizeWriteRadar,
  versionedLimitation,
  worstPayerDelta,
  DEFAULT_FIREWALL_POLICY,
} from '../../app/lib/studio';

const PAYER = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
const DEST = 'DQWGg7KiL9cYzJSyL7pi8aN1nFGXjLLCtTVWCnk32Vq3';

function transferDraft(amount = 1_000_000_000): TransactionDraft {
  return {
    instructions: [
      {
        template: getTemplateById('system_transfer')!,
        accounts: { from: PAYER, to: DEST },
        args: { amount },
      },
    ],
  };
}

describe('signing firewall', () => {
  it('blocks overspend, unknown programs, and failed sims', () => {
    const draft = transferDraft();
    const simOk = {
      diffs: [
        {
          address: PAYER,
          lamportsBefore: 2e9,
          lamportsAfter: 2e9 - 40_000_000,
          deltaLamports: -40_000_000,
          dataLenBefore: 0,
          dataLenAfter: 0,
          role: 'payer',
        },
      ],
      logs: [],
    };
    const ok = evaluateFirewall({
      policy: { ...DEFAULT_FIREWALL_POLICY, maxPayerSolSpend: 0.05 },
      sim: simOk,
      draft,
    });
    expect(ok.ok).toBe(true);

    const spend = evaluateFirewall({
      policy: { ...DEFAULT_FIREWALL_POLICY, maxPayerSolSpend: 0.01 },
      sim: simOk,
      draft,
    });
    expect(spend.ok).toBe(false);
    expect(spend.violations.some((v) => v.code === 'payer-spend')).toBe(true);

    const unknown = evaluateFirewall({
      policy: DEFAULT_FIREWALL_POLICY,
      sim: { diffs: [], logs: [] },
      extraPrograms: ['Evil111111111111111111111111111111111111111'],
    });
    expect(unknown.violations.some((v) => v.code === 'unknown-program')).toBe(true);

    const adv = evaluateFirewall({
      policy: { ...DEFAULT_FIREWALL_POLICY, maxPayerSolSpend: 0.05 },
      sim: simOk,
      draft,
      worstAdversaryDeltaSol: -0.09,
    });
    expect(adv.ok).toBe(false);
    expect(adv.violations.some((v) => v.code === 'adversary-spend')).toBe(true);

    const failed = evaluateFirewall({
      policy: DEFAULT_FIREWALL_POLICY,
      sim: { diffs: [], err: 'custom program error: 0x1', logs: [] },
      draft,
    });
    expect(failed.ok).toBe(false);
    expect(failed.violations.some((v) => v.code === 'sim-failed')).toBe(true);
  });
});

describe('tx dna', () => {
  it('fingerprints a transfer and flags drain-like shapes', () => {
    const dna = computeTxDna(transferDraft());
    expect(dna.shape).toBe('transfer');
    expect(dna.hash).toHaveLength(8);
    expect(matchKnownShapes(dna)[0]?.id).toBe('sys-transfer');

    const drain = computeTxDna({
      instructions: [
        {
          template: {
            id: 'custom_instruction',
            programId: 'Evil111111111111111111111111111111111111111',
            name: 'Mystery',
            description: '',
            category: 'custom',
            accounts: [
              { name: 'a', type: 'writable', description: '' },
              { name: 'b', type: 'writable', description: '' },
              { name: 'c', type: 'writable', description: '' },
              { name: 'd', type: 'writable', description: '' },
            ],
            args: [],
          },
          accounts: { a: PAYER, b: DEST, c: PAYER, d: DEST },
          args: {},
        },
        {
          template: getTemplateById('system_transfer')!,
          accounts: { from: PAYER, to: DEST },
          args: { amount: 1 },
        },
      ],
    });
    expect(drain.shape).toBe('suspicious');
    expect(jaccard(['a', 'b'], ['b', 'c'])).toBeCloseTo(1 / 3);
  });
});

describe('failure patches', () => {
  it('suggests ATA / mint mix-up and can clear the destination', () => {
    const draft: TransactionDraft = {
      instructions: [
        {
          template: getTemplateById('spl_token_transfer')!,
          accounts: { source: DEST, destination: DEST, authority: PAYER },
          args: { amount: 10, mint: DEST },
        },
      ],
    };
    // force mint==dest by naming
    draft.instructions[0]!.accounts.mint = DEST;
    draft.instructions[0]!.template.accounts.push({
      name: 'mint',
      type: 'readonly',
      description: 'mint',
    });
    const patches = suggestFailurePatches('AccountNotFound: could not find account', ['Error: ATA'], draft);
    expect(patches.some((p) => p.id === 'need-ata' || p.id.startsWith('mint-as-ata'))).toBe(true);
    const ata = patches.find((p) => p.apply.type === 'clear-account');
    if (ata) {
      const next = applyFailurePatch(draft, ata);
      expect(next.instructions[0]!.accounts[ata.apply.accountName!]).toBeUndefined();
    }
    const half = suggestFailurePatches('Transfer: insufficient lamports', [], transferDraft(100));
    const h = half.find((p) => p.id === 'halve-transfer');
    expect(h).toBeTruthy();
    const next = applyFailurePatch(transferDraft(100), h!);
    expect(next.instructions[0]!.args.amount).toBe(50);
  });
});

describe('adversarial + counterfactual + radar', () => {
  it('projects worse forks and worst payer Δ', () => {
    const forks = projectAdversarialForks({
      diffs: [
        {
          address: PAYER,
          lamportsBefore: 1e9,
          lamportsAfter: 0.9e9,
          deltaLamports: -0.1e9,
          dataLenBefore: 0,
          dataLenAfter: 0,
          role: 'payer',
        },
      ],
      logs: [],
    });
    expect(forks.map((f) => f.id)).toEqual(['now', 'plus2', 'sandwich', 'fail-closed']);
    expect(worstPayerDelta(forks)!).toBeLessThan(-0.1);
  });

  it('splits quote vs chain vs sandwich vs wait', () => {
    const cf = counterfactualFill({ quoteSol: 0.05, chainSol: 0.041, feeSol: 0.000005 });
    expect(cf.slipSol).toBeCloseTo(0.009);
    expect(cf.sandwichSol).toBeLessThan(cf.chainSol);
    expect(cf.waitSol).toBeGreaterThan(cf.chainSol);
  });

  it('counts processed + near-head as collisions', () => {
    const report = summarizeWriteRadar(
      [PAYER],
      {
        [PAYER]: [
          { signature: 'aa', slot: 100, confirmationStatus: 'processed', blockTime: 1_000_000 },
          { signature: 'bb', slot: 99, confirmationStatus: 'confirmed', blockTime: 1_000_000 },
        ],
      },
      1_000_008 * 1000,
      100
    );
    expect(report.pending).toBe(1);
    expect(report.collisions).toBeGreaterThanOrEqual(2);
    expect(report.caveat.toLowerCase()).toMatch(/mempool/);
  });
});

describe('time-travel + handshake + capability', () => {
  it('flattens outer+inner and forks remaining outers', () => {
    const steps = flattenToTimeTravelSteps(
      {
        transaction: {
          message: {
            accountKeys: [{ pubkey: PAYER, signer: true, writable: true }],
            instructions: [
              {
                programId: { toBase58: () => '11111111111111111111111111111111' },
                program: 'system',
                parsed: { type: 'transfer', info: { source: PAYER, destination: DEST, lamports: 9 } },
              },
              {
                programId: { toBase58: () => 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' },
                accounts: [],
                data: '3Bxs',
              },
            ],
          },
        },
        meta: {
          innerInstructions: [
            {
              index: 1,
              instructions: [
                {
                  programId: { toBase58: () => 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                  program: 'spl-token',
                  parsed: {
                    type: 'transfer',
                    info: { source: DEST, destination: PAYER, authority: PAYER, amount: '1' },
                  },
                },
              ],
            },
          ],
        },
      } as any,
      'sig'
    );
    expect(steps.length).toBe(3);
    expect(steps[1]!.inner).toBe(false);
    expect(steps[2]!.inner).toBe(true);
    const forked = forkDraftFromStep(steps, 1);
    expect(forked.length).toBe(1);
    expect(forked[0]!.template.programId.startsWith('JUP')).toBe(true);
  });

  it('round-trips handshake blobs', () => {
    const offer = createHandshake({
      partyA: { address: PAYER, instructions: transferDraft().instructions },
      note: 'otc',
    });
    const countered = counterHandshake(offer, {
      address: DEST,
      instructions: transferDraft(5).instructions,
    });
    const again = decodeHandshake(encodeHandshake(countered));
    expect(deriveHandshakeStatus(again)).toBe('ready');
    expect(combinedDraft(again).instructions).toHaveLength(2);
  });

  it('classifies message header signer/writable bits like Solana runtime', () => {
    const header = {
      numRequiredSignatures: 1,
      numReadonlySignedAccounts: 0,
      numReadonlyUnsignedAccounts: 2,
    };
    expect(headerBits(0, 4, header)).toEqual({ isSigner: true, isWritable: true });
    expect(headerBits(1, 4, header)).toEqual({ isSigner: false, isWritable: true });
    expect(headerBits(2, 4, header)).toEqual({ isSigner: false, isWritable: false });
    expect(headerBits(3, 4, header)).toEqual({ isSigner: false, isWritable: false });
  });

  it('classifies versioned vs legacy and explains the limit', () => {
    expect(classifyBuiltTx(null)).toBe('none');
    expect(versionedLimitation('versioned') || '').toMatch(/versioned/i);
    expect(isVersionedRpcTx({ transaction: { message: { staticAccountKeys: ['a'] } } })).toBe(true);
    expect(isVersionedRpcTx({ transaction: { message: { accountKeys: ['a'] } } })).toBe(false);
  });

  it('detects expired handshake blockhash vs lastValidBlockHeight', () => {
    expect(isHandshakeBlockhashStale({ blockhash: 'x', lastValidBlockHeight: 100 }, 90).stale).toBe(false);
    expect(isHandshakeBlockhashStale({ blockhash: 'x', lastValidBlockHeight: 100 }, 101).stale).toBe(true);
    expect(isHandshakeBlockhashStale({}, 1).reason).toBe('not-prepared');
  });

  it('builds a 0.001 SOL ceremony and tracks checklist', () => {
    const { a, b } = buildCeremonyInstructions(PAYER, DEST);
    expect(a[0]!.args.amount).toBe(CEREMONY_LAMPORTS);
    expect(b[0]!.args.amount).toBe(1);
    const offer = createHandshake({
      partyA: { address: PAYER, instructions: a },
      partyB: { address: DEST, instructions: b },
    });
    const steps = ceremonyChecklist(offer, PAYER);
    expect(steps.find((s) => s.id === 'phantom')?.done).toBe(true);
    expect(steps.find((s) => s.id === 'counterparty')?.done).toBe(true);
    expect(steps.find((s) => s.id === 'landed')?.done).toBe(false);
  });

  it('binds live to phantom + ack + replay + firewall', () => {
    const cap = evaluateLiveCapability({
      signerSource: 'phantom',
      canSignVersioned: true,
      disarmed: false,
      patternAllowed: true,
      replayOk: true,
      riskAck: true,
      riskAckAt: 1_000,
      dailyLossSol: 0,
      dailyLossCap: 0.08,
      firewall: { ok: true, violations: [], payerDeltaSol: -0.01, programs: [], writable: [] },
      now: 2_000,
    });
    expect(cap.ok).toBe(true);

    const blocked = evaluateLiveCapability({
      signerSource: 'studio',
      canSignVersioned: false,
      disarmed: false,
      patternAllowed: true,
      replayOk: false,
      riskAck: false,
      dailyLossSol: 0.09,
      dailyLossCap: 0.08,
      requireAttestation: true,
      attestationOk: false,
      now: 2_000,
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.blockers.length).toBeGreaterThanOrEqual(4);
  });
});
