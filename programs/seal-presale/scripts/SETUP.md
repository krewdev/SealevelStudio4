# Script Setup Instructions

## Important: Build First!

Before running any scripts, you **must** build the Anchor program to generate the IDL:

```bash
cd /Users/krewdev/SealevelStudio4
anchor build
```

This will generate:
- `programs/seal-presale/target/idl/seal_presale.json` (IDL)
- `programs/seal-presale/target/types/seal_presale.ts` (TypeScript types)

## Running Scripts

All scripts should be run via `anchor run` which sets up the proper environment:

```bash
cd /Users/krewdev/SealevelStudio4/programs/seal-presale

# 1. Create SEAL token mint
anchor run create-seal-token

# 2. Initialize presale (set env vars first)
export SEAL_MINT=<mint_address>
export TREASURY_TOKEN=<token_account>
anchor run initialize

# 3. Test contribution
anchor run contribute

# 4. View state
anchor run view-state
```

## Alternative: Direct Execution

If you want to run scripts directly with `ts-node`, set environment variables:

```bash
export ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
export ANCHOR_WALLET=~/.config/solana/id.json

npx ts-node scripts/initialize.ts
```

## Troubleshooting

### "Program not found" error
- Run `anchor build` first to generate the IDL
- Make sure you're in the correct directory

### "ANCHOR_PROVIDER_URL is not defined"
- Use `anchor run` instead of direct `ts-node`
- Or set the environment variables manually

### TypeScript errors about missing types
- The scripts now work without types, but you still need the IDL
- Run `anchor build` to generate the IDL

