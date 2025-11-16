# Merkle Tree Setup Guide

## Beta Tester Merkle Tree Configuration

This guide explains how to set up the merkle tree for beta tester attestations in the VeriSol protocol.

## Overview

The VeriSol protocol uses compressed NFTs (cNFTs) stored in a Merkle tree for efficient on-chain storage. Each attestation type (e.g., beta tester) can have its own dedicated merkle tree.

## Prerequisites

1. **Solana CLI** (for on-chain operations)
2. **Metaplex Bubblegum Program** (for cNFT minting)
3. **VeriSol Program** deployed (Program ID: `mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6`)

## Merkle Tree Setup

### Step 1: Create Merkle Tree

You can create a merkle tree using Metaplex's Bubblegum program. There are several ways to do this:

#### Option A: Using Metaplex CLI

```bash
# Install Metaplex CLI if not already installed
npm install -g @metaplex-foundation/cli

# Create a new merkle tree
metaplex create-tree \
  --keypair ~/.config/solana/id.json \
  --rpc-url https://api.mainnet-beta.solana.com \
  --max-depth 14 \
  --max-buffer-size 64
```

#### Option B: Using Solana Program

You can also create the tree programmatically using the Metaplex Bubblegum SDK:

```typescript
import { createTree } from '@metaplex-foundation/mpl-bubblegum';
import { Keypair } from '@solana/web3.js';

const merkleTree = Keypair.generate();
const treeAuthority = deriveTreeAuthority(merkleTree.publicKey);

await createTree(connection, {
  tree: merkleTree,
  treeAuthority,
  maxDepth: 14,
  maxBufferSize: 64,
});
```

### Step 2: Get Tree Authority

The tree authority is a Program Derived Address (PDA) derived from the merkle tree address:

```typescript
import { PublicKey } from '@solana/web3.js';
import { BUBBLEGUM_PROGRAM_ID } from '@metaplex-foundation/mpl-bubblegum';

function deriveTreeAuthority(merkleTree: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );
  return pda;
}
```

### Step 3: Configure Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# Beta Tester Merkle Tree (dedicated tree for beta tester attestations)
NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE=<your_merkle_tree_address>

# Optional: Beta Tester Collection ID (for filtering cNFTs)
NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID=<your_collection_id>

# General VeriSol Configuration (if not using dedicated tree)
NEXT_PUBLIC_VERISOL_MERKLE_TREE=<general_merkle_tree_address>
NEXT_PUBLIC_VERISOL_TREE_AUTHORITY=<tree_authority_address>

# VeriSol Program IDs
NEXT_PUBLIC_VERISOL_PROGRAM_ID=mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6
NEXT_PUBLIC_VERISOL_BUBBLEGUM_PROGRAM_ID=BGUMAp9Gq7iTEuizy4pqaxsTyUCbk68f37Gc5o4tBzLb
NEXT_PUBLIC_VERISOL_COMPRESSION_PROGRAM_ID=cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK
NEXT_PUBLIC_VERISOL_LOG_WRAPPER=noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV
```

### Step 4: Verify Configuration

The system will automatically check if the merkle tree is configured:

```typescript
import { checkVeriSolSetup } from '@/app/lib/verisol';

const status = await checkVeriSolSetup(connection);
if (status.ready) {
  console.log('Merkle tree is ready!');
} else {
  console.error('Setup errors:', status.errors);
}
```

## Tree Configuration Options

### Dedicated Tree (Recommended)

For beta tester attestations, use a dedicated merkle tree:
- **Advantage**: Isolated tree for easier querying and management
- **Configuration**: Set `NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE`
- **Querying**: API endpoint `/api/verisol/beta-tester/check` filters by this tree

### Shared Tree

Use the general VeriSol merkle tree:
- **Advantage**: Single tree for all attestation types
- **Configuration**: Set `NEXT_PUBLIC_VERISOL_MERKLE_TREE`
- **Querying**: API endpoint `/api/verisol/check` queries all cNFTs

## Collection ID (Optional)

If you want to organize beta tester cNFTs into a collection:

1. Create a Metaplex collection
2. Set `NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID`
3. The API will filter cNFTs by collection ID

## Tree Parameters

### Recommended Settings

- **Max Depth**: 14-20 (allows for 2^14 to 2^20 leaves)
- **Max Buffer Size**: 64 (number of concurrent updates)

### Depth vs Capacity

| Depth | Max Leaves | Use Case |
|-------|-----------|----------|
| 14    | 16,384    | Small beta program |
| 16    | 65,536    | Medium beta program |
| 20    | 1,048,576 | Large-scale program |

## On-Chain Verification

The merkle tree is verified on-chain when minting attestations:

```typescript
await program.methods
  .verifyAndMint(proofBytes, publicInputBytes)
  .accounts({
    payer: wallet.publicKey,
    merkleTree: merkleTreePublicKey,
    treeAuthority: treeAuthorityPublicKey,
    // ... other accounts
  })
  .rpc();
