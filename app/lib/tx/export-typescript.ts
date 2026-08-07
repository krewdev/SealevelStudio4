import type { BuiltInstruction, TransactionDraft } from '../instructions/types';
import type { StateDiffResult } from './state-diff';

function amt(v: unknown): string {
  if (typeof v === 'bigint') return `BigInt('${v.toString()}')`;
  if (typeof v === 'number' && Number.isFinite(v)) return `BigInt('${Math.trunc(v)}')`;
  if (typeof v === 'string' && /^-?\d+$/.test(v.trim())) return `BigInt('${v.trim()}')`;
  return `BigInt('0')`;
}

function pk(v: string | undefined, fallback: string): string {
  const addr = (v || '').trim();
  if (!addr) return fallback;
  return `new PublicKey('${addr}')`;
}

function emitInstruction(ix: BuiltInstruction, i: number): { imports: string[]; body: string } {
  const imports: string[] = [];
  const n = i + 1;
  const id = ix.template.id;
  const a = ix.accounts;
  const args = ix.args || {};

  if (id === 'system_transfer') {
    imports.push("import { SystemProgram } from '@solana/web3.js';");
    return {
      imports,
      body: `  // ${n}. ${ix.template.name}
  tx.add(SystemProgram.transfer({
    fromPubkey: ${pk(a.from, 'payer')},
    toPubkey: ${pk(a.to, "new PublicKey('DESTINATION')")},
    lamports: ${amt(args.amount)},
  }));`,
    };
  }

  if (id === 'system_create_account') {
    imports.push("import { SystemProgram } from '@solana/web3.js';");
    return {
      imports,
      body: `  // ${n}. ${ix.template.name}
  tx.add(SystemProgram.createAccount({
    fromPubkey: ${pk(a.from, 'payer')},
    newAccountPubkey: ${pk(a.newAccount, "new PublicKey('NEW_ACCOUNT')")},
    lamports: await connection.getMinimumBalanceForRentExemption(${Number(args.space) || 0}),
    space: ${Number(args.space) || 0},
    programId: SystemProgram.programId,
  }));`,
    };
  }

  if (id === 'spl_token_transfer') {
    imports.push(
      "import { createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';"
    );
    return {
      imports,
      body: `  // ${n}. ${ix.template.name}
  tx.add(createTransferInstruction(
    ${pk(a.source, "new PublicKey('SOURCE_ATA')")},
    ${pk(a.destination, "new PublicKey('DEST_ATA')")},
    ${pk(a.authority, 'payer')},
    ${amt(args.amount)},
    [],
    TOKEN_PROGRAM_ID,
  ));`,
    };
  }

  if (id === 'spl_token_mint_to') {
    imports.push(
      "import { createMintToInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';"
    );
    return {
      imports,
      body: `  // ${n}. ${ix.template.name}
  tx.add(createMintToInstruction(
    ${pk(a.mint, "new PublicKey('MINT')")},
    ${pk(a.destination, "new PublicKey('DEST_ATA')")},
    ${pk(a.authority, 'payer')},
    ${amt(args.amount)},
    [],
    TOKEN_PROGRAM_ID,
  ));`,
    };
  }

  if (id === 'spl_token_burn') {
    imports.push(
      "import { createBurnInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';"
    );
    return {
      imports,
      body: `  // ${n}. ${ix.template.name}
  tx.add(createBurnInstruction(
    ${pk(a.source, "new PublicKey('SOURCE_ATA')")},
    ${pk(a.mint, "new PublicKey('MINT')")},
    ${pk(a.authority, 'payer')},
    ${amt(args.amount)},
    [],
    TOKEN_PROGRAM_ID,
  ));`,
    };
  }

  if (id === 'spl_ata_create') {
    imports.push(
      "import { createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';"
    );
    return {
      imports,
      body: `  // ${n}. ${ix.template.name}
  tx.add(createAssociatedTokenAccountInstruction(
    ${pk(a.funding || a.payer, 'payer')},
    ${pk(a.associatedToken, "new PublicKey('ATA')")},
    ${pk(a.wallet, 'payer')},
    ${pk(a.mint, "new PublicKey('MINT')")},
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  ));`,
    };
  }

  if (id === 'jupiter_swap') {
    return {
      imports,
      body: `  // ${n}. Jupiter swap — builder simulates a placeholder; live path uses /api/jupiter/swap
  // amount=${String(args.amount ?? '')} minOut=${String(args.minAmountOut ?? '')}
  // Fetch a quote + swap tx, then: tx = VersionedTransaction.deserialize(Buffer.from(swapTransaction, 'base64'))`,
    };
  }

  const programId = ix.template.programId || '';
  const keys = ix.template.accounts
    .map((acc) => {
      const addr = a[acc.name];
      if (!addr) return null;
      const writable = acc.type !== 'readonly';
      const signer = acc.type === 'signer';
      return `    { pubkey: new PublicKey('${addr}'), isSigner: ${signer}, isWritable: ${writable} },`;
    })
    .filter(Boolean)
    .join('\n');

  let dataExpr = 'Buffer.alloc(0)';
  if (typeof args.data === 'string' && args.data.length) {
    dataExpr = `Buffer.from('${args.data.replace(/'/g, "\\'")}', 'utf8') /* imported payload */`;
    if (/^[1-9A-HJ-NP-Za-km-z]+$/.test(args.data) && args.data.length > 8) {
      dataExpr = `bs58.decode('${args.data}')`;
    }
  }

  imports.push("import { TransactionInstruction } from '@solana/web3.js';");
  if (dataExpr.includes('bs58')) imports.push("import bs58 from 'bs58';");

  return {
    imports,
    body: `  // ${n}. ${ix.template.name} (${programId || 'custom'})
  tx.add(new TransactionInstruction({
    programId: new PublicKey('${programId || '11111111111111111111111111111111'}'),
    keys: [
${keys || '      // no accounts'}
    ],
    data: ${dataExpr},
  }));`,
  };
}

