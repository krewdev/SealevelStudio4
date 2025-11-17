// Type definitions for liquidity pools and arbitrage detection

export type DEXProtocol = 'raydium' | 'orca' | 'jupiter' | 'meteora' | 'lifinity' | string;

export interface TokenInfo {
  mint: string;
  symbol: string;
  decimals: number;
  name?: string;
}

export interface PoolReserves {
  tokenA: bigint;
  tokenB: bigint;
}

export interface Trade {
  timestamp: Date;
  type: 'buy' | 'sell';
  amountIn: bigint;
  amountOut: bigint;
  price: number;
  txSignature?: string;
}

export interface PoolData {
  id: string;
  dex: DEXProtocol;
  tokenA: TokenInfo;
  tokenB: TokenInfo;
  reserves: PoolReserves;
  price: number; // Price of tokenA in terms of tokenB
  fee: number; // Fee in basis points (e.g., 30 = 0.3%)
  volume24h: number;
  tvl: number; // Total Value Locked in USD
  recentTrades: Trade[];
  lastUpdated: Date;
  programId?: string; // On-chain program ID
  poolAddress?: string; // Pool account address
}

export type ArbitragePathType = 'simple' | 'multi_hop' | 'wrap' | 'unwrap' | 'cross-protocol';

export interface ArbitrageStep {
  pool: PoolData;
  dex: DEXProtocol;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  amountIn: bigint;
  amountOut: bigint;
  price: number;
  fee: number;
  instruction?: any; // Optional: pre-built instruction for this step
}

export interface ArbitragePath {
  type: ArbitragePathType;
  steps: ArbitrageStep[];
  startToken: TokenInfo;
  endToken: TokenInfo;
  totalHops: number;
}

export interface ArbitrageOpportunity {
  id: string;
  path: ArbitragePath;
  type: 'simple' | 'multi_hop' | 'wrap_unwrap' | 'cross_protocol' | 'flash_loan' | 'mev';
  profit: number; // Estimated profit in SOL
  profitPercent: number; // Profit as percentage of input
  inputAmount: bigint;
  outputAmount: bigint;
  gasEstimate: number; // Estimated transaction cost in lamports
  netProfit: number; // Profit after gas costs
  confidence: number; // 0-1 confidence score
  steps: ArbitrageStep[];
  timestamp: Date;
  expiresAt?: Date; // Optional: when opportunity might expire
  jupiterQuote?: any; // Jupiter quote response for execution
  // Advanced features
  requiresFlashLoan?: boolean;
  jitoBundleId?: string;
  signalType?: 'new_pool' | 'large_swap' | 'lsd_depeg' | 'oracle_update';
}

export interface ScannerConfig {
  autoRefresh: boolean;
  refreshInterval: number; // in milliseconds
  minProfitThreshold: number; // Minimum profit in SOL to show
  minProfitPercent: number; // Minimum profit percentage
  maxHops: number; // Maximum hops for multi-hop arbitrage
  enabledDEXs: DEXProtocol[]; // Which DEXs to scan
}

export interface FetcherResult {
  pools: PoolData[];
  errors?: string[];
  lastUpdated: Date;
}

export interface ScannerState {
  pools: PoolData[];
  opportunities: ArbitrageOpportunity[];
  isScanning: boolean;
  lastScanTime: Date | null;
  errors: string[];
  config: ScannerConfig;
}

// Constants
export const WSOL_MINT = 'So11111111111111111111111111111111111111112';
export const SOL_DECIMALS = 9;

// Default scanner config
export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  autoRefresh: false,
  refreshInterval: 10000, // 10 seconds
  minProfitThreshold: 0.001, // 0.001 SOL minimum
  minProfitPercent: 0.1, // 0.1% minimum
  maxHops: 5,
  enabledDEXs: ['raydium', 'orca', 'jupiter', 'meteora', 'lifinity'],
};

