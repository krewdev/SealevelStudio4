#!/usr/bin/env ts-node
/**
 * Script to set up merkle tree for beta tester attestations
 * 
 * Usage:
 *   ts-node scripts/setup-merkle-tree.ts --network devnet
 *   ts-node scripts/setup-merkle-tree.ts --network mainnet
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';
import { createSignerFromKeypair, signerIdentity, generateSigner } from '@metaplex-foundation/umi';
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters';
import { createTree, mplBubblegum } from '@metaplex-foundation/mpl-bubblegum';

// Bubblegum Program ID (Metaplex)
const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCbk68f37Gc5o4tBzLb');

interface SetupOptions {
  network: 'devnet' | 'mainnet' | 'testnet';
  maxDepth?: number;
  maxBufferSize?: number;
  keypairPath?: string;
}

/**
 * Derive tree authority from merkle tree address
 */
function deriveTreeAuthority(merkleTree: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );
  return pda;
}

/**
 * Create merkle tree using Metaplex Bubblegum SDK
 */
async function createMerkleTree(
  connection: Connection,
  keypair: Keypair,
  options: SetupOptions
): Promise<{
  merkleTree: PublicKey;
  treeAuthority: PublicKey;
  signature: string;
}> {
  console.log('Setting up Metaplex UMI...');
  
  // Create UMI instance with Bubblegum plugin
  const umi = createUmi(connection.rpcEndpoint).use(mplBubblegum());
  
  // Convert keypair to UMI signer
  const umiKeypair = fromWeb3JsKeypair(keypair);
  const signer = createSignerFromKeypair(umi, umiKeypair);
  umi.use(signerIdentity(signer));
  
  // Generate merkle tree signer (UMI will handle keypair generation)
  console.log('Generating merkle tree keypair...');
  const merkleTree = generateSigner(umi);
  const merkleTreePublicKey = new PublicKey(merkleTree.publicKey);
  const treeAuthority = deriveTreeAuthority(merkleTreePublicKey);
  
  console.log(`Merkle Tree Address: ${merkleTreePublicKey.toString()}`);
  console.log(`Tree Authority: ${treeAuthority.toString()}`);
  console.log(`Max Depth: ${options.maxDepth || 14}`);
  console.log(`Max Buffer Size: ${options.maxBufferSize || 64}`);
  console.log('');
  console.log('Creating merkle tree on-chain (this may take a moment)...');
  
  // Create the tree
  const builder = await createTree(umi, {
    merkleTree,
    maxDepth: options.maxDepth || 14,
    maxBufferSize: options.maxBufferSize || 64,
    public: false, // Tree is not public (only creator can mint)
  });
  
  const result = await builder.sendAndConfirm(umi);
  
  const signature = result.signature.toString();
  console.log(`Transaction confirmed: ${signature}`);
  
  return {
    merkleTree: merkleTreePublicKey,
    treeAuthority,
    signature,
  };
}

/**
 * Main setup function
 */
async function main() {
  const args = process.argv.slice(2);
  const network = args.includes('--network') 
    ? args[args.indexOf('--network') + 1] as 'devnet' | 'mainnet' | 'testnet'
    : 'devnet';
  
  const maxDepth = args.includes('--max-depth')
    ? parseInt(args[args.indexOf('--max-depth') + 1])
    : 14;
  
  const maxBufferSize = args.includes('--max-buffer-size')
    ? parseInt(args[args.indexOf('--max-buffer-size') + 1])
    : 64;
  
  const keypairPath = args.includes('--keypair')
    ? args[args.indexOf('--keypair') + 1]
    : undefined;

  console.log('🌳 Merkle Tree Setup for Beta Tester Attestations');
  console.log('==================================================');
  console.log(`Network: ${network}`);
  console.log(`Max Depth: ${maxDepth}`);
  console.log(`Max Buffer Size: ${maxBufferSize}`);
  console.log('');

  // Get RPC URL
  const rpcUrl = network === 'mainnet'
    ? 'https://api.mainnet-beta.solana.com'
    : network === 'testnet'
    ? 'https://api.testnet.solana.com'
    : 'https://api.devnet.solana.com';

  const connection = new Connection(rpcUrl, 'confirmed');

  // Load keypair
  let keypair: Keypair;
  if (keypairPath) {
    const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
  } else {
    console.log('⚠️  No keypair provided. Generating new keypair for demonstration.');
    console.log('   In production, use --keypair <path> to specify your keypair.');
    keypair = Keypair.generate();
  }

  try {
    // Check balance before creating tree
    const balance = await connection.getBalance(keypair.publicKey);
    const solBalance = balance / 1e9;
    
    console.log(`Payer: ${keypair.publicKey.toString()}`);
    console.log(`Balance: ${solBalance} SOL`);
    console.log('');
    
    if (solBalance < 0.1) {
      console.log('⚠️  Warning: Low balance. Creating a merkle tree requires ~0.1 SOL for rent.');
      if (network === 'devnet') {
        console.log('   You can airdrop SOL on devnet:');
        console.log(`   solana airdrop 2 ${keypair.publicKey.toString()} --url ${rpcUrl}`);
      }
      console.log('');
    }
    
    // Create merkle tree
    const { merkleTree, treeAuthority, signature } = await createMerkleTree(connection, keypair, {
      network,
      maxDepth,
      maxBufferSize,
      keypairPath,
    });

    console.log('');
    console.log('✅ Merkle Tree Created!');
    console.log('======================');
    console.log(`Merkle Tree: ${merkleTree.toString()}`);
    console.log(`Tree Authority: ${treeAuthority.toString()}`);
    console.log(`Transaction: ${signature}`);
    console.log('');

    // Generate environment variable file
    const envContent = `# Beta Tester Merkle Tree Configuration
# Generated on ${new Date().toISOString()}
# Network: ${network}

NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE=${merkleTree.toString()}
NEXT_PUBLIC_VERISOL_TREE_AUTHORITY=${treeAuthority.toString()}

# Optional: Collection ID (set after creating collection)
# NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID=<collection_id>
`;

    const envPath = path.join(process.cwd(), `.env.merkle-tree.${network}`);
    fs.writeFileSync(envPath, envContent);
    console.log(`📝 Environment variables saved to: ${envPath}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Copy these variables to your .env.local file');
    console.log('2. Restart your Next.js dev server');
    console.log('3. Test minting an attestation');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating merkle tree:', error);
    process.exit(1);
  }
}

// Run if executed directly
main().catch(console.error);

export { createMerkleTree, deriveTreeAuthority };

