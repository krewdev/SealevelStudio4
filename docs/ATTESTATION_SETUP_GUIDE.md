# Attestation System Setup Guide

This guide will help you set up the attestation system correctly.

## Overview

The attestation system allows users to mint compressed NFTs (cNFTs) as proof of beta testing, presale participation, or other achievements. It uses a custom Anchor program deployed on Solana.

## Prerequisites

1. **Anchor CLI** installed: `cargo install --git https://github.com/coral-xyz/anchor avm && avm install latest && avm use latest`
2. **Solana CLI** installed: `sh -c "$(curl -sSfL https://release.solana.com/stable/install)"`
3. **Node.js** and npm installed
4. **Wallet** with SOL for deployment (devnet or mainnet)

## Step 1: Build the Attestation Program

```bash
cd programs/attestation-program
anchor build
```

This will:
- Compile the Rust program
- Generate the IDL file at `target/idl/sealevel_attestation.json`
- Generate the program keypair

## Step 2: Get Your Program ID

After building, get your program ID:

```bash
anchor keys list
```

Or check the `declare_id!` in `programs/attestation-program/src/lib.rs`

## Step 3: Deploy the Program

### For Devnet (Recommended for Testing):

```bash
# Set Solana CLI to devnet
solana config set --url devnet

# Airdrop SOL if needed
solana airdrop 2

# Deploy
anchor deploy --provider.cluster devnet
```

### For Mainnet:

```bash
# Set Solana CLI to mainnet
solana config set --url mainnet

# Deploy (requires real SOL)
anchor deploy --provider.cluster mainnet
```

## Step 4: Create a Merkle Tree

You need a Metaplex Bubblegum merkle tree for storing compressed NFTs.

### Option A: Use Metaplex CLI

```bash
# Install Metaplex CLI
npm install -g @metaplex-foundation/mpl-bubblegum-cli

# Create a merkle tree
metaplex create-tree \
  --rpc-url devnet \
  --keypair ~/.config/solana/id.json \
  --max-depth 14 \
  --max-buffer-size 64
```

### Option B: Use the Setup Script

```bash
npm run setup:merkle-tree
```

This will create a merkle tree and output the address.

## Step 5: Initialize the Registry

After deploying the program and creating a merkle tree, initialize the registry:

```typescript
// In your app or via API
const client = createAttestationClient(connection, wallet);
const merkleTree = new PublicKey('YOUR_MERKLE_TREE_ADDRESS');
await client.initialize(merkleTree);
```

## Step 6: Configure Environment Variables

Add to your `.env.local`:

```bash
# Custom Attestation Program ID (REQUIRED)
NEXT_PUBLIC_ATTESTATION_PROGRAM_ID=your_program_id_here

# Beta Tester Merkle Tree (REQUIRED for beta tester attestations)
NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE=your_merkle_tree_address_here

# Optional: General attestation merkle tree
NEXT_PUBLIC_VERISOL_MERKLE_TREE=your_merkle_tree_address_here
NEXT_PUBLIC_ATTESTATION_MERKLE_TREE=your_merkle_tree_address_here

# Optional: Collection ID for better organization
NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID=your_collection_id_here
```

## Step 7: Verify Setup

1. **Check Program Deployment:**
   ```bash
   solana program show YOUR_PROGRAM_ID --url devnet
   ```

2. **Check Merkle Tree:**
   ```bash
   solana account YOUR_MERKLE_TREE_ADDRESS --url devnet
   ```

3. **Use the Setup Check in UI:**
   - Navigate to the VeriSol Attestation page
   - Click "Check Setup"
   - Review any errors and fix them

## Common Issues and Solutions

### Issue: "IDL not found"

**Solution:**
1. Ensure the program is built: `anchor build`
2. Check that `programs/attestation-program/target/idl/sealevel_attestation.json` exists
3. If the IDL name is different, update the IDL path in `app/api/attestation/idl/route.ts`

### Issue: "Program not deployed"

**Solution:**
1. Deploy the program: `anchor deploy --provider.cluster devnet`
2. Verify deployment: `solana program show YOUR_PROGRAM_ID`
3. Update `NEXT_PUBLIC_ATTESTATION_PROGRAM_ID` in `.env.local`

### Issue: "Merkle tree not configured"

**Solution:**
1. Create a merkle tree (see Step 4)
2. Add `NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE` to `.env.local`
3. Restart your dev server

### Issue: "Registry not initialized"

**Solution:**
1. Call `client.initialize(merkleTree)` once
2. This only needs to be done once per program deployment
3. Use a wallet with authority to initialize

### Issue: "Insufficient usage"

**Solution:**
- Users need at least 10 feature uses to qualify for Bronze tier
- Check usage tracking is working: `useUsageTracking()` hook
- Verify usage is being saved to localStorage/backend

## Testing

1. **Test Program Deployment:**
   ```bash
   anchor test --skip-local-validator
   ```

2. **Test Minting:**
   - Use the VeriSol Attestation UI
   - Connect wallet
   - Ensure you have 10+ feature uses
   - Click "Create Attestation"

3. **Verify cNFT:**
   - Check Solscan for the transaction
   - Use Helius DAS API to query the cNFT
   - Verify it appears in wallet

## Production Checklist

- [ ] Program deployed to mainnet
- [ ] Merkle tree created on mainnet
- [ ] Registry initialized
- [ ] Environment variables set in production (Vercel/Railway)
- [ ] IDL file accessible (served via API route)
- [ ] Usage tracking working
- [ ] Error handling tested
- [ ] Rate limiting configured
- [ ] Monitoring set up

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check server logs for API errors
3. Verify all environment variables are set
4. Ensure the program is deployed and accessible
5. Check that the merkle tree exists on-chain


