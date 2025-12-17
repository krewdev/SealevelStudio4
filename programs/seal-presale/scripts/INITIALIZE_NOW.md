# Initialize Presale - Quick Guide

Since you've already created the SEAL token mint, follow these steps:

## Step 1: Get Your Addresses

If you saved them from `create-seal-token`, you should have:
- `SEAL_MINT_ADDRESS` - The SEAL token mint address
- `TREASURY_TOKEN_ACCOUNT` - The treasury token account address

If you don't have them, you can find them by checking your recent transactions or running:

```bash
# Check your token accounts
spl-token accounts
```

## Step 2: Set Environment Variables

```bash
export SEAL_MINT=<your_mint_address>
export TREASURY_TOKEN=<your_treasury_token_account>
```

Example:
```bash
export SEAL_MINT=jNYs5JdWy3269qk4QvPwt2c5FPMyQePLhpu3Fognd99
export TREASURY_TOKEN=<your_token_account_address>
```

## Step 3: Build the Program (if not done)

```bash
cd /Users/krewdev/SealevelStudio4
anchor build
```

## Step 4: Initialize the Presale

```bash
cd programs/seal-presale
anchor run initialize
```

## What Happens

The initialization script will:
- Create the presale state PDA
- Set presale parameters (5 months duration, 10K SOL cap, etc.)
- Configure pricing (0.00002 SOL per SEAL)
- Activate the presale

## Verify Initialization

After initialization, check the state:

```bash
anchor run view-state
```

This will show you:
- Presale configuration
- Time windows
- Financial stats
- Token stats

---

**Next Steps After Initialization:**
1. Test a contribution: `anchor run contribute`
2. View state: `anchor run view-state`
3. Integrate with frontend (see migration plan)


