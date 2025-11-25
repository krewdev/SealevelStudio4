/**
 * SEAL Token Presale
 * Handles presale logic, contributions, and token distribution
 */

import {
  Connection,
  PublicKey,
  Transaction,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  getMint,
} from '@solana/spl-token';

/**
 * Presale Configuration
 */
export interface PresaleConfig {
  // Presale Details
  startTime: Date;
  endTime: Date;
  isActive: boolean;
  
  // Token Allocation
  presaleSupply: number; // Total SEAL tokens available in presale
  minPurchase: number; // Minimum SOL contribution
  maxPurchase: number; // Maximum SOL contribution per wallet
  totalRaiseCap: number; // Maximum SOL to raise
  
  // Pricing
  pricePerSeal: number; // SOL per SEAL token (e.g., 0.0001 SOL = 1 SEAL)
  bonusTiers: {
    amount: number; // SOL contribution threshold
    bonusPercent: number; // Bonus percentage (e.g., 10 = 10% bonus)
  }[];
  
  // Whitelist
  whitelistEnabled: boolean;
  whitelist: Set<string>; // Wallet addresses
  
  // Treasury
  treasuryWallet: PublicKey; // Wallet receiving SOL contributions
  sealMint: PublicKey | null; // SEAL token mint address (null if not created yet)
  
  // Stats
  totalRaised: number; // Total SOL raised
  totalContributors: number;
  contributions: Map<string, number>; // wallet -> SOL contributed
}

/**
 * Default Presale Configuration
 */
export const DEFAULT_PRESALE_CONFIG: PresaleConfig = {
  startTime: new Date('2025-12-02T00:00:00Z'), // Starts Dec 2, 2025 (One week from now)
  endTime: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000), // 5 months duration
  isActive: true,

  presaleSupply: 300_000_000, // 300M SEAL tokens for presale
  minPurchase: 0.1, // Minimum 0.1 SOL
  maxPurchase: 1000, // Maximum 1000 SOL per wallet
  totalRaiseCap: 10_000, // Maximum 10,000 SOL total raise

  pricePerSeal: 0.00002, // 0.00002 SOL per SEAL (50,000 SEAL per SOL)
  bonusTiers: [
    { amount: 1, bonusPercent: 10 },    // 1+ SOL = 10% bonus
    { amount: 10, bonusPercent: 15 },   // 10+ SOL = 15% bonus
    { amount: 50, bonusPercent: 20 },   // 50+ SOL = 20% bonus
    { amount: 100, bonusPercent: 25 },  // 100+ SOL = 25% bonus
    { amount: 500, bonusPercent: 30 },  // 500+ SOL = 30% bonus
  ],

  whitelistEnabled: false,
  whitelist: new Set(),

  treasuryWallet: PublicKey.default, // Will be set to user's wallet
  sealMint: null,

  totalRaised: 0,
  totalContributors: 0,
  contributions: new Map(),
};

/**
 * Calculate SEAL tokens to receive for a SOL contribution
 */
export function calculateSealTokens(
  solAmount: number,
  config: PresaleConfig
): { baseTokens: number; bonusTokens: number; totalTokens: number; bonusPercent: number } {
  // Base tokens
  const baseTokens = solAmount / config.pricePerSeal;
  
  // Calculate bonus tier
  let bonusPercent = 0;
  for (let i = config.bonusTiers.length - 1; i >= 0; i--) {
    if (solAmount >= config.bonusTiers[i].amount) {
      bonusPercent = config.bonusTiers[i].bonusPercent;
      break;
    }
  }
  
  // Bonus tokens
  const bonusTokens = baseTokens * (bonusPercent / 100);
  const totalTokens = baseTokens + bonusTokens;
  
  return {
    baseTokens,
    bonusTokens,
    totalTokens,
    bonusPercent,
  };
}

/**
 * Validate presale contribution
 */
export function validateContribution(
  wallet: PublicKey,
  solAmount: number,
  config: PresaleConfig
): { valid: boolean; error?: string } {
  const now = new Date();
  
  // Check if presale is active
  if (!config.isActive) {
    return { valid: false, error: 'Presale is not active' };
  }
  
  // Check time window
  if (now < config.startTime) {
    return { valid: false, error: 'Presale has not started yet' };
  }
  
  if (now > config.endTime) {
    return { valid: false, error: 'Presale has ended' };
  }
  
  // Check minimum purchase
  if (solAmount < config.minPurchase) {
    return { valid: false, error: `Minimum purchase is ${config.minPurchase} SOL` };
  }
  
  // Check maximum purchase
  if (solAmount > config.maxPurchase) {
    return { valid: false, error: `Maximum purchase is ${config.maxPurchase} SOL per wallet` };
  }
  
  // Check whitelist
  if (config.whitelistEnabled && !config.whitelist.has(wallet.toString())) {
    return { valid: false, error: 'Wallet is not whitelisted' };
  }
  
  // Check existing contribution
  const existingContribution = config.contributions.get(wallet.toString()) || 0;
  const totalContribution = existingContribution + solAmount;
  
  if (totalContribution > config.maxPurchase) {
    return { valid: false, error: `Total contribution would exceed maximum of ${config.maxPurchase} SOL` };
  }
  
  // Check total raise cap
  if (config.totalRaised + solAmount > config.totalRaiseCap) {
    return { valid: false, error: 'Presale raise cap would be exceeded' };
  }
  
  // Check if enough tokens available
  const { totalTokens } = calculateSealTokens(solAmount, config);
  // This would need to check against remaining supply in a real implementation
  
  return { valid: true };
}