export function exportDraftToTypeScript(opts: {
  draft: TransactionDraft;
  payer?: string | null;
  sim?: StateDiffResult | null;
}): string {
  const instructions = opts.draft.instructions || [];
  const importSet = new Set<string>([
    "import { Connection, PublicKey, Transaction } from '@solana/web3.js';",
  ]);
  const bodies: string[] = [];

  instructions.forEach((ix, i) => {
    const emitted = emitInstruction(ix, i);
    emitted.imports.forEach((imp) => importSet.add(imp));
    bodies.push(emitted.body);
  });

  const payerLit = opts.payer ? `new PublicKey('${opts.payer}')` : 'wallet.publicKey';
  const simLines = opts.sim
    ? [
        ` * Simulated: ${opts.sim.err ? `FAILED ${opts.sim.err}` : 'OK'}`,
        opts.sim.unitsConsumed != null ? ` * CU used: ${opts.sim.unitsConsumed}` : '',
        opts.sim.diffs?.length
          ? ` * Account deltas: ${opts.sim.diffs
              .slice(0, 8)
              .map((d) => `${d.role === 'payer' ? 'payer ' : ''}${d.address.slice(0, 4)}… ${(d.deltaLamports / 1e9).toFixed(6)} SOL`)
              .join('; ')}`
          : '',
      ].filter(Boolean)
    : [' * Simulated: (run Build first for CU / diffs)'];

  return `${[...importSet].join('\n')}

/**
 * Sealevel Studio — export of the simulated builder tx
 * Instructions: ${instructions.length}
${simLines.join('\n')}
 * Memo / fee ixs added by TransactionBuilder are included at send time, not here.
 */
export async function buildSealevelTransaction(
  connection: Connection,
  wallet: { publicKey: PublicKey; signTransaction: (tx: Transaction) => Promise<Transaction> }
) {
  const payer = ${opts.payer ? payerLit : 'wallet.publicKey'};
  const tx = new Transaction();

${bodies.length ? bodies.join('\n\n') : '  // no instructions'}

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;

  const signed = await wallet.signTransaction(tx);
  const signature = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
  await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');
  return signature;
}
`;
}
