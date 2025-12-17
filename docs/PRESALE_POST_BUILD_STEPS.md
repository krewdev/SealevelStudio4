# SEAL Presale - Post Build Steps

After successfully running `anchor build`, follow these steps:

## 1. Verify Build Success

Check that the build artifacts were created:

```bash
cd programs/seal-presale

# Check for compiled program
ls -la target/deploy/seal_presale.so

# Check for IDL
ls -la target/idl/seal_presale.json

# Check for TypeScript types
ls -la target/types/seal_presale.ts
```

## 2. Deploy to Devnet

Deploy the program to Solana devnet for testing:

```bash
# Make sure you have devnet SOL
solana balance --url devnet

# If you need devnet SOL, airdrop:
solana airdrop 2 --url devnet

# Deploy the program
anchor deploy --provider.cluster devnet
```

**Expected output:**
- Program deployed to: `2g4two95hsPRbdQYoiyasp6cVYho8SF4puab4RyFHHnY`
- Transaction signature

## 3. Initialize the Presale

After deployment, initialize the presale with your parameters:

### Create Initialization Script

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
  
  // Presale parameters
  const startTime = new Date("2025-02-01T00:00:00Z").getTime() / 1000; // Unix timestamp
  const endTime = new Date("2025-07-01T00:00:00Z").getTime() / 1000; // 5 months later
  const minPurchase = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
  const maxPurchase = 1000 * LAMPORTS_PER_SOL; // 1000 SOL
  const totalRaiseCap = 10000 * LAMPORTS_PER_SOL; // 10,000 SOL
  const presaleSupply = 500_000_000 * 1_000_000_000; // 500M SEAL tokens (9 decimals)
  const pricePerSeal = 0.00002 * LAMPORTS_PER_SOL; // 0.00002 SOL per SEAL
  const whitelistEnabled = false;

  // Get presale state PDA
  const [presaleState] = PublicKey.findProgramAddressSync(
    [Buffer.from("presale"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  // Treasury wallet (use your wallet for now, change in production)
  const treasury = provider.wallet.publicKey;
  
  // SEAL token mint (create this first or use existing)
  const sealMint = new PublicKey("YOUR_SEAL_MINT_ADDRESS");
  
  // Treasury token account (holding SEAL tokens)
  const treasuryTokenAccount = new PublicKey("YOUR_TREASURY_TOKEN_ACCOUNT");

  try {
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

    console.log("Presale initialized!");
    console.log("Transaction:", tx);
    console.log("Presale State:", presaleState.toString());
  } catch (error) {
    console.error("Error initializing presale:", error);
  }
}

main();
```

Run it:
```bash
anchor run initialize
```

## 4. Create SEAL Token Mint (If Needed)

Before initializing, you need a SEAL token mint:

```bash
# Use SPL Token CLI or create via script
spl-token create-token --decimals 9
# Save the mint address

# Create token account for treasury
spl-token create-account <MINT_ADDRESS>
# Save the token account address

# Mint tokens to treasury (for presale supply)
spl-token mint <MINT_ADDRESS> 500000000 <TREASURY_TOKEN_ACCOUNT>
```

## 5. Write Tests

Create comprehensive tests in `programs/seal-presale/tests/seal-presale.ts`:

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SealPresale } from "../target/types/seal_presale";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("seal-presale", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SealPresale as Program<SealPresale>;

  it("Initializes presale", async () => {
    // Test initialization
  });

  it("Allows contribution within limits", async () => {
    // Test contribution
  });

  it("Rejects contribution below minimum", async () => {
    // Test minimum purchase
  });

  it("Rejects contribution above maximum", async () => {
    // Test maximum purchase
  });

  it("Rejects contribution after cap", async () => {
    // Test cap enforcement
  });

  it("Rejects contribution outside time window", async () => {
    // Test time validation
  });
});
```

Run tests:
```bash
anchor test
```

## 6. Generate TypeScript Types

The types are automatically generated during build, but you can regenerate:

```bash
anchor build
```

Types will be in: `target/types/seal_presale.ts`

## 7. Copy IDL to Frontend

Copy the IDL to your frontend for integration:

```bash
# Copy IDL
cp programs/seal-presale/target/idl/seal_presale.json app/lib/seal-token/

# Copy types (optional, if using directly)
cp programs/seal-presale/target/types/seal_presale.ts app/lib/seal-token/
```

## 8. Update Frontend Integration

Update your frontend to use the on-chain program:

### Create Program Client

Create `app/lib/seal-token/presale-program.ts`:

```typescript
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { SealPresale } from "./seal_presale";
import IDL from "./seal_presale.json";

const PROGRAM_ID = new PublicKey("2g4two95hsPRbdQYoiyasp6cVYho8SF4puab4RyFHHnY");

export class PresaleProgramClient {
  private program: Program<SealPresale>;
  private connection: Connection;

  constructor(connection: Connection, wallet: any) {
    const provider = new AnchorProvider(connection, wallet, {});
    this.program = new Program(IDL as any, PROGRAM_ID, provider);
    this.connection = connection;
  }

  async contribute(solAmount: number): Promise<string> {
    // Get PDAs
    const presaleState = await this.getPresaleStatePDA();
    const contributor = await this.getContributorPDA();

    const tx = await this.program.methods
      .contribute(new anchor.BN(solAmount * LAMPORTS_PER_SOL))
      .accounts({
        presaleState,
        contributor,
        contributorAccount: this.program.provider.wallet.publicKey,
        // ... other accounts
      })
      .rpc();

    return tx;
  }

  async getPresaleState() {
    const presaleState = await this.getPresaleStatePDA();
    return await this.program.account.presaleState.fetch(presaleState);
  }

  private async getPresaleStatePDA(): Promise<PublicKey> {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("presale"), this.program.provider.wallet.publicKey.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  private async getContributorPDA(): Promise<PublicKey> {
    const presaleState = await this.getPresaleStatePDA();
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("contributor"),
        presaleState.toBuffer(),
        this.program.provider.wallet.publicKey.toBuffer(),
      ],
      this.program.programId
    );
    return pda;
  }
}
```

## 9. Security Audit

Before mainnet deployment:

1. **Professional Audit**
   - Engage a security firm
   - Review all code paths
   - Test all attack vectors

2. **Self-Review Checklist**
   - [ ] All overflow checks in place
   - [ ] All validations on-chain
   - [ ] No race conditions
   - [ ] Treasury safety verified
   - [ ] Time validation tested
   - [ ] Supply limits enforced
   - [ ] Error handling comprehensive

3. **Test Coverage**
   - [ ] Unit tests for all instructions
   - [ ] Integration tests for full flow
   - [ ] Edge case testing
   - [ ] Concurrent contribution testing
   - [ ] Failure scenario testing

## 10. Mainnet Deployment

Once tested and audited:

```bash
# Switch to mainnet
solana config set --url mainnet-beta

# Deploy to mainnet (BE CAREFUL!)
anchor deploy --provider.cluster mainnet

# Initialize presale on mainnet
anchor run initialize
```

## Quick Reference Commands

```bash
# Build
cd programs/seal-presale && anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Run tests
anchor test

# View program logs
solana logs --url devnet

# Check program account
solana account <PROGRAM_ID> --url devnet

# View presale state
anchor run view-presale-state
```

## Troubleshooting

### Build Errors
- Check Rust version: `rustc --version`
- Check Anchor version: `anchor --version`
- Clean and rebuild: `anchor clean && anchor build`

### Deployment Errors
- Ensure you have enough SOL for rent
- Check network connectivity
- Verify program ID matches keypair

### Runtime Errors
- Check program logs: `solana logs`
- Verify account states
- Check transaction signatures on explorer

---

**Next**: After successful build and deployment, proceed to testing and frontend integration.


