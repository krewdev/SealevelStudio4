# Quick Initialization Guide

## You Already Have:
- ✅ SEAL Token Mint Created
- ✅ Mint Address: `jNYs5JdWy3269qk4QvPwt2c5FPMyQePLhpu3Fognd99`

## What You Need:
1. **Treasury Token Account Address** - The associated token account that holds the SEAL tokens

## Find Your Treasury Token Account

The treasury token account is the associated token account (ATA) for your wallet. You can calculate it or find it:

### Option 1: Calculate it (Recommended)
The treasury token account is the ATA for your wallet. You can get it by running:

```bash
# This will show your token accounts
spl-token accounts --url devnet
```

Look for the account that holds SEAL tokens (mint: `jNYs5JdWy3269qk4QvPwt2c5FPMyQePLhpu3Fognd99`)

### Option 2: Use the script output
If you saved the output from `create-seal-token`, it should have shown:
```
TREASURY_TOKEN_ACCOUNT=<address>
```

## Initialize Now

Once you have both addresses:

```bash
cd /Users/krewdev/SealevelStudio4/programs/seal-presale

# Set the addresses
export SEAL_MINT=jNYs5JdWy3269qk4QvPwt2c5FPMyQePLhpu3Fognd99
export TREASURY_TOKEN=<your_treasury_token_account_address>

# Make sure program is built
cd ../..
anchor build

# Initialize
cd programs/seal-presale
anchor run initialize
```

## Alternative: Let the script find it

If you want, I can update the initialize script to automatically find the treasury token account from the mint address. Would you like me to do that?

---

**Quick Command:**
```bash
# Replace <TREASURY_TOKEN> with your actual token account address
SEAL_MINT=jNYs5JdWy3269qk4QvPwt2c5FPMyQePLhpu3Fognd99 TREASURY_TOKEN=<TREASURY_TOKEN> anchor run initialize
```


