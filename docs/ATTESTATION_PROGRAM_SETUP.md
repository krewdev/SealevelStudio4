# Attestation Program Setup Guide

This guide walks you through creating a custom Solana attestation program using Anchor.

## Prerequisites

1. **Install Anchor**:
```bash
# Install avm (Anchor Version Manager)
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install latest Anchor
avm install latest
avm use latest

# Verify installation
anchor --version
```

2. **Install Solana CLI**:
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

3. **Install Rust**:
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Step 1: Initialize Anchor Project

```bash
# Navigate to your project root
cd /Users/krewdev/SealevelStudio-3

# Create Anchor project in a subdirectory
anchor init programs/attestation-program
cd programs/attestation-program
```

## Step 2: Program Structure

The program will be located at:
- `programs/attestation-program/src/lib.rs` - Main program logic
- `programs/attestation-program/Cargo.toml` - Rust dependencies

## Step 3: Update Dependencies

Edit `programs/attestation-program/Cargo.toml`:

```toml
[package]
name = "attestation-program"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib", "lib"]
name = "attestation_program"

[features]
no-entrypoint = []
no-idl = []
no-log-ix-name = []
cpi = ["no-entrypoint"]
default = []

[dependencies]
anchor-lang = "0.29.0"
anchor-spl = "0.29.0"
```

## Step 4: Build and Deploy

```bash
# Build the program
anchor build

# Get your program ID
anchor keys list

# Update Anchor.toml with your program ID
# Then deploy to devnet
anchor deploy --provider.cluster devnet

# Or deploy to mainnet (be careful!)
anchor deploy --provider.cluster mainnet
```

## Step 5: Generate TypeScript Types

After building, generate the IDL:

```bash
anchor idl parse -f programs/attestation-program/src/lib.rs -o target/idl/attestation_program.json
```

Then copy the IDL to your app:

```bash
cp target/idl/attestation_program.json ../../app/lib/attestation/
```

## Integration with Frontend

Once deployed, use the TypeScript client in `app/lib/attestation/client.ts` to interact with your program.

## Next Steps

1. Implement ZK proof verification (see ZK_CIRCUIT_SETUP.md)
2. Set up Bubblegum merkle tree (see MERKLE_TREE_SETUP.md)
3. Write tests in `tests/attestation-program.ts`
4. Deploy to mainnet

