import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { loadProgram } from "./load-program";

/**
 * Initialize the presale with all parameters
 * 
 * Prerequisites:
 * 1. SEAL token mint must be created (run create-seal-token.ts first)
 * 2. Treasury token account must be funded with SEAL tokens
 * 
 * Run: anchor run initialize
 * 
 * Or with custom parameters:
 * SEAL_MINT=<address> TREASURY_TOKEN=<address> anchor run initialize
 */
async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = await loadProgram();
  
  console.log("🚀 Initializing SEAL Presale...");
  console.log("Program ID:", program.programId.toString());
  console.log("Authority:", provider.wallet.publicKey.toString());

  // Get SEAL mint and treasury token account from environment or use defaults
  let sealMintAddress = process.env.SEAL_MINT || process.env.NEXT_PUBLIC_SEAL_MINT;
  let treasuryTokenAddress = process.env.TREASURY_TOKEN || process.env.NEXT_PUBLIC_TREASURY_TOKEN;

  // If only mint is provided, try to find the treasury token account (ATA)
  if (sealMintAddress && !treasuryTokenAddress) {
    console.log("🔍 Treasury token account not provided, calculating ATA...");
    const { getAssociatedTokenAddress } = await import("@solana/spl-token");
    const sealMint = new PublicKey(sealMintAddress);
    const treasury = provider.wallet.publicKey;
    treasuryTokenAddress = (await getAssociatedTokenAddress(sealMint, treasury)).toString();
    console.log("✅ Found treasury token account:", treasuryTokenAddress);
  }

  if (!sealMintAddress || !treasuryTokenAddress) {
    console.error("❌ Error: SEAL_MINT environment variable required!");
    console.log("\n💡 Set it like this:");
    console.log("   export SEAL_MINT=<your_mint_address>");
    console.log("\n   The treasury token account will be calculated automatically.");
    console.log("\n   Or set both manually:");
    console.log("   export SEAL_MINT=<your_mint_address>");
    console.log("   export TREASURY_TOKEN=<your_treasury_token_account>");
    process.exit(1);
  }

  const sealMint = new PublicKey(sealMintAddress);
  const treasuryTokenAccount = new PublicKey(treasuryTokenAddress);
  const treasury = provider.wallet.publicKey; // Use wallet as treasury for now

  // Presale parameters
  const now = Math.floor(Date.now() / 1000);
  const startTime = now; // Start immediately
  const endTime = now + (5 * 30 * 24 * 60 * 60); // 5 months from now

  const minPurchase = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL
  const maxPurchase = 1000 * LAMPORTS_PER_SOL; // 1000 SOL
  const totalRaiseCap = 10000 * LAMPORTS_PER_SOL; // 10,000 SOL
  const presaleSupply = 500_000_000 * 1_000_000_000; // 500M SEAL tokens (9 decimals)
  const pricePerSeal = 0.00002 * LAMPORTS_PER_SOL; // 0.00002 SOL per SEAL (50,000 SEAL per SOL)
  const whitelistEnabled = false;

  // Get presale state PDA
  const [presaleState] = PublicKey.findProgramAddressSync(
    [Buffer.from("presale"), provider.wallet.publicKey.toBuffer()],
    program.programId
  );

  console.log("\n📋 Presale Configuration:");
  console.log("  Start Time:", new Date(startTime * 1000).toISOString());
  console.log("  End Time:", new Date(endTime * 1000).toISOString());
  console.log("  Min Purchase:", minPurchase / LAMPORTS_PER_SOL, "SOL");
  console.log("  Max Purchase:", maxPurchase / LAMPORTS_PER_SOL, "SOL");
  console.log("  Total Raise Cap:", totalRaiseCap / LAMPORTS_PER_SOL, "SOL");
  console.log("  Presale Supply:", presaleSupply / 1_000_000_000, "SEAL");
  console.log("  Price per SEAL:", pricePerSeal / LAMPORTS_PER_SOL, "SOL");
  console.log("  Whitelist Enabled:", whitelistEnabled);
  console.log("\n📦 Accounts:");
  console.log("  Presale State PDA:", presaleState.toString());
  console.log("  Treasury:", treasury.toString());
  console.log("  SEAL Mint:", sealMint.toString());
  console.log("  Treasury Token Account:", treasuryTokenAccount.toString());

  try {
    console.log("\n📤 Sending initialization transaction...");
    
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

    console.log("\n✅ Presale initialized successfully!");
    console.log("Transaction Signature:", tx);
    console.log("Presale State PDA:", presaleState.toString());
    console.log("\n🔗 View on Solscan:");
    console.log(`   https://solscan.io/tx/${tx}?cluster=devnet`);

    // Fetch and display initial state
    console.log("\n📊 Fetching presale state...");
    const state = await (program.account as any).presaleState.fetch(presaleState);
    console.log("  Total Raised:", state.totalRaised.toNumber() / LAMPORTS_PER_SOL, "SOL");
    console.log("  Total Contributors:", state.totalContributors.toNumber());
    console.log("  Tokens Sold:", state.tokensSold.toNumber() / 1_000_000_000, "SEAL");
    console.log("  Is Active:", state.isActive);

  } catch (error) {
    console.error("\n❌ Error initializing presale:", error);
    
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

