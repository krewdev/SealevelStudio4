// Solana Lending Protocol Registry
// All major audited lending protocols that support flash loans

import { PublicKey } from '@solana/web3.js';

export interface LendingProtocol {
  id: string;
  name: string;
  programId: PublicKey;
  flashLoanProgramId: PublicKey | null;
  website: string;
  auditStatus: 'audited' | 'partially-audited' | 'unaudited';
  auditReports: string[];
  supportedTokens: string[]; // Token mint addresses
  flashLoanFeeBps: number; // Fee in basis points (e.g., 5 = 0.05%)
  maxLoanAmount?: bigint; // Maximum loan amount (if applicable)
  minLoanAmount?: bigint; // Minimum loan amount
  description: string;
  features: string[];
}

// Major Solana Lending Protocols
export const LENDING_PROTOCOLS: LendingProtocol[] = [
  {
    id: 'kamino',
    name: 'Kamino Finance',
    programId: new PublicKey('KLend2g3cP87fffoy8q1mQqGKjLj1d1M24gM4RdR7Kx'),
    flashLoanProgramId: new PublicKey('KLend2g3cP87fffoy8q1mQqGKjLj1d1M24gM4RdR7Kx'), // Same program
    website: 'https://kamino.finance',
    auditStatus: 'audited',
    auditReports: [
      'https://github.com/kamino-finance/audits',
      'https://kamino.finance/security'
    ],
    supportedTokens: [
      'So11111111111111111111111111111111111111112', // SOL (wSOL)
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
      '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utBjxDKyWSARGX', // SEI
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', // BONK
    ],
    flashLoanFeeBps: 5, // 0.05%
    description: 'Kamino is a leading DeFi protocol on Solana offering lending, liquidity provision, and flash loans. Known for capital efficiency and low fees.',
    features: [
      'Flash loans',
      'Lending/borrowing',
      'Liquidity provision',
      'Yield farming',
      'Leveraged positions'
    ]
  },
  {
    id: 'solend',
    name: 'Solend',
    programId: new PublicKey('So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'),
    flashLoanProgramId: new PublicKey('So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo'),
    website: 'https://solend.fi',
    auditStatus: 'audited',
    auditReports: [
      'https://github.com/solendprotocol/audits',
      'https://solend.fi/security'
    ],
    supportedTokens: [
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
    ],
    flashLoanFeeBps: 9, // 0.09%
    description: 'Solend is one of the largest lending protocols on Solana, offering flash loans and traditional lending/borrowing services.',
    features: [
      'Flash loans',
      'Lending/borrowing',
      'Isolated pools',
      'Governance token (SLND)'
    ]
  },
  {
    id: 'marginfi',
    name: 'Marginfi',
    programId: new PublicKey('MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FyN1mBwtbH4'),
    flashLoanProgramId: new PublicKey('MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FyN1mBwtbH4'),
    website: 'https://marginfi.com',
    auditStatus: 'audited',
    auditReports: [
      'https://github.com/mrgnlabs/audits',
      'https://docs.marginfi.com/security'
    ],
    supportedTokens: [
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // mSOL
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // JUP
    ],
    flashLoanFeeBps: 8, // 0.08%
    description: 'Marginfi is a capital-efficient lending protocol with flash loan support and advanced risk management.',
    features: [
      'Flash loans',
      'Lending/borrowing',
      'Cross-collateralization',
      'Risk management'
    ]
  },
  {
    id: 'jupiter',
    name: 'Jupiter Flash Loans',
    programId: new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
    flashLoanProgramId: new PublicKey('JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'),
    website: 'https://jup.ag',
    auditStatus: 'audited',
    auditReports: [
      'https://github.com/jup-ag/audits',
      'https://docs.jup.ag/security'
    ],
    supportedTokens: [
      // Jupiter supports flash loans for all tokens in their liquidity pools
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
      // ... many more via their aggregator
    ],
    flashLoanFeeBps: 10, // 0.10%
    description: 'Jupiter offers flash loans through their aggregator, supporting a wide range of tokens across multiple DEXs.',
    features: [
      'Flash loans',
      'Token swaps',
      'Multi-hop routing',
      'Aggregator integration'
    ]
  },
  {
    id: 'mango',
    name: 'Mango Markets',
    programId: new PublicKey('4MangoMjqJ2firMokCjjGgoK8d4MXcrgL7XJaL3w6fVg'),
    flashLoanProgramId: new PublicKey('4MangoMjqJ2firMokCjjGgoK8d4MXcrgL7XJaL3w6fVg'),
    website: 'https://mango.markets',
    auditStatus: 'audited',
    auditReports: [
      'https://github.com/blockworks-foundation/audits',
      'https://docs.mango.markets/security'
    ],
    supportedTokens: [
      'So11111111111111111111111111111111111111112', // SOL
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', // USDT
    ],
    flashLoanFeeBps: 12, // 0.12%
    description: 'Mango Markets is a decentralized trading platform offering spot, perpetuals, and flash loans.',
    features: [
      'Flash loans',
      'Spot trading',
      'Perpetual futures',
      'Lending/borrowing'
    ]
  }
];

/**
 * Get a lending protocol by ID
 */
export function getLendingProtocol(id: string): LendingProtocol | undefined {
  return LENDING_PROTOCOLS.find(p => p.id === id);
}

/**
 * Get all audited protocols
 */
export function getAuditedProtocols(): LendingProtocol[] {
  return LENDING_PROTOCOLS.filter(p => p.auditStatus === 'audited');
}

/**
 * Get protocols that support a specific token
 */
export function getProtocolsForToken(tokenMint: string): LendingProtocol[] {
  return LENDING_PROTOCOLS.filter(p => 
    p.supportedTokens.includes(tokenMint) || 
    p.id === 'jupiter' // Jupiter supports all tokens via aggregator
  );
}

/**
 * Get protocol with lowest flash loan fee for a token
 */
export function getBestFlashLoanProtocol(tokenMint: string): LendingProtocol | null {
  const protocols = getProtocolsForToken(tokenMint);
  if (protocols.length === 0) return null;
  
  return protocols.reduce((best, current) => 
    current.flashLoanFeeBps < best.flashLoanFeeBps ? current : best
  );
}

