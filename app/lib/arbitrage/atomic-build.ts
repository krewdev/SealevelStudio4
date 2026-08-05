import {
  AddressLookupTableAccount,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import type { ArbitrageOpportunity, ArbitrageStep } from '../pools/types';
import type { BuiltInstruction } from '../instructions/types';

export interface VisualArbStep {
  index: number;
  label: string;
  dex: string;
  poolAddress?: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  amountOut: string;
}

export interface AtomicArbBuildResult {
  transaction: VersionedTransaction;
  visualSteps: VisualArbStep[];
  instructions: BuiltInstruction[];
  quoteOutAmount: string;
  quoteInAmount: string;
  expectedProfitRaw: bigint;
  profitableAfterQuotes: boolean;
  simulationOk: boolean;
  simulationLogs: string[];
  unitsConsumed?: number;
  warnings: string[];
  hops: { inMint: string; outMint: string; inAmount: string; outAmount: string }[];
}

interface JupiterIx {
  programId: string;
  accounts: { pubkey: string; isSigner: boolean; isWritable: boolean }[];
  data: string;
}

function toIx(raw: JupiterIx): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(raw.programId),
    keys: (raw.accounts || []).map((a) => ({
      pubkey: new PublicKey(a.pubkey),
      isSigner: a.isSigner,
      isWritable: a.isWritable,
    })),
    data: Buffer.from(raw.data, 'base64'),
  });
}

function formatAmount(raw: bigint | string | number, decimals: number): string {
  const n = typeof raw === 'bigint' ? Number(raw) : Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return (n / Math.pow(10, decimals)).toPrecision(6);
}

