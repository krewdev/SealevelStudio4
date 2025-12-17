# Fixing Build Issues

## Issue 1: Anchor Version Mismatch ✅ FIXED

The root `package.json` had Anchor `^0.29.0` but CLI is `0.32.1`.

**Fixed:** Updated root `package.json` to use `@coral-xyz/anchor@^0.32.1`

Now run:
```bash
cd /Users/krewdev/SealevelStudio4
yarn install
```

## Issue 2: Missing `build-sbf` Command

The `build-sbf` command is needed to compile Solana programs. This is part of Solana's platform tools.

### Solution: Install Solana Platform Tools

**Option 1: Use Anchor's built-in build (Recommended)**

Anchor should handle this automatically. Try:
```bash
cd /Users/krewdev/SealevelStudio4
anchor build
```

**Option 2: Install platform tools manually**

If Anchor still can't find `build-sbf`, install it:

```bash
# Install Solana platform tools
cargo install --git https://github.com/solana-labs/solana.git --tag v1.18.20 cargo-build-sbf cargo-build-bpf

# Or use the Solana installer (if not already installed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

**Option 3: Use agave (Solana's new toolchain)**

```bash
# Install agave
cargo install --git https://github.com/anza-xyz/agave.git agave-install

# Install platform tools
agave-install init
```

### Verify Installation

```bash
which cargo-build-sbf
# Should show: /path/to/cargo-build-sbf

cargo-build-sbf --version
```

## Quick Fix Commands

```bash
# 1. Update Anchor in root
cd /Users/krewdev/SealevelStudio4
yarn add @coral-xyz/anchor@0.32.1

# 2. Try building
anchor build

# 3. If build-sbf still missing, install it
cargo install --git https://github.com/solana-labs/solana.git --tag v1.18.20 cargo-build-sbf
```

## Alternative: Use Anchor's Docker Build

If you have Docker, Anchor can use it for builds:

```bash
anchor build --docker
```

This bypasses the need for local platform tools.