```

## Querying cNFTs

### Using Helius DAS API (Recommended)

The system uses Helius DAS API to query cNFTs directly:

```typescript
// Query by tree
const response = await fetch(heliusUrl, {
  method: 'POST',
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'getAssetsByOwner',
    params: {
      ownerAddress: walletAddress,
      tree: merkleTreeAddress, // Filter by tree
    },
  }),
});
```

### Using Transaction History (Fallback)

If DAS API is unavailable, the system scans transaction history:

```typescript
const signatures = await connection.getSignaturesForAddress(walletPubkey);
// Look for VeriSol + Bubblegum program interactions
```

## Testing

### Test on Devnet

1. Create merkle tree on devnet:
```bash
metaplex create-tree \
  --keypair ~/.config/solana/devnet-keypair.json \
  --rpc-url https://api.devnet.solana.com \
  --max-depth 14
```

2. Set environment variables for devnet
3. Test minting an attestation
4. Verify cNFT appears in wallet

### Verify Setup

```typescript
import { checkVeriSolSetup, getBetaTesterMerkleTree } from '@/app/lib/verisol';

// Check if tree is configured
const tree = getBetaTesterMerkleTree();
if (tree) {
  console.log('Beta tester tree:', tree.toString());
} else {
  console.log('Beta tester tree not configured');
}

// Check full setup
const status = await checkVeriSolSetup(connection);
console.log('Setup status:', status);
```

## Troubleshooting

### Tree Not Found

**Error**: `Merkle tree not configured`

**Solution**:
1. Verify environment variable is set: `echo $NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE`
2. Check `.env.local` file exists and is loaded
3. Restart Next.js dev server after adding env vars

### Tree Authority Mismatch

**Error**: `Invalid tree authority`

**Solution**:
1. Verify tree authority is correctly derived
2. Check that tree was created with correct program ID
3. Ensure `NEXT_PUBLIC_VERISOL_TREE_AUTHORITY` matches derived authority

### cNFT Not Appearing

**Issue**: Attestation minted but cNFT not visible

**Solutions**:
1. Wait a few seconds for indexing
2. Check Helius DAS API is configured
3. Verify merkle tree address is correct
4. Check transaction signature for errors

## Production Deployment

### Mainnet Setup

1. **Create Tree on Mainnet**:
   ```bash
   metaplex create-tree \
     --keypair ~/.config/solana/mainnet-keypair.json \
     --rpc-url https://api.mainnet-beta.solana.com \
     --max-depth 16
   ```

2. **Set Environment Variables** in Vercel/deplyment platform:
   - `NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE`
   - `NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID` (optional)

3. **Verify Setup** before going live

4. **Monitor** tree capacity and create new tree if needed

### Security Considerations

- **Tree Authority**: Keep tree authority secure (it's a PDA, but verify derivation)
- **Capacity**: Monitor tree depth and plan for expansion
- **Backup**: Store merkle tree address and configuration securely

## Next Steps

1. ✅ Create merkle tree (on devnet for testing)
2. ✅ Configure environment variables
3. ✅ Test minting an attestation
4. ✅ Verify cNFT appears in wallet
5. ⏳ Deploy to mainnet (when ready)

## References

- [Metaplex Bubblegum Documentation](https://developers.metaplex.com/bubblegum)
- [Compressed NFTs Guide](https://docs.solana.com/developing/programming-model/compressed-nfts)
- [VeriSol Protocol README](../README_VERISOL.md)

