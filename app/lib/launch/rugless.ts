
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  createInitializeMintInstruction,
  createInitializeTransferFeeConfigInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID
} from '@solana/spl-token';
import { SEAL_TOKEN_CONFIG } from '../seal-token/config';

// Constants
const PLATFORM_TREASURY = new PublicKey('11111111111111111111111111111111'); // Placeholder: System Program
const RUGLESS_LAUNCH_PROGRAM_ID = new PublicKey('11111111111111111111111111111111'); // Placeholder: System Program

export interface RuglessLaunchConfig {
  // Token Details
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: number; // In UI units (not lamports)
  
  // Launch Economics
  solLockAmount: number; // SOL amount dev locks
  sealLockAmount: number; // SEAL amount dev locks (stake)
  
  // Platform settings (usually fetched from config/chain)
  platformMatchRatio: number; // 1.0 = 100% match
  taxBasisPoints: number; // 100 = 1%
  vestingPeriodSeconds: number; // 604800 = 1 week
}

export interface LaunchTransactionResult {
  transaction: Transaction;
  mintKeypair: Keypair;
  lpTokenMint: PublicKey; // The LP token mint (simulated)
  signers: Keypair[];
}

/**
 * Calculates the economics of the launch
 */
export function calculateLaunchEconomics(config: RuglessLaunchConfig) {
  const devSolCommitment = config.solLockAmount;
  const platformMatch = devSolCommitment * config.platformMatchRatio;
  const totalLiquiditySol = devSolCommitment + platformMatch;
  const taxRate = config.taxBasisPoints / 10000;
  
  return {
    devSolCommitment,
    platformMatch,
    totalLiquiditySol,
    taxRatePercentage: taxRate * 100,
    vestingDurationDays: config.vestingPeriodSeconds / 86400
  };
}

/**
 * Builds the Rugless Launch Transaction
 * 
 * This function orchestrates:
 * 1. Creating the new Token-2022 mint with 1% Transfer Fee
 * 2. Transferring Dev's SOL + SEAL stake to the Program Escrow
 * 3. invoking the (simulated) "Initialize Launch" instruction on the program
 */
export async function createRuglessLaunchTransaction(
  connection: Connection,
  payer: PublicKey,
  config: RuglessLaunchConfig
): Promise<LaunchTransactionResult> {
  const transaction = new Transaction();
  const signers: Keypair[] = [];
  
  // --- 1. Create New Token Mint (Token-2022) ---
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;
  signers.push(mintKeypair);

  const mintRent = await getMinimumBalanceForRentExemptMint(connection);
  
  // Create Account for Mint
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: MINT_SIZE,
      lamports: mintRent,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // Initialize Transfer Fee (1% Tax)
  // The authority to update fees is set to the Platform Treasury
  transaction.add(
    createInitializeTransferFeeConfigInstruction(
      mint,
      PLATFORM_TREASURY, // Transfer Fee Config Authority
      PLATFORM_TREASURY, // Withdraw Withheld Authority
      config.taxBasisPoints, // 1% (100 basis points)
      BigInt(config.totalSupply * Math.pow(10, config.decimals)), // Max fee (cap at total supply for now, effectively no cap)
      TOKEN_2022_PROGRAM_ID
    )
  );

  // Initialize Mint
  transaction.add(
    createInitializeMintInstruction(
      mint,
      config.decimals,
      payer, // Mint Authority (temporary, will be revoked/transferred to program)
      null, // Freeze Authority
      TOKEN_2022_PROGRAM_ID
    )
  );

  // --- 2. Mint Initial Supply ---
  // In a real bonding curve, minting might happen dynamically or all at once into the pool.
  // Here we mint to the Payer first, then they transfer to the Escrow/Pool.
  
  const payerAta = await getAssociatedTokenAddress(
    mint,
    payer,
    false,
    TOKEN_2022_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer,
      payerAta,
      payer,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  const supplyBigInt = BigInt(config.totalSupply) * BigInt(Math.pow(10, config.decimals));
  transaction.add(
    createMintToInstruction(
      mint,
      payerAta,
      payer,
      supplyBigInt,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  // --- 3. Handle Dev Stake (SOL + SEAL) ---
  
  // 3a. Transfer SOL Stake to Program Escrow
  // We derive a PDA for the launch escrow based on the new mint
  const [escrowPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("rugless_escrow"), mint.toBuffer()],
    RUGLESS_LAUNCH_PROGRAM_ID
  );

  transaction.add(
    SystemProgram.transfer({
      fromPubkey: payer,
      toPubkey: escrowPda,
      lamports: config.solLockAmount * LAMPORTS_PER_SOL
    })
  );

  // 3b. Transfer SEAL Stake to Program Escrow
  // Assuming SEAL is a standard SPL Token (or Token-2022, checking config)
  const sealMint = new PublicKey(SEAL_TOKEN_CONFIG.mintAddress || "So11111111111111111111111111111111111111112"); // Default to Wrapped SOL if not set
  const sealProgramId = SEAL_TOKEN_CONFIG.useToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  
  const payerSealAta = await getAssociatedTokenAddress(sealMint, payer, false, sealProgramId);
  const escrowSealAta = await getAssociatedTokenAddress(sealMint, escrowPda, true, sealProgramId);

  // Create Escrow SEAL ATA if needed (idempotent usually, but here we assume program does it or we do it)
  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer,
      escrowSealAta,
      escrowPda,
      sealMint,
      sealProgramId,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  const sealLockBigInt = BigInt(config.sealLockAmount) * BigInt(Math.pow(10, SEAL_TOKEN_CONFIG.decimals));
  transaction.add(
    createTransferInstruction(
      payerSealAta,
      escrowSealAta,
      payer,
      sealLockBigInt,
      [],
      sealProgramId
    )
  );

  // --- 4. Transfer New Token Supply to Escrow/Pool ---
  // The dev sends the entire supply to the bonding curve/pool managed by the program
  const escrowNewTokenAta = await getAssociatedTokenAddress(mint, escrowPda, true, TOKEN_2022_PROGRAM_ID);
  
  transaction.add(
    createAssociatedTokenAccountInstruction(
      payer,
      escrowNewTokenAta,
      escrowPda,
      mint,
      TOKEN_2022_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    )
  );

  transaction.add(
    createTransferInstruction(
      payerAta,
      escrowNewTokenAta,
      payer,
      supplyBigInt,
      [],
      TOKEN_2022_PROGRAM_ID
    )
  );

  // --- 5. Initialize Rugless Launch (Program Instruction) ---
  // This instruction would tell the smart contract:
  // "I have sent X SOL, Y SEAL, and Z Supply. 
  //  Please match X SOL from your treasury, 
  //  Initialize the LP, 
  //  Lock the LP tokens for 1 week."
  
  // Since we can't write the Rust program here, we document the instruction layout
  /*
    Instruction Layout:
    - discriminator (8 bytes)
    - vesting_duration (8 bytes): 604800
    - platform_match_amount (8 bytes): derived on chain or passed
    - tax_basis_points (2 bytes): 100
  */
  
  // transaction.add(new TransactionInstruction({ ... }));

  // Mock LP Mint return
  const lpTokenMint = PublicKey.findProgramAddressSync(
    [Buffer.from("lp_mint"), mint.toBuffer()],
    RUGLESS_LAUNCH_PROGRAM_ID
  )[0];

  return {
    transaction,
    mintKeypair,
    lpTokenMint,
    signers
  };
}