async function jupiterQuote(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps: number;
}): Promise<any> {
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: params.amount,
    slippageBps: String(params.slippageBps),
  });
  const res = await fetch(`/api/jupiter/quote?${qs.toString()}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Jupiter quote failed');
  return data;
}

async function jupiterSwapInstructions(quoteResponse: any, userPublicKey: string): Promise<any> {
  const res = await fetch('/api/jupiter/swap-instructions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey,
      wrapAndUnwrapSol: true,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.details || 'swap-instructions failed');
  return data;
}

function hopMints(opportunity: ArbitrageOpportunity): { inMint: string; outMint: string; amount: string; decimalsIn: number; decimalsOut: number; symbolIn: string; symbolOut: string }[] {
  const steps = opportunity.steps?.length ? opportunity.steps : opportunity.path?.steps || [];
  return steps.map((step: ArbitrageStep) => ({
    inMint: step.tokenIn.mint,
    outMint: step.tokenOut.mint,
    amount: step.amountIn.toString(),
    decimalsIn: step.tokenIn.decimals,
    decimalsOut: step.tokenOut.decimals,
    symbolIn: step.tokenIn.symbol,
    symbolOut: step.tokenOut.symbol,
  }));
}

export function opportunityToVisualSteps(opportunity: ArbitrageOpportunity): VisualArbStep[] {
  const steps = opportunity.steps?.length ? opportunity.steps : opportunity.path?.steps || [];
  return steps.map((step, index) => ({
    index: index + 1,
    label: `Hop ${index + 1}: ${step.tokenIn.symbol} → ${step.tokenOut.symbol}`,
    dex: String(step.dex),
    poolAddress: step.pool?.poolAddress,
    tokenIn: step.tokenIn.symbol,
    tokenOut: step.tokenOut.symbol,
    amountIn: formatAmount(step.amountIn, step.tokenIn.decimals),
    amountOut: formatAmount(step.amountOut, step.tokenOut.decimals),
  }));
}

export function opportunityToBuiltInstructions(opportunity: ArbitrageOpportunity): BuiltInstruction[] {
  const steps = opportunity.steps?.length ? opportunity.steps : opportunity.path?.steps || [];
  return steps.map((step, index) => ({
    template: {
      id: `arb-hop-${index + 1}`,
      programId: step.pool?.programId || 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
      name: `Arb hop ${index + 1}: ${step.tokenIn.symbol}→${step.tokenOut.symbol} (${step.dex})`,
      description: `Atomic leg ${index + 1} on ${step.dex}${step.pool?.poolAddress ? ` pool ${step.pool.poolAddress.slice(0, 8)}…` : ''}`,
      category: 'defi',
      accounts: [
        {
          name: 'user',
          type: 'signer',
          description: 'Fee payer / swapper',
        },
        {
          name: 'pool',
          type: 'writable',
          description: 'DEX pool',
          pubkey: step.pool?.poolAddress,
        },
      ],
      args: [
        { name: 'amountIn', type: 'u64', description: 'Input amount (raw)' },
        { name: 'minAmountOut', type: 'u64', description: 'Min out with slippage' },
        { name: 'dex', type: 'string', description: 'Venue' },
      ],
    },
    accounts: {
      pool: step.pool?.poolAddress || '',
    },
    args: {
      amountIn: step.amountIn.toString(),
      minAmountOut: step.amountOut.toString(),
      dex: step.dex,
    },
  }));
}

const JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
];

export async function buildAtomicArbTransaction(params: {
  opportunity: ArbitrageOpportunity;
  userPublicKey: string;
  connection: Connection;
  slippageBps?: number;
  jitoTipLamports?: number;
}): Promise<AtomicArbBuildResult> {
  const { opportunity, userPublicKey, connection } = params;
  const slippageBps = params.slippageBps ?? 75;
  const jitoTipLamports = params.jitoTipLamports ?? 0;
  const warnings: string[] = [...(opportunity.warnings || [])];
  const hops = hopMints(opportunity);

  if (hops.length < 2) {
    throw new Error('Opportunity needs at least 2 hops for atomic arbitrage');
  }

  // Live Jupiter quotes (aggregator). This re-prices the path; scanner pool IDs are hints.
  warnings.push(
    'Live execution uses Jupiter routing (best path), not a locked Raydium/Orca pool pair. Scanner PnL is a heuristic lead.'
  );

  let currentAmount = hops[0]!.amount;
  const quotes: any[] = [];
  const hopSummaries: AtomicArbBuildResult['hops'] = [];

  for (let i = 0; i < hops.length; i++) {
    const hop = hops[i]!;
    const quote = await jupiterQuote({
      inputMint: hop.inMint,
      outputMint: hop.outMint,
      amount: i === 0 ? hop.amount : currentAmount,
      slippageBps,
    });
    if (quote?.error) {
      throw new Error(`Jupiter quote hop ${i + 1} failed: ${quote.error}`);
    }
    if (!quote?.outAmount) {
      throw new Error(`Jupiter quote hop ${i + 1} returned no outAmount`);
    }
    quotes.push(quote);
    currentAmount = String(quote.outAmount || quote.otherAmountThreshold || '0');
    hopSummaries.push({
      inMint: hop.inMint,
      outMint: hop.outMint,
      inAmount: String(quote.inAmount || hop.amount),
      outAmount: currentAmount,
    });
  }

  const inAmount = BigInt(quotes[0].inAmount || hops[0]!.amount);
  const outAmount = BigInt(quotes[quotes.length - 1].outAmount || '0');
  const expectedProfitRaw = outAmount - inAmount;
  const profitableAfterQuotes = expectedProfitRaw > BigInt(0);

  if (!profitableAfterQuotes) {
    warnings.push('Jupiter round-trip is not profitable at current quotes (scanner estimate was stale or synthetic).');
  }

  const ixSets = [];
  for (const quote of quotes) {
    ixSets.push(await jupiterSwapInstructions(quote, userPublicKey));
  }

  const allIxs: TransactionInstruction[] = [];
  const altAddresses = new Set<string>();

  // Single compute budget from first hop
  for (const raw of ixSets[0]?.computeBudgetInstructions || []) {
    allIxs.push(toIx(raw));
  }

  for (const set of ixSets) {
    for (const raw of set.setupInstructions || []) allIxs.push(toIx(raw));
    if (set.swapInstruction) allIxs.push(toIx(set.swapInstruction));
    if (set.cleanupInstruction) allIxs.push(toIx(set.cleanupInstruction));
    for (const alt of set.addressLookupTableAddresses || []) altAddresses.add(alt);
  }

  if (jitoTipLamports > 0) {
    const tip = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)]!;
    allIxs.push(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(userPublicKey),
        toPubkey: new PublicKey(tip),
        lamports: jitoTipLamports,
      })
    );
    warnings.push(`Included Jito tip ${jitoTipLamports} lamports → ${tip.slice(0, 6)}…`);
  }

  const lookupTables: AddressLookupTableAccount[] = [];
  for (const addr of altAddresses) {
    const res = await connection.getAddressLookupTable(new PublicKey(addr));
    if (res.value) lookupTables.push(res.value);
  }

  const payer = new PublicKey(userPublicKey);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: allIxs,
  }).compileToV0Message(lookupTables);

  const transaction = new VersionedTransaction(message);

  let simulationOk = false;
  let simulationLogs: string[] = [];
  let unitsConsumed: number | undefined;
  try {
    const sim = await connection.simulateTransaction(transaction, { sigVerify: false, replaceRecentBlockhash: true });
    simulationLogs = sim.value.logs || [];
    unitsConsumed = sim.value.unitsConsumed;
    simulationOk = !sim.value.err;
    if (!simulationOk) {
      warnings.push(`Simulation failed: ${JSON.stringify(sim.value.err)}`);
    }
  } catch (err) {
    warnings.push(`Simulation error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    transaction,
    visualSteps: opportunityToVisualSteps(opportunity),
    instructions: opportunityToBuiltInstructions(opportunity),
    quoteOutAmount: outAmount.toString(),
    quoteInAmount: inAmount.toString(),
    expectedProfitRaw,
    profitableAfterQuotes,
    simulationOk,
    simulationLogs,
    unitsConsumed,
    warnings,
    hops: hopSummaries,
  };
}
