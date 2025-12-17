# SEAL Presale - Quick Start Guide

## After `anchor build` - Next Steps

### 1. Verify Build Artifacts ✅

```bash
cd programs/seal-presale

# Check compiled program exists
ls -la target/deploy/seal_presale.so

# Check IDL was generated
ls -la target/idl/seal_presale.json

# Check TypeScript types
ls -la target/types/seal_presale.ts
```

### 2. Deploy to Devnet 🚀

```bash
# Make sure you have devnet SOL
solana balance --url devnet

# If needed, get devnet SOL
solana airdrop 2 --url devnet

# Deploy the program
anchor deploy --provider.cluster devnet
```

**Expected Output:**
```
Deploying cluster: https://api.devnet.solana.com
Upgrade authority: <your-wallet>
Deploying program "seal_presale"...
Program Id: 2g4two95hsPRbdQYoiyasp6cVYho8SF4puab4RyFHHnY

Deploy success
```

### 3. Monitor Your Program Logs 📊

To see ONLY your presale program transactions:

```bash
# Monitor for your specific program ID
solana logs --url devnet 2g4two95hsPRbdQYoiyasp6cVYho8SF4puab4RyFHHnY
```

**What to look for:**
- `Program 2g4two95hsPRbdQYoiyasp6cVYho8SF4puab4RyFHHnY invoke [1]` - Your program being called
- `Program log: Presale initialized` - Initialization messages
- `Program log: Contribution: X SOL -> Y SEAL tokens` - Contribution logs

### 4. Initialize the Presale ⚙️

Create `programs/seal-presale/scripts/initialize.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SealPresale } from "../target/types/seal_presale";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SealPresale as Program<SealPresale>;
  
  // Calculate timestamps (5 months from now)
  const now = Math.floor(Date.now() / 1000);
  const startTime = now; // Start immediately
  const endTime = now + (5 * 30 * 24 * 60 * 60); // 5 months

  // Presale parameters
  const minPurchase = 0.1 * LAMPORTS_PER_SOL;
  const maxPurchase = 1000 * LAMPORTS_PER_SOL;
  const totalRaiseCap = 10000 * LAMPORTS_PER_SOL;
  const presaleSupply = 500_000_000 * 1_000_000_000; // 500M SEAL (9 decimals)
  const pricePerSeal = 0.00002 * LAMPORTS_PER_SOL; // 0.00002 SOL per SEAL
  const whitelistEnabled = false;

  // Get PDAs
  const [presaleState] = PublicKey.findProgramAddressSync(
    [Buffer.from("presale"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  // For now, use your wallet as treasury (change in production!)
  const treasury = provider.wallet.publicKey;
  
  // TODO: Create SEAL token mint first, then use its address
  // For testing, you can use a placeholder or create a test mint
  const sealMint = new PublicKey("11111111111111111111111111111111"); // Placeholder
  
  // TODO: Create treasury token account and fund it
  const treasuryTokenAccount = new PublicKey("11111111111111111111111111111111"); // Placeholder

  try {
    console.log("Initializing presale...");
    console.log("Presale State PDA:", presaleState.toString());
    
    const tx = await program.methods
      .initializePresale(
        new anchor.BN(startTime),
        new anchor.BN(endTime),
        new anchor.BN(minPurchase),
        new anchor.BN(maxPurchase),
        new anchor.BN(totalRaiseCap),
        new anchor.BN(presaleSupply),
        new anchor.BN(pricePerSeal),
        whitelistEnabled
      )
      .accounts({
        presaleState,
        authority: provider.wallet.publicKey,
        treasury,
        sealMint,
        treasuryTokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("✅ Presale initialized!");
    console.log("Transaction:", tx);
    console.log("Presale State:", presaleState.toString());
  } catch (error) {
    console.error("❌ Error initializing presale:", error);
    throw error;
  }
}

main();
```

Run it:
```bash
anchor run initialize
```

### 5. Create SEAL Token Mint (Required First) 🪙

Before initializing, create the SEAL token:

```bash
# Create token mint with 9 decimals
spl-token create-token --decimals 9
# Save the output address (e.g., TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)

# Create token account for treasury
spl-token create-account <MINT_ADDRESS>
# Save the token account address

# Mint 500M tokens to treasury
spl-token mint <MINT_ADDRESS> 500000000 <TREASURY_TOKEN_ACCOUNT>
```

### 6. Test a Contribution 🧪

Create `programs/seal-presale/scripts/contribute.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SealPresale } from "../target/types/seal_presale";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SealPresale as Program<SealPresale>;
  
  // Get PDAs
  const [presaleState] = PublicKey.findProgramAddressSync(
    [Buffer.from("presale"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  const [contributor] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("contributor"),
      presaleState.toBuffer(),
      provider.wallet.publicKey.toBuffer(),
    ],
    program.programId
  );

  // Contribute 1 SOL
  const solAmount = 1 * LAMPORTS_PER_SOL;

  try {
    console.log("Contributing 1 SOL...");
    
    const tx = await program.methods
      .contribute(new anchor.BN(solAmount))
      .accounts({
        presaleState,
        contributor,
        contributorAccount: provider.wallet.publicKey,
        // ... other accounts needed
      })
      .rpc();

    console.log("✅ Contribution successful!");
    console.log("Transaction:", tx);
  } catch (error) {
    console.error("❌ Error contributing:", error);
    throw error;
  }
}

main();
```

### 7. View Presale State 📈

Create `programs/seal-presale/scripts/view-state.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SealPresale } from "../target/types/seal_presale";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SealPresale as Program<SealPresale>;
  
  const [presaleState] = PublicKey.findProgramAddressSync(
    [Buffer.from("presale"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  try {
    const state = await program.account.presaleState.fetch(presaleState);
    
    console.log("📊 Presale State:");
    console.log("Total Raised:", state.totalRaised.toNumber() / LAMPORTS_PER_SOL, "SOL");
    console.log("Total Contributors:", state.totalContributors.toNumber());
    console.log("Tokens Sold:", state.tokensSold.toNumber() / 1_000_000_000, "SEAL");
    console.log("Is Active:", state.isActive);
    console.log("Start Time:", new Date(state.startTime.toNumber() * 1000).toISOString());
    console.log("End Time:", new Date(state.endTime.toNumber() * 1000).toISOString());
  } catch (error) {
    console.error("❌ Error fetching state:", error);
  }
}

main();
```

## Command Checklist

```bash
# ✅ Build
cd programs/seal-presale && anchor build

# ✅ Deploy
anchor deploy --provider.cluster devnet

# ✅ Monitor logs (filter for your program)
solana logs --url devnet 2g4two95hsPRbdQYoiyasp6cVYho8SF4puab4RyFHHnY

# ✅ Initialize
anchor run initialize

# ✅ Test contribution
anchor run contribute

# ✅ View state
anchor run view-state
```

## Troubleshooting

### Program not in logs?
- Make sure you deployed: `anchor deploy --provider.cluster devnet`
- Check program ID matches: `anchor keys list`
- Filter logs by your program ID

### "Account not found" errors?
- Initialize the presale first
- Check PDA derivation matches
- Verify accounts exist on-chain

### "Insufficient funds" errors?
- Get devnet SOL: `solana airdrop 2 --url devnet`
- Check treasury has SEAL tokens
- Verify token account exists

---

**Next**: After successful deployment and initialization, proceed to frontend integration!


