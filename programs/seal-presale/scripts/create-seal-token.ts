import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { 
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
} from "@solana/spl-token";
import { 
  PublicKey, 
  Keypair, 
  SystemProgram, 
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL 
} from "@solana/web3.js";

/**
 * Script to create SEAL token mint and fund treasury
 * Run: anchor run create-seal-token
 */
async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const connection = provider.connection;
  const wallet = provider.wallet;

  console.log("🪙 Creating SEAL Token Mint...");
  console.log("Wallet:", wallet.publicKey.toString());

  try {
    // 1. Create mint keypair
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    
    console.log("\n📝 Mint Address:", mint.toString());
    console.log("💾 Save this address - you'll need it for initialization!");

    // 2. Calculate rent for mint account
    const rentExemptBalance = await getMinimumBalanceForRentExemptMint(connection);
    console.log("\n💰 Rent required:", rentExemptBalance / LAMPORTS_PER_SOL, "SOL");

    // 3. Create mint account
    const createMintAccountIx = SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: rentExemptBalance,
      programId: TOKEN_PROGRAM_ID,
    });

    // 4. Initialize mint (9 decimals, no freeze authority, mint authority = wallet)
    const initMintIx = createInitializeMintInstruction(
      mint,
      9, // decimals
      wallet.publicKey, // mint authority
      null // freeze authority (none)
    );

    // 5. Create transaction
    const tx = new Transaction().add(createMintAccountIx, initMintIx);
    
    console.log("\n📤 Creating mint account...");
    if (!wallet.payer) {
      throw new Error("Wallet payer is not available");
    }
    
    const signature = await sendAndConfirmTransaction(
      connection,
      tx,
      [wallet.payer, mintKeypair],
      { commitment: "confirmed" }
    );

    console.log("✅ Mint created!");
    console.log("Transaction:", signature);
    console.log("\n📋 Mint Details:");
    console.log("  Address:", mint.toString());
    console.log("  Decimals: 9");
    console.log("  Mint Authority:", wallet.publicKey.toString());

    // 6. Create associated token account for treasury
    console.log("\n🏦 Creating treasury token account...");
    const treasuryTokenAccount = await getAssociatedTokenAddress(
      mint,
      wallet.publicKey // treasury wallet
    );

    // Check if ATA already exists
    const accountInfo = await connection.getAccountInfo(treasuryTokenAccount);
    
    if (!accountInfo) {
      const createAtaIx = createAssociatedTokenAccountInstruction(
        wallet.publicKey, // payer
        treasuryTokenAccount, // ata
        wallet.publicKey, // owner
        mint // mint
      );

      const ataTx = new Transaction().add(createAtaIx);
      if (!wallet.payer) {
        throw new Error("Wallet payer is not available");
      }
      const ataSignature = await sendAndConfirmTransaction(
        connection,
        ataTx,
        [wallet.payer],
        { commitment: "confirmed" }
      );

      console.log("✅ Treasury token account created!");
      console.log("Transaction:", ataSignature);
    } else {
      console.log("ℹ️  Treasury token account already exists");
    }

    console.log("\n📋 Treasury Token Account:", treasuryTokenAccount.toString());

    // 7. Mint 500M SEAL tokens to treasury
    console.log("\n💰 Minting 500,000,000 SEAL tokens to treasury...");
    const mintAmount = 500_000_000 * 1_000_000_000; // 500M with 9 decimals

    const mintToIx = createMintToInstruction(
      mint, // mint
      treasuryTokenAccount, // destination
      wallet.publicKey, // authority
      mintAmount // amount
    );

    const mintTx = new Transaction().add(mintToIx);
    if (!wallet.payer) {
      throw new Error("Wallet payer is not available");
    }
    const mintSignature = await sendAndConfirmTransaction(
      connection,
      mintTx,
      [wallet.payer],
      { commitment: "confirmed" }
    );

    console.log("✅ Tokens minted!");
    console.log("Transaction:", mintSignature);

    // 8. Verify balance
    const balance = await connection.getTokenAccountBalance(treasuryTokenAccount);
    console.log("\n✅ Treasury Balance:", balance.value.uiAmount, "SEAL");

    // 9. Save mint keypair (for future use)
    console.log("\n💾 IMPORTANT: Save these values!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("SEAL_MINT_ADDRESS=" + mint.toString());
    console.log("TREASURY_TOKEN_ACCOUNT=" + treasuryTokenAccount.toString());
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\n⚠️  Note: The mint keypair was generated but not saved.");
    console.log("   For production, save the keypair securely!");
    console.log("   For now, you can recreate the mint if needed.");

    console.log("\n✅ Setup complete! Use these addresses in initialization script.");

  } catch (error) {
    console.error("❌ Error creating SEAL token:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

