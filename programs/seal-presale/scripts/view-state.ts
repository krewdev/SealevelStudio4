import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAccount, getAssociatedTokenAddress } from "@solana/spl-token";
import { loadProgram } from "./load-program";

/**
 * View presale state and statistics
 * 
 * Usage:
 *   anchor run view-state
 *   AUTHORITY=<address> anchor run view-state  # Use different authority
 */
async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = await loadProgram();
  
  // Get authority from environment or use wallet
  const authorityAddress = process.env.AUTHORITY || provider.wallet.publicKey.toString();
  const authority = new PublicKey(authorityAddress);

  console.log("📊 SEAL Presale State");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Get presale state PDA
  const [presaleState] = PublicKey.findProgramAddressSync(
    [Buffer.from("presale"), authority.toBuffer()],
    program.programId
  );

  try {
    console.log("\n🔍 Fetching presale state...");
    const state = await (program.account as any).presaleState.fetch(presaleState);
    
    const now = Math.floor(Date.now() / 1000);
    const startTime = state.startTime.toNumber();
    const endTime = state.endTime.toNumber();
    const isActive = state.isActive;
    const isInTimeWindow = now >= startTime && now <= endTime;

    console.log("\n📋 Configuration:");
    console.log("  Presale State PDA:", presaleState.toString());
    console.log("  Authority:", state.authority.toString());
    console.log("  Treasury:", state.treasury.toString());
    console.log("  SEAL Mint:", state.sealMint.toString());
    console.log("  Treasury Token Account:", state.treasuryTokenAccount.toString());
    console.log("  Is Active:", isActive ? "✅ Yes" : "❌ No");
    console.log("  Whitelist Enabled:", state.whitelistEnabled ? "✅ Yes" : "❌ No");

    console.log("\n⏰ Time Window:");
    console.log("  Start Time:", new Date(startTime * 1000).toISOString());
    console.log("  End Time:", new Date(endTime * 1000).toISOString());
    console.log("  Current Time:", new Date(now * 1000).toISOString());
    
    if (now < startTime) {
      const daysUntil = Math.floor((startTime - now) / (24 * 60 * 60));
      console.log("  Status: ⏳ Starts in", daysUntil, "days");
    } else if (now > endTime) {
      console.log("  Status: ❌ Ended");
    } else {
      const daysRemaining = Math.floor((endTime - now) / (24 * 60 * 60));
      console.log("  Status: ✅ Active (", daysRemaining, "days remaining)");
    }

    console.log("\n💰 Financial Stats:");
    const totalRaised = state.totalRaised.toNumber() / LAMPORTS_PER_SOL;
    const totalCap = state.totalRaiseCap.toNumber() / LAMPORTS_PER_SOL;
    const remainingCap = totalCap - totalRaised;
    const progress = (totalRaised / totalCap) * 100;
    
    console.log("  Total Raised:", totalRaised.toLocaleString(), "SOL");
    console.log("  Total Cap:", totalCap.toLocaleString(), "SOL");
    console.log("  Remaining:", remainingCap.toLocaleString(), "SOL");
    console.log("  Progress:", progress.toFixed(2) + "%");
    console.log("  Progress Bar:", "█".repeat(Math.floor(progress / 2)) + "░".repeat(50 - Math.floor(progress / 2)));

    console.log("\n🪙 Token Stats:");
    const tokensSold = state.tokensSold.toNumber() / 1_000_000_000;
    const presaleSupply = state.presaleSupply.toNumber() / 1_000_000_000;
    const tokensRemaining = presaleSupply - tokensSold;
    const supplyProgress = (tokensSold / presaleSupply) * 100;
    
    console.log("  Tokens Sold:", tokensSold.toLocaleString(), "SEAL");
    console.log("  Presale Supply:", presaleSupply.toLocaleString(), "SEAL");
    console.log("  Tokens Remaining:", tokensRemaining.toLocaleString(), "SEAL");
    console.log("  Supply Progress:", supplyProgress.toFixed(2) + "%");

    console.log("\n👥 Contributors:");
    console.log("  Total Contributors:", state.totalContributors.toNumber());
    if (state.totalContributors.toNumber() > 0) {
      const avgContribution = totalRaised / state.totalContributors.toNumber();
      console.log("  Average Contribution:", avgContribution.toFixed(4), "SOL");
    }

    console.log("\n💵 Pricing:");
    const pricePerSeal = state.pricePerSeal.toNumber() / LAMPORTS_PER_SOL;
    const sealsPerSol = 1 / pricePerSeal;
    console.log("  Price per SEAL:", pricePerSeal, "SOL");
    console.log("  SEAL per SOL:", sealsPerSol.toLocaleString());

    console.log("\n📏 Limits:");
    console.log("  Min Purchase:", state.minPurchase.toNumber() / LAMPORTS_PER_SOL, "SOL");
    console.log("  Max Purchase:", state.maxPurchase.toNumber() / LAMPORTS_PER_SOL, "SOL");

    // Check treasury balance
    try {
      const treasuryTokenAccount = await getAccount(
        provider.connection,
        state.treasuryTokenAccount
      );
      const treasuryBalance = Number(treasuryTokenAccount.amount) / 1_000_000_000;
      console.log("\n🏦 Treasury:");
      console.log("  SEAL Balance:", treasuryBalance.toLocaleString(), "SEAL");
      console.log("  Available for Presale:", Math.min(treasuryBalance, tokensRemaining).toLocaleString(), "SEAL");
      
      if (tokensRemaining > treasuryBalance) {
        console.log("  ⚠️  Warning: Treasury balance is less than remaining supply!");
      }
    } catch (error) {
      console.log("\n🏦 Treasury:");
      console.log("  ⚠️  Could not fetch treasury balance");
    }

    // Check contributor stats if wallet has contributed
    try {
      const [contributor] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("contributor"),
          presaleState.toBuffer(),
          provider.wallet.publicKey.toBuffer(),
        ],
        program.programId
      );

      const contributorState = await (program.account as any).contributor.fetch(contributor);
      
      console.log("\n👤 Your Contribution:");
      console.log("  Total Contributed:", contributorState.totalContributed.toNumber() / LAMPORTS_PER_SOL, "SOL");
      console.log("  Total Tokens Received:", contributorState.totalTokensReceived.toNumber() / 1_000_000_000, "SEAL");
      
      // Check token balance
      try {
        const contributorTokenAccount = await getAssociatedTokenAddress(
          state.sealMint,
          provider.wallet.publicKey
        );
        const tokenAccount = await getAccount(provider.connection, contributorTokenAccount);
        console.log("  Current SEAL Balance:", (Number(tokenAccount.amount) / 1_000_000_000).toLocaleString(), "SEAL");
      } catch {
        console.log("  Current SEAL Balance: 0 SEAL (no token account yet)");
      }
    } catch {
      console.log("\n👤 Your Contribution:");
      console.log("  No contributions yet");
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("✅ State fetched successfully!");

  } catch (error) {
    console.error("\n❌ Error fetching presale state:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("Account does not exist")) {
        console.error("\n💡 Presale has not been initialized yet.");
        console.error("   Run: anchor run initialize");
      } else {
        console.error("Error message:", error.message);
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

