/**
 * SEAL Token Presale on MultiversX
 * Handles presale logic, EGLD contributions, and token calculation.
 * Same 3-tier structure and vesting as Solana presale.
 */

import {
  calculatePresaleEndTime,
  getPresaleStartTime,
} from './presale';

/** EGLD has 18 decimals (1 EGLD = 10^18 wei) */
export const EGLD_DECIMALS = 18;
export const DENOMINATION = BigInt(10) ** BigInt(EGLD_DECIMALS);

export interface PresaleMultiversXConfig {
  startTime: Date;
  endTime: Date;
  isActive: boolean;

  presaleSupply: number;
  minPurchase: number;   // EGLD
  maxPurchase: number;   // EGLD per wallet
  totalRaiseCap: number; // EGLD

  pricePerSeal: number;  // EGLD per SEAL
  bonusTiers: { amount: number; bonusPercent: number }[];

  whitelistEnabled: boolean;
  whitelist: Set<string>;

  treasuryAddress: string; // erd1...
  sealTokenId: string | null; // ESDT token id when deployed on MultiversX

  totalRaised: number;
  totalContributors: number;
  contributions: Map<string, number>;
}

const defaultStartTime = getPresaleStartTime();
export const DEFAULT_PRESALE_MULTIVERX_CONFIG: PresaleMultiversXConfig = {
  startTime: defaultStartTime,
  endTime: calculatePresaleEndTime(defaultStartTime),
  isActive: false,

  presaleSupply: 300_000_000,
  minPurchase: 0.1,
  maxPurchase: 1000,
  totalRaiseCap: 10_000,

  pricePerSeal: 0.00005, // ~20,000 SEAL per EGLD (tuned for EGLD)
  bonusTiers: [
    { amount: 1, bonusPercent: 15 },
    { amount: 10, bonusPercent: 25 },
    { amount: 50, bonusPercent: 35 },
  ],

  whitelistEnabled: false,
  whitelist: new Set(),

  treasuryAddress: '',
  sealTokenId: null,

  totalRaised: 0,
  totalContributors: 0,
  contributions: new Map(),
};

export function calculateSealTokensMultiversX(
  egldAmount: number,
  config: PresaleMultiversXConfig
): { baseTokens: number; bonusTokens: number; totalTokens: number; bonusPercent: number } {
  const baseTokens = egldAmount / config.pricePerSeal;
  let bonusPercent = 0;
  for (let i = config.bonusTiers.length - 1; i >= 0; i--) {
    if (egldAmount >= config.bonusTiers[i].amount) {
      bonusPercent = config.bonusTiers[i].bonusPercent;
      break;
    }
  }
  const bonusTokens = baseTokens * (bonusPercent / 100);
  const totalTokens = baseTokens + bonusTokens;
  return { baseTokens, bonusTokens, totalTokens, bonusPercent };
}

export function validateContributionMultiversX(
  walletAddress: string,
  egldAmount: number,
  config: PresaleMultiversXConfig
): { valid: boolean; error?: string } {
  const now = new Date();
  if (!config.isActive) return { valid: false, error: 'Presale is not active' };
  if (now < config.startTime) return { valid: false, error: 'Presale has not started yet' };
  if (now > config.endTime) return { valid: false, error: 'Presale has ended' };
  if (egldAmount < config.minPurchase) return { valid: false, error: `Minimum purchase is ${config.minPurchase} EGLD` };
  if (egldAmount > config.maxPurchase) return { valid: false, error: `Maximum purchase is ${config.maxPurchase} EGLD per wallet` };
  if (config.whitelistEnabled && !config.whitelist.has(walletAddress)) return { valid: false, error: 'Wallet is not whitelisted' };

  const existing = config.contributions.get(walletAddress) || 0;
  const total = existing + egldAmount;
  if (total > config.maxPurchase) return { valid: false, error: `Total contribution would exceed maximum of ${config.maxPurchase} EGLD` };
  if (config.totalRaised + egldAmount > config.totalRaiseCap) return { valid: false, error: 'Presale raise cap would be exceeded' };

  return { valid: true };
}

export function getWalletContributionMultiversX(
  walletAddress: string,
  config: PresaleMultiversXConfig
): {
  contributed: number;
  sealTokens: number;
  canContribute: boolean;
  remainingAllowance: number;
  tier: 'tier1' | 'tier2' | 'tier3' | null;
} {
  const contributed = config.contributions.get(walletAddress) || 0;
  const { totalTokens } = calculateSealTokensMultiversX(contributed, config);
  const remainingAllowance = config.maxPurchase - contributed;
  const canContribute = remainingAllowance > 0 && config.isActive;

  let tier: 'tier1' | 'tier2' | 'tier3' | null = null;
  if (contributed >= 50) tier = 'tier3';
  else if (contributed >= 10) tier = 'tier2';
  else if (contributed >= 1) tier = 'tier1';

  return { contributed, sealTokens: totalTokens, canContribute, remainingAllowance, tier };
}

export function getPresaleStatsMultiversX(config: PresaleMultiversXConfig): {
  totalRaised: number;
  totalContributors: number;
  remainingCap: number;
  progressPercent: number;
  tokensSold: number;
  tokensRemaining: number;
  averageContribution: number;
} {
  const tokensSold = Array.from(config.contributions.values()).reduce((sum, egld) => {
    const { totalTokens } = calculateSealTokensMultiversX(egld, config);
    return sum + totalTokens;
  }, 0);
  const tokensRemaining = config.presaleSupply - tokensSold;
  const progressPercent = config.totalRaiseCap > 0 ? (config.totalRaised / config.totalRaiseCap) * 100 : 0;
  const averageContribution = config.totalContributors > 0 ? config.totalRaised / config.totalContributors : 0;

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

export function isWhitelistedMultiversX(walletAddress: string, config: PresaleMultiversXConfig): boolean {
  if (!config.whitelistEnabled) return true;
  return config.whitelist.has(walletAddress);
}

/** Convert EGLD amount to wei (string for API) */
export function egldToWei(egld: number): string {
  const wei = BigInt(Math.floor(egld * Number(DENOMINATION)));
  return wei.toString();
}

/** Convert wei to EGLD */
export function weiToEgld(wei: string | bigint): number {
  const w = typeof wei === 'string' ? BigInt(wei) : wei;
  return Number(w) / Number(DENOMINATION);
}
