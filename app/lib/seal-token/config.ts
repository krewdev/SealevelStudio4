// SEAL Token Configuration
// Native token for Sealevel Studio application

import { PublicKey } from '@solana/web3.js';

/**
 * SEAL Token Configuration
 * 
 * SEAL is the native utility token for Sealevel Studio.
 * Users must spend SEAL tokens to use premium features:
 * - Arbitrage Scanner scans
 * - Transaction Simulations
 * - AI Agent queries
 * - Code Exports
 * - Advanced transaction building
 */

// Token Metadata
export const SEAL_TOKEN_CONFIG = {
  // Basic Token Info
  name: 'Sealevel Studio Token',
  symbol: 'SEAL',
  decimals: 9, // Standard Solana token decimals
  
  // Mint Configuration
  // Note: In production, mint address should be deterministic or stored securely
  // For now, this will be generated on first initialization
  mintAddress: null as string | null, // Will be set after mint creation
  
  // Supply Configuration
  totalSupply: 1_000_000_000, // 1 billion SEAL tokens (1,000,000,000 with 9 decimals)
  initialDistribution: {
    presale: 300_000_000, // 30% - Presale allocation
    staffInsiders: 300_000_000, // 30% - Staff and insiders (vested)
    liquidity: 200_000_000, // 20% - Initial liquidity pools
    treasury: 200_000_000, // 20% - Treasury vault for operations
  },
  
  // Authority Configuration
  mintAuthority: null as string | null, // Will be set to treasury address
  freezeAuthority: null, // No freeze authority (tokens cannot be frozen)
  
  // Token-2022 Features (optional, can be enabled later)
  useToken2022: false, // Start with standard SPL Token

  // Tax Configuration (applied on every trade)
  taxConfig: {
    enabled: true,
    initialTaxRate: 500, // 5% (basis points: 500/10000 = 0.05)
    taxDecayRate: 10, // Tax decreases by 0.1% per day
    minTaxRate: 100, // Minimum 1% tax rate
    taxPools: {
      treasury: 50, // 50% of tax goes to treasury
      liquidity: 30, // 30% goes to liquidity pool
      rewards: 20, // 20% goes to staking rewards
    },
  },

  // Vesting Configuration for presale allocations
  vestingPeriods: {
    week1: { duration: 7 * 24 * 60 * 60 * 1000, label: '1 Week' },
    week3: { duration: 21 * 24 * 60 * 60 * 1000, label: '3 Weeks' },
    month1: { duration: 30 * 24 * 60 * 60 * 1000, label: '1 Month' },
  },
  
  // Metaplex Metadata
  metadata: {
    name: 'Sealevel Studio Token',
    symbol: 'SEAL',
    description: 'The native utility token for Sealevel Studio - a comprehensive Solana transaction builder and R&D platform.',
    image: '/sea-level-logo.png', // Use the round Sealevel logo
    externalUrl: 'https://sealevel.studio',
    attributes: [
      { trait_type: 'Type', value: 'Utility Token' },
      { trait_type: 'Platform', value: 'Solana' },
      { trait_type: 'Use Case', value: 'Application Access' },
    ],
  },
  
  // Treasury Configuration
  treasury: {
    address: null as string | null, // Treasury wallet address (will be set)
    purpose: 'Hold SEAL tokens for operations, rewards, and feature access',
  },
  
  // Distribution Schedule (for vesting)
  vesting: {
    team: {
      total: 200_000_000,
      cliff: 6, // 6 months cliff
      duration: 24, // 24 months total vesting
      startDate: null as Date | null, // Will be set on deployment
    },
  },
};

