# SEAL Presale Scripts

Scripts for managing the SEAL presale program.

## Setup

Install dependencies:
```bash
cd programs/seal-presale
yarn install
```

## Scripts

### 1. Create SEAL Token Mint

Creates the SEAL token mint and funds the treasury.

```bash
anchor run create-seal-token
```

**What it does:**
- Creates SEAL token mint with 9 decimals
- Creates treasury token account
- Mints 500M SEAL tokens to treasury
- Outputs addresses for use in initialization

**Output:**
```
SEAL_MINT_ADDRESS=<address>
TREASURY_TOKEN_ACCOUNT=<address>
```

**Save these addresses!** You'll need them for initialization.

---

### 2. Initialize Presale

Initializes the presale with all parameters.

```bash
# Set environment variables first
export SEAL_MINT=<mint_address_from_step_1>
export TREASURY_TOKEN=<token_account_from_step_1>

# Then initialize
anchor run initialize
```

**Or use the addresses directly:**
```bash
SEAL_MINT=<address> TREASURY_TOKEN=<address> anchor run initialize
```

**What it does:**
- Creates presale state PDA
- Sets all presale parameters
- Configures time windows, limits, pricing
- Makes presale active

---

### 3. Contribute

Test a contribution to the presale.

```bash
# Contribute 1 SOL (default)
anchor run contribute

# Contribute custom amount
SOL_AMOUNT=2 anchor run contribute
```

**What it does:**
- Sends SOL to treasury
- Receives SEAL tokens
- Updates presale state
- Shows contribution stats

---

### 4. View State

View current presale state and statistics.

```bash
anchor run view-state
```

**What it shows:**
- Presale configuration
- Financial stats (raised, cap, progress)
- Token stats (sold, remaining)
- Contributor count
- Your contribution (if any)
- Treasury balance

---

## Complete Workflow

```bash
# 1. Build the program
anchor build

# 2. Deploy to devnet
anchor deploy --provider.cluster devnet

# 3. Create SEAL token mint
anchor run create-seal-token
# Save the output addresses!

# 4. Initialize presale
export SEAL_MINT=<address_from_step_3>
export TREASURY_TOKEN=<address_from_step_3>
anchor run initialize

# 5. Test contribution
anchor run contribute

# 6. View state
anchor run view-state
```

## Environment Variables

You can set these in your shell or use them inline:

- `SEAL_MINT` - SEAL token mint address
- `TREASURY_TOKEN` - Treasury token account address
- `SOL_AMOUNT` - Amount to contribute (for contribute script)
- `AUTHORITY` - Authority address (for view-state, defaults to wallet)

## Troubleshooting

### "Account does not exist"
- Make sure you've initialized the presale first
- Check that you're using the correct authority address

### "Insufficient funds"
- Get devnet SOL: `solana airdrop 2 --url devnet`
- Check treasury has SEAL tokens

### "Presale not active"
- Check time window in presale state
- Verify `isActive` flag is true

---

**Note**: All scripts use the wallet configured in `Anchor.toml` (default: `~/.config/solana/id.json`)


