/**
 * Staking Providers
 * List of available Solana staking providers
 */

export interface StakingProvider {
  id: string;
  name: string;
  description: string;
  apy: string; // Estimated APY
  tokenSymbol: string; // Liquid staking token symbol (e.g., mSOL, jitoSOL)
  programId: string;
  templateId?: string; // Instruction template ID
  website?: string;
  features: string[];
}

export const STAKING_PROVIDERS: StakingProvider[] = [
  {
    id: 'marinade',
    name: 'Marinade Finance',
    description: 'Liquid staking on Solana. Deposit SOL to receive mSOL (liquid staking token).',
    apy: '~6.5%',
    tokenSymbol: 'mSOL',
    programId: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
    templateId: 'marinade_deposit',
    website: 'https://marinade.finance',
    features: [
      'Liquid staking token (mSOL)',
      'No lock-up period',
      'Can trade mSOL on DEXs',
      'Auto-compounding rewards',
    ],
  },
  {
    id: 'jito',
    name: 'Jito Staking',
    description: 'Stake SOL with Jito validators. Receive jitoSOL (liquid staking token).',
    apy: '~7.5%',
    tokenSymbol: 'jitoSOL',
    programId: 'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb',
    website: 'https://jito.wtf',
    features: [
      'Liquid staking token (jitoSOL)',
      'MEV rewards',
      'No lock-up period',
      'High validator performance',
    ],
  },
  {
    id: 'lido',
    name: 'Lido',
    description: 'Liquid staking on Solana. Deposit SOL to receive stSOL.',
    apy: '~6.8%',
    tokenSymbol: 'stSOL',
    programId: 'CrX7kMhLC3cSsXJdT7JDgqrRVWGnUpX3gfEfxxU2NVLi',
    website: 'https://lido.fi',
    features: [
      'Liquid staking token (stSOL)',
      'No lock-up period',
      'Multi-chain support',
      'Established protocol',
    ],
  },
  {
    id: 'native',
    name: 'Native Solana Staking',
    description: 'Direct staking with Solana validators. Requires validator selection.',
    apy: '~6-8%',
    tokenSymbol: 'SOL',
    programId: 'Stake11111111111111111111111111111111111111',
    features: [
      'Direct validator staking',
      'Full control over validator selection',
      'No intermediary token',
      'Requires validator research',
    ],
  },
];

/**
 * Get staking provider by ID
 */
export function getStakingProvider(id: string): StakingProvider | undefined {
  return STAKING_PROVIDERS.find(p => p.id === id);
}

/**
 * Get all staking providers
 */
export function getAllStakingProviders(): StakingProvider[] {
  return STAKING_PROVIDERS;
}

