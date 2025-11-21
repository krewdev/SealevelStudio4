# Fixing Anchor Build Error: `build-sbf` not found

## Problem
When running `anchor build`, you get:
```
error: no such command: `build-sbf`
```

## Solution

The `cargo build-sbf` command is part of Solana's platform tools. You need to install the Solana platform tools.

### Option 1: Install via Solana Installer (Recommended)

1. **Install Solana CLI tools** (if not already installed):
   ```bash
   sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
   ```

2. **Add to your PATH** (add to `~/.zshrc` or `~/.bashrc`):
   ```bash
   export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
   ```

3. **Install platform tools**:
   ```bash
   solana-install init
   ```

4. **Verify installation**:
   ```bash
   cargo build-sbf --version
   ```

### Option 2: Use Platform Tools Directly

If Solana is installed via Homebrew (macOS):

```bash
# Check Solana installation
which solana

# Install platform tools
solana-install init

# Or manually add to PATH
export PATH="/opt/homebrew/bin:$PATH"
```

### Option 3: Use Docker (Alternative)

If you can't install the build tools locally, you can use Anchor's Docker setup:

```bash
# Build using Docker
docker run --rm -v "$(pwd)":/workspace -w /workspace projectserum/build:v0.32.1 anchor build
```

### Option 4: Skip Build for Now (IDL Generation Only)

If you just need to generate the IDL for Solscan metadata:

```bash
# Generate IDL without building
anchor idl build
```

This will create the IDL file with proper metadata even without building the program.

## After Installing build-sbf

Once `cargo build-sbf` is available:

```bash
cd programs/attestation-program
anchor build
```

This will:
1. Build the program
2. Generate the IDL with "Sealevel Studios" metadata
3. Create the program binary

## Verify Installation

```bash
# Check cargo build-sbf
cargo build-sbf --version

# Check Anchor
anchor --version

# Check Solana
solana --version
```

All should return version numbers without errors.