// Token Economics (pricing per feature)
export const SEAL_TOKEN_ECONOMICS = {
  // Feature Pricing (in SEAL tokens)
  pricing: {
    // Existing features (freemium)
    scanner_scan: 10, // 10 SEAL per scan
    scanner_auto_refresh: 5, // 5 SEAL per hour of auto-refresh
    simulation: 20, // 20 SEAL per simulation
    ai_query: 5, // 5 SEAL per AI query
    code_export: 50, // 50 SEAL per code export
    advanced_transaction: 100, // 100 SEAL per advanced transaction build
    
    // New premium services (NOT in freemium)
    bundler_multi_send: 500, // 500 SEAL per multi-send transaction
    bundler_recipient: 10, // 10 SEAL per recipient (additional)
    market_maker_setup: 2000, // 2000 SEAL to set up market maker agent
    market_maker_monthly: 5000, // 5000 SEAL per month for market maker
    market_maker_trade: 50, // 50 SEAL per trade executed
    telegram_bot_setup: 1000, // 1000 SEAL to set up Telegram bot
    telegram_bot_monthly: 2000, // 2000 SEAL per month
    telegram_bot_post: 5, // 5 SEAL per post
    twitter_bot_setup: 1500, // 1500 SEAL to set up Twitter bot
    twitter_bot_monthly: 3000, // 3000 SEAL per month
    twitter_bot_tweet: 10, // 10 SEAL per tweet
  },
  
  // Beta tester perks
  beta_tester: {
    airdrop_amount: 10000, // 10,000 SEAL airdrop (reserved on mint, claimable with cNFT)
    discount_percentage: 25, // 25% discount on all services
    free_bundler_transactions: 5, // 5 free multi-send transactions
    // Removed: free_market_maker_month (no longer offered)
    free_bot_setup: true, // Free bot setup (one-time)
  },
  
  // Subscription Tiers
  subscriptions: {
    free: {
      name: 'Free',
      price: 0, // Free tier
      features: {
        scannerScans: 5, // 5 free scans per day
        simulations: 3, // 3 free simulations per day
        aiQueries: 10, // 10 free AI queries per day
        codeExports: 2, // 2 free exports per day
      },
    },
    basic: {
      name: 'Basic',
      price: 1000, // 1000 SEAL per month
      features: {
        scannerScans: 50, // 50 scans per day
        simulations: 20, // 20 simulations per day
        aiQueries: 100, // 100 AI queries per day
        codeExports: 10, // 10 exports per day
      },
    },
    pro: {
      name: 'Pro',
      price: 5000, // 5000 SEAL per month
      features: {
        scannerScans: -1, // Unlimited
        simulations: -1, // Unlimited
        aiQueries: -1, // Unlimited
        codeExports: -1, // Unlimited
      },
    },
  },
  
  // Bulk Discounts
  bulkDiscounts: {
    scannerScans: {
      '100': 0.1, // 10% off for 100+ scans
      '500': 0.15, // 15% off for 500+ scans
      '1000': 0.2, // 20% off for 1000+ scans
    },
  },
  
  // Referral Rewards
  referral: {
    referrerReward: 100, // 100 SEAL for referring a user
    refereeReward: 50, // 50 SEAL for new user signup
  },
};

// Helper function to get SEAL mint address
export function getSealMintAddress(): PublicKey | null {
  if (!SEAL_TOKEN_CONFIG.mintAddress) {
    return null;
  }
  try {
    return new PublicKey(SEAL_TOKEN_CONFIG.mintAddress);
  } catch {
    return null;
  }
}

// Helper function to set SEAL mint address (after creation)
export function setSealMintAddress(address: string): void {
  SEAL_TOKEN_CONFIG.mintAddress = address;
}

// Helper function to get treasury address
export function getTreasuryAddress(): PublicKey | null {
  if (!SEAL_TOKEN_CONFIG.treasury.address) {
    return null;
  }
  try {
    return new PublicKey(SEAL_TOKEN_CONFIG.treasury.address);
  } catch {
    return null;
  }
}

// Helper function to set treasury address
export function setTreasuryAddress(address: string): void {
  SEAL_TOKEN_CONFIG.treasury.address = address;
}

// Helper function to calculate feature cost
export function getFeatureCost(feature: string): number {
  const pricing = SEAL_TOKEN_ECONOMICS.pricing as Record<string, number>;
  return pricing[feature] || 0;
}

// Helper function to format SEAL amount (with decimals)
export function formatSealAmount(lamports: number | bigint): string {
  const amount = typeof lamports === 'bigint' ? Number(lamports) : lamports;
  const seal = amount / Math.pow(10, SEAL_TOKEN_CONFIG.decimals);
  return seal.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: SEAL_TOKEN_CONFIG.decimals,
  });
}

// Helper function to parse SEAL amount (to lamports)
export function parseSealAmount(seal: string | number): bigint {
  const amount = typeof seal === 'string' ? parseFloat(seal) : seal;
  return BigInt(Math.floor(amount * Math.pow(10, SEAL_TOKEN_CONFIG.decimals)));
}

