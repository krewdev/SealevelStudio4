#!/usr/bin/env ts-node
/**
 * Devnet integration tests for the Solana Transaction Builder.
 *
 * These tests execute real transactions against the selected cluster (default: devnet)
 * to verify that core instruction templates behave end-to-end:
 *   1. System transfer
 *   2. SPL token mint creation + initial mint
 *   3. Associated token account creation for a recipient
 *   4. SPL token transfer between accounts
 *
 * Usage:
 *   ts-node scripts/devnet-transaction-tests.ts
 *   ts-node scripts/devnet-transaction-tests.ts --keypair ~/.config/solana/devnet.json
 *   ts-node scripts/devnet-transaction-tests.ts --network devnet --rpc-url https://api.devnet.solana.com
 *   ts-node scripts/devnet-transaction-tests.ts --min-balance 2 --skip-airdrop
 *
 * You can also run it via npm:
 *   npm run test:devnet-tx -- --keypair ~/.config/solana/devnet.json
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Signer,
  Transaction
} from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { TransactionBuilder } from '../app/lib/transaction-builder';
import { getTemplateById } from '../app/lib/instructions/templates';
import { BuiltInstruction, TransactionDraft } from '../app/lib/instructions/types';

type NetworkOption = 'devnet' | 'mainnet' | 'testnet';

interface CLIOptions {
  network: NetworkOption;
  rpcUrl: string;
  keypairPath: string;
  minBalanceSol: number;
  skipAirdrop: boolean;
  dryRun: boolean;
}

interface TokenDeployment {
  mint: Keypair;
  ownerAta: PublicKey;
}

interface TestContext {
  connection: Connection;
  builder: TransactionBuilder;
  payer: Keypair;
  recipient: Keypair;
  network: NetworkOption;
  tokenDeployment?: TokenDeployment;
  recipientAta?: PublicKey;
}

interface PreparedDraft {
  draft: TransactionDraft;
  extraSigners?: Signer[];
}

interface TxTest {
  id: string;
  description: string;
  prepare: (ctx: TestContext) => Promise<PreparedDraft>;
  beforeSend?: (ctx: TestContext, tx: Transaction) => Promise<void>;
  afterSend?: (ctx: TestContext, signature: string) => Promise<void>;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);

  // Handle help flag early
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Transaction Builder Devnet Tests

Usage:
  npm run test:devnet-tx [options]

Options:
  --network <network>     Network to use (devnet, mainnet, testnet) [default: devnet]
  --rpc-url <url>         RPC endpoint URL
  --keypair <path>        Path to keypair file [default: ~/.config/solana/id.json]
  --min-balance <amount>  Minimum SOL balance required [default: 2]
  --skip-airdrop          Skip airdrop if balance is insufficient
  --dry-run               Validate setup without executing transactions
  --help, -h              Show this help message

Examples:
  npm run test:devnet-tx --dry-run
  npm run test:devnet-tx
  npm run test:devnet-tx --keypair ~/.config/solana/devnet.json
  npm run test:devnet-tx --network mainnet --skip-airdrop
  npm run test:devnet-tx --rpc-url https://api.devnet.solana.com
`);
    process.exit(0);
  }

  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const networkArg = getArg('--network');
  const network: NetworkOption =
    networkArg === 'mainnet' || networkArg === 'testnet' ? (networkArg as NetworkOption) : 'devnet';

  const keypairPath =
    getArg('--keypair') ||
    process.env.SOLANA_KEYPAIR ||
    path.join(os.homedir(), '.config', 'solana', 'id.json');

  const rpcUrl =
    getArg('--rpc-url') ||
    (network === 'mainnet'
      ? process.env.SOLANA_MAINNET_RPC || 'https://api.mainnet-beta.solana.com'
      : network === 'testnet'
      ? process.env.SOLANA_TESTNET_RPC || 'https://api.testnet.solana.com'
      : process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com');

  const minBalanceArg = getArg('--min-balance');
  const minBalanceSol = minBalanceArg ? Number(minBalanceArg) : 2; // default 2 SOL buffer

  return {
    network,
    rpcUrl,
    keypairPath,
    minBalanceSol,
    skipAirdrop: args.includes('--skip-airdrop'),
    dryRun: args.includes('--dry-run')
  };
}

function loadKeypair(filePath: string): Keypair {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Keypair file not found at ${filePath}`);
  }
  const secret = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function ensureBalance(
  connection: Connection,
  payer: Keypair,
  minBalanceSol: number,
  network: NetworkOption,
  skipAirdrop: boolean
): Promise<void> {
  const lamports = await connection.getBalance(payer.publicKey);
  const balanceSol = lamports / LAMPORTS_PER_SOL;
  console.log(`🔍 Current balance: ${balanceSol.toFixed(4)} SOL`);

  if (balanceSol >= minBalanceSol) {
    return;
  }

  if (network !== 'devnet') {
    throw new Error(
      `Balance ${balanceSol.toFixed(4)} SOL is below required ${minBalanceSol} SOL and airdrops are only supported on devnet.`
    );
  }

  if (skipAirdrop) {
    throw new Error(
      `Balance ${balanceSol.toFixed(
        4
      )} SOL is below required ${minBalanceSol} SOL. Fund the wallet or rerun without --skip-airdrop.`
    );
  }

  const neededLamports = Math.ceil((minBalanceSol - balanceSol) * LAMPORTS_PER_SOL);
  const requestLamports = Math.max(neededLamports, LAMPORTS_PER_SOL);
  console.log(`💧 Requesting devnet airdrop of ${(requestLamports / LAMPORTS_PER_SOL).toFixed(2)} SOL...`);
  const signature = await connection.requestAirdrop(payer.publicKey, requestLamports);
  await connection.confirmTransaction(signature, 'confirmed');
  console.log(`   Airdrop signature: ${signature}`);
}

function expectTemplate(id: string) {
  const template = getTemplateById(id);
  if (!template) {
    throw new Error(`Instruction template "${id}" not found`);
  }
  return template;
}

function mergeSigners(...groups: (Signer[] | undefined)[]): Signer[] {
  const seen = new Set<string>();
  const merged: Signer[] = [];
  for (const group of groups) {
    if (!group) continue;
    for (const signer of group) {
      const key = signer.publicKey.toBase58();
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(signer);
      }
    }
  }
  return merged;
}

const tests: TxTest[] = [
  {
    id: 'system-transfer',
    description: 'Transfers 0.01 SOL from the payer to a generated recipient',
    prepare: async (ctx) => {
      const template = expectTemplate('system_transfer');
      const lamports = Math.floor(0.01 * LAMPORTS_PER_SOL);
      const built: BuiltInstruction = {
        template,
        accounts: {
          from: ctx.payer.publicKey.toBase58(),
          to: ctx.recipient.publicKey.toBase58()
        },
        args: { amount: lamports }
      };

      return {
        draft: {
          instructions: [built],
          memo: 'Transaction Builder devnet test: system transfer'
        }
      };
    },
    afterSend: async (ctx, signature) => {
      const recipientBalance = await ctx.connection.getBalance(ctx.recipient.publicKey);
      console.log(
        `   Recipient ${ctx.recipient.publicKey.toBase58()} balance: ${(
          recipientBalance / LAMPORTS_PER_SOL
        ).toFixed(4)} SOL`
      );
      logExplorerLink(signature, ctx.network);
    }
  },
  {
    id: 'create-token-mint',
    description: 'Creates a new SPL mint, ATA, and mints initial supply to the payer',
    prepare: async (ctx) => {
      const template = expectTemplate('spl_token_create_mint');
      const built: BuiltInstruction = {
        template,
        accounts: {
          payer: ctx.payer.publicKey.toBase58(),
          tokenAccountOwner: ctx.payer.publicKey.toBase58()
        },
        args: {
          _operation: 'create_token_and_mint',
          decimals: 9,
          initialSupply: BigInt(2_000_000_000), // 2 tokens with 9 decimals
          tokenName: `Builder Devnet ${Date.now()}`,
          tokenSymbol: 'BLDR',
          enableFreeze: true,
          freezeInitialAccount: false,
          supplyCap: BigInt(10_000_000_000)
        }
      };

      return { draft: { instructions: [built] } };
    },
    beforeSend: async (ctx, tx) => {
      const additional = (tx as any)._additionalSigners as Keypair[] | undefined;
      if (!additional?.length) {
        throw new Error('Expected mint keypair in additional signers');
      }
      const mintKeypair = additional[0];
      const ownerAta = await getAssociatedTokenAddress(mintKeypair.publicKey, ctx.payer.publicKey);
      ctx.tokenDeployment = { mint: mintKeypair, ownerAta };
      console.log(`   Mint (temp): ${mintKeypair.publicKey.toBase58()}`);
      console.log(`   Owner ATA: ${ownerAta.toBase58()}`);
    },
    afterSend: async (ctx, signature) => {
      logExplorerLink(signature, ctx.network);
      if (!ctx.tokenDeployment) return;
      const balance = await ctx.connection.getTokenAccountBalance(ctx.tokenDeployment.ownerAta).catch(() => null);
      if (balance) {
        console.log(`   Owner ATA balance: ${balance.value.uiAmountString} tokens`);
      }
    }
  },
  {
    id: 'create-recipient-ata',
    description: 'Creates an associated token account for the recipient wallet',
    prepare: async (ctx) => {
      if (!ctx.tokenDeployment) {
        throw new Error('Token mint must be created before creating recipient ATA');
      }
      const template = expectTemplate('spl_ata_create');
      const recipientAta = await getAssociatedTokenAddress(
        ctx.tokenDeployment.mint.publicKey,
        ctx.recipient.publicKey
      );
      ctx.recipientAta = recipientAta;

      const built: BuiltInstruction = {
        template,
        accounts: {
          funding: ctx.payer.publicKey.toBase58(),
          associatedToken: recipientAta.toBase58(),
          wallet: ctx.recipient.publicKey.toBase58(),
          mint: ctx.tokenDeployment.mint.publicKey.toBase58()
        },
        args: {}
      };

      return { draft: { instructions: [built] } };
    },
    afterSend: async (ctx, signature) => {
      if (ctx.recipientAta) {
        console.log(`   Recipient ATA: ${ctx.recipientAta.toBase58()}`);
      }
      logExplorerLink(signature, ctx.network);
    }
  },
  {
    id: 'spl-token-transfer',
    description: 'Transfers newly minted tokens from payer ATA to recipient ATA',
    prepare: async (ctx) => {
      if (!ctx.tokenDeployment || !ctx.recipientAta) {
        throw new Error('Mint and recipient ATA must be initialized before transferring tokens');
      }
      const template = expectTemplate('spl_token_transfer');
      const amount = BigInt(500_000_000); // 0.5 tokens (assuming 9 decimals)

      const built: BuiltInstruction = {
        template,
        accounts: {
          source: ctx.tokenDeployment.ownerAta.toBase58(),
          destination: ctx.recipientAta.toBase58(),
          authority: ctx.payer.publicKey.toBase58()
        },
        args: { amount }
      };

      return {
        draft: {
          instructions: [built],
          memo: 'Transaction Builder devnet test: SPL token transfer'
        }
      };
    },
    afterSend: async (ctx, signature) => {
      if (!ctx.tokenDeployment || !ctx.recipientAta) {
        return;
      }
      const payerBalance = await ctx.connection
        .getTokenAccountBalance(ctx.tokenDeployment.ownerAta)
        .catch(() => null);
      const recipientBalance = await ctx.connection.getTokenAccountBalance(ctx.recipientAta).catch(() => null);
      if (payerBalance) {
        console.log(`   Payer ATA balance: ${payerBalance.value.uiAmountString}`);
      }
      if (recipientBalance) {
        console.log(`   Recipient ATA balance: ${recipientBalance.value.uiAmountString}`);
      }
      logExplorerLink(signature, ctx.network);
    }
  }
];

function logExplorerLink(signature: string, network: NetworkOption) {
  const clusterParam = network === 'mainnet' ? '' : `?cluster=${network}`;
  console.log(`   Explorer: https://explorer.solana.com/tx/${signature}${clusterParam}`);
}

async function runTests(ctx: TestContext) {
  for (const test of tests) {
    console.log(`\n▶️  ${test.id}: ${test.description}`);
    try {
      const prepared = await test.prepare(ctx);
      const transaction = await ctx.builder.buildTransaction(prepared.draft);
      await ctx.builder.prepareTransaction(transaction, ctx.payer.publicKey);

      if (test.beforeSend) {
        await test.beforeSend(ctx, transaction);
      }

      const additionalSigners = ((transaction as any)._additionalSigners || []) as Signer[];
      const signers = mergeSigners([ctx.payer], additionalSigners, prepared.extraSigners);
      const signature = await ctx.builder.signAndSendTransaction(transaction, signers);

      console.log(`   ✅ Signature: ${signature}`);
      if (test.afterSend) {
        await test.afterSend(ctx, signature);
      }
    } catch (error) {
      console.error(`   ❌ Test "${test.id}" failed:`, error);
      throw error;
    }
  }
}

async function main() {
  const options = parseArgs();
  console.log('🧪 Transaction Builder Devnet Tests');
  console.log('===================================');
  console.log(`Network : ${options.network}`);
  console.log(`RPC URL : ${options.rpcUrl}`);
  console.log(`Keypair : ${options.keypairPath}`);
  console.log(`Dry Run : ${options.dryRun ? 'Yes' : 'No'}`);
  console.log('');

  // Load keypair to validate it exists and is valid
  const payer = loadKeypair(options.keypairPath);
  console.log(`✅ Keypair loaded: ${payer.publicKey.toBase58()}`);

  // Validate that templates can be loaded
  console.log('✅ Validating instruction templates...');
  for (const test of tests) {
    expectTemplate(test.id === 'system-transfer' ? 'system_transfer' :
                   test.id === 'create-token-mint' ? 'spl_token_create_mint' :
                   test.id === 'create-recipient-ata' ? 'spl_ata_create' :
                   'spl_token_transfer');
  }
  console.log('✅ All templates validated');

  if (options.dryRun) {
    console.log('\n🔍 Dry run mode - no transactions executed');
    console.log('Tests that would run:');
    for (const test of tests) {
      console.log(`  • ${test.id}: ${test.description}`);
    }
    console.log('\n💡 Run without --dry-run to execute real transactions');
    return;
  }

  const connection = new Connection(options.rpcUrl, 'confirmed');
  await ensureBalance(connection, payer, options.minBalanceSol, options.network, options.skipAirdrop);

  const ctx: TestContext = {
    connection,
    builder: new TransactionBuilder(connection),
    payer,
    recipient: Keypair.generate(),
    network: options.network
  };

  await runTests(ctx);

  console.log('\n🎉 All transaction builder devnet tests completed successfully.');
  console.log(`Recipient wallet for reference: ${ctx.recipient.publicKey.toBase58()}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Transaction builder devnet tests failed:', error);
    process.exit(1);
  });
}

export { runTests };