/**
 * Create presale contribution transaction
 */
export async function createPresaleContribution(
  connection: Connection,
  contributor: PublicKey,
  solAmount: number,
  config: PresaleConfig
): Promise<{ transaction: Transaction; sealAmount: number }> {
  if (!config.sealMint) {
    throw new Error('SEAL token mint not initialized');
  }
  
  // Validate contribution
  const validation = validateContribution(contributor, solAmount, config);
  if (!validation.valid) {
    throw new Error(validation.error || 'Invalid contribution');
  }
  
  // Calculate SEAL tokens
  const { totalTokens } = calculateSealTokens(solAmount, config);
  const sealAmount = Math.floor(totalTokens * Math.pow(10, 9)); // Convert to lamports (9 decimals)
  
  // Get contributor's SEAL token account (ATA)
  const contributorTokenAccount = await getAssociatedTokenAddress(
    config.sealMint,
    contributor,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  
  // Create transaction
  const transaction = new Transaction();
  
  // Check if token account exists
  try {
    await getAccount(connection, contributorTokenAccount);
  } catch (error) {
    // Token account doesn't exist, create it
    transaction.add(
      createAssociatedTokenAccountInstruction(
        contributor, // Payer
        contributorTokenAccount, // ATA address
        contributor, // Owner
        config.sealMint, // Mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }
  
  // Get treasury token account (where SEAL tokens are held)
  const treasuryTokenAccount = await getAssociatedTokenAddress(
    config.sealMint,
    config.treasuryWallet,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  
  // Transfer SEAL tokens from treasury to contributor
  transaction.add(
    createTransferInstruction(
      treasuryTokenAccount, // Source (treasury)
      contributorTokenAccount, // Destination (contributor)
      config.treasuryWallet, // Authority (treasury)
      BigInt(sealAmount),
      [],
      TOKEN_PROGRAM_ID
    )
  );
  
  // Transfer SOL from contributor to treasury
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: contributor,
      toPubkey: config.treasuryWallet,
      lamports: solAmount * LAMPORTS_PER_SOL,
    })
  );
  
  return { transaction, sealAmount };
}

/**
 * Get presale statistics
 */
export function getPresaleStats(config: PresaleConfig): {
  totalRaised: number;
  totalContributors: number;
  remainingCap: number;
  progressPercent: number;
  tokensSold: number;
  tokensRemaining: number;
  averageContribution: number;
} {
  const tokensSold = Array.from(config.contributions.values()).reduce((sum, sol) => {
    const { totalTokens } = calculateSealTokens(sol, config);
    return sum + totalTokens;
  }, 0);
  
  const tokensRemaining = config.presaleSupply - tokensSold;
  const progressPercent = (config.totalRaised / config.totalRaiseCap) * 100;
  const averageContribution = config.totalContributors > 0
    ? config.totalRaised / config.totalContributors
    : 0;
  
  return {
    totalRaised: config.totalRaised,
    totalContributors: config.totalContributors,
    remainingCap: config.totalRaiseCap - config.totalRaised,
    progressPercent,
    tokensSold,
    tokensRemaining,
    averageContribution,
  };
}

/**
 * Check if wallet is whitelisted
 */
export function isWhitelisted(wallet: PublicKey, config: PresaleConfig): boolean {
  if (!config.whitelistEnabled) {
    return true; // No whitelist = everyone allowed
  }
  return config.whitelist.has(wallet.toString());
}

/**
 * Get wallet's contribution info
 */
export function getWalletContribution(
  wallet: PublicKey,
  config: PresaleConfig
): {
  contributed: number;
  sealTokens: number;
  canContribute: boolean;
  remainingAllowance: number;
} {
  const contributed = config.contributions.get(wallet.toString()) || 0;
  const { totalTokens } = calculateSealTokens(contributed, config);
  const remainingAllowance = config.maxPurchase - contributed;
  const canContribute = remainingAllowance > 0 && config.isActive;
  
  return {
    contributed,
    sealTokens: totalTokens,
    canContribute,
    remainingAllowance,
  };
}

