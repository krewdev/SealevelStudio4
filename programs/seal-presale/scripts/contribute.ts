import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { loadProgram } from "./load-program";

/**
 * Test contribution to the presale
 * 
 * Usage:
 *   anchor run contribute
 *   SOL_AMOUNT=2 anchor run contribute  # Contribute 2 SOL
 */
async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = await loadProgram();
  
  // Get contribution amount from environment or default to 1 SOL
  const solAmount = parseFloat(process.env.SOL_AMOUNT || "1");
  const solAmountLamports = solAmount * LAMPORTS_PER_SOL;

  console.log("💰 Contributing to SEAL Presale...");
  console.log("Amount:", solAmount, "SOL");
  console.log("Contributor:", provider.wallet.publicKey.toString());

  // Get presale state PDA (using authority from wallet)
  // Note: In production, you'd want to store the authority address
  const authority = provider.wallet.publicKey; // For now, use wallet as authority
  const [presaleState] = PublicKey.findProgramAddressSync(
    [Buffer.from("presale"), authority.toBuffer()],
    program.programId
  );

  // Get contributor PDA
  const [contributor] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("contributor"),
      presaleState.toBuffer(),
      provider.wallet.publicKey.toBuffer(),
    ],
    program.programId
  );

  try {
    // Fetch presale state to get required accounts
    console.log("\n📊 Fetching presale state...");
    const state = await (program.account as any).presaleState.fetch(presaleState);
    
    const treasury = state.treasury;
    const sealMint = state.sealMint;
    const treasuryTokenAccount = state.treasuryTokenAccount;

    // Get contributor's associated token account
    const contributorTokenAccount = await getAssociatedTokenAddress(
      sealMint,
      provider.wallet.publicKey
    );

    console.log("\n📋 Accounts:");
    console.log("  Presale State:", presaleState.toString());
    console.log("  Contributor PDA:", contributor.toString());
    console.log("  Contributor Wallet:", provider.wallet.publicKey.toString());
    console.log("  Contributor Token Account:", contributorTokenAccount.toString());
    console.log("  Treasury:", treasury.toString());
    console.log("  Treasury Token Account:", treasuryTokenAccount.toString());

    // Check if presale is active
    if (!state.isActive) {
      throw new Error("Presale is not active!");
    }

    // Check time window
    const now = Math.floor(Date.now() / 1000);
    if (now < state.startTime.toNumber()) {
      throw new Error(`Presale hasn't started yet. Starts: ${new Date(state.startTime.toNumber() * 1000).toISOString()}`);
    }
    if (now > state.endTime.toNumber()) {
      throw new Error(`Presale has ended. Ended: ${new Date(state.endTime.toNumber() * 1000).toISOString()}`);
    }

    // Check current stats
    const totalRaised = state.totalRaised.toNumber() / LAMPORTS_PER_SOL;
    const remainingCap = (state.totalRaiseCap.toNumber() / LAMPORTS_PER_SOL) - totalRaised;
    
    console.log("\n📊 Current Presale Stats:");
    console.log("  Total Raised:", totalRaised, "SOL");
    console.log("  Remaining Cap:", remainingCap, "SOL");
    console.log("  Total Contributors:", state.totalContributors.toNumber());
    console.log("  Tokens Sold:", state.tokensSold.toNumber() / 1_000_000_000, "SEAL");

    if (solAmount > remainingCap) {
      throw new Error(`Contribution amount (${solAmount} SOL) exceeds remaining cap (${remainingCap} SOL)`);
    }

    // Calculate expected tokens (with bonus)
    const basePrice = state.pricePerSeal.toNumber() / LAMPORTS_PER_SOL;
    const baseTokens = solAmount / basePrice;
    
    // Apply bonus (simplified - actual calculation is in program)
    let bonus = 0;
    if (solAmount >= 500) bonus = 0.30;
    else if (solAmount >= 100) bonus = 0.25;
    else if (solAmount >= 50) bonus = 0.20;
    else if (solAmount >= 10) bonus = 0.15;
    else if (solAmount >= 1) bonus = 0.10;
    
    const expectedTokens = baseTokens * (1 + bonus);
    
    console.log("\n💎 Expected Tokens:");
    console.log("  Base:", baseTokens.toLocaleString(), "SEAL");
    console.log("  Bonus:", (bonus * 100).toFixed(0) + "%");
    console.log("  Total:", expectedTokens.toLocaleString(), "SEAL");

    console.log("\n📤 Sending contribution transaction...");
    
    const tx = await program.methods
      .contribute(new anchor.BN(solAmountLamports))
      .accounts({
        presaleState,
        contributor,
        contributorAccount: provider.wallet.publicKey,
        treasury,
        treasuryTokenAccount,
        contributorTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ Contribution successful!");
    console.log("Transaction Signature:", tx);
    console.log("\n🔗 View on Solscan:");
    console.log(`   https://solscan.io/tx/${tx}?cluster=devnet`);

    // Fetch updated state
    console.log("\n📊 Updated Presale Stats:");
    const updatedState = await (program.account as any).presaleState.fetch(presaleState);
    const contributorState = await (program.account as any).contributor.fetch(contributor);
    
    console.log("  Total Raised:", updatedState.totalRaised.toNumber() / LAMPORTS_PER_SOL, "SOL");
    console.log("  Total Contributors:", updatedState.totalContributors.toNumber());
    console.log("  Tokens Sold:", updatedState.tokensSold.toNumber() / 1_000_000_000, "SEAL");
    console.log("\n👤 Your Contribution:");
    console.log("  Total Contributed:", contributorState.totalContributed.toNumber() / LAMPORTS_PER_SOL, "SOL");
    console.log("  Total Tokens Received:", contributorState.totalTokensReceived.toNumber() / 1_000_000_000, "SEAL");

  } catch (error) {
    console.error("\n❌ Error contributing:", error);
    
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      
      // Check for common errors
      if (error.message.includes("AmountTooLow")) {
        console.error("\n💡 Amount is below minimum purchase. Check presale configuration.");
      } else if (error.message.includes("AmountTooHigh")) {
        console.error("\n💡 Amount exceeds maximum purchase per wallet.");
      } else if (error.message.includes("CapExceeded")) {
        console.error("\n💡 Contribution would exceed total raise cap.");
      } else if (error.message.includes("PresaleNotStarted") || error.message.includes("PresaleEnded")) {
        console.error("\n💡 Presale is not active. Check time window.");
      } else if (error.message.includes("InsufficientTreasuryBalance")) {
        console.error("\n💡 Treasury doesn't have enough SEAL tokens. Fund the treasury first.");
      }
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

