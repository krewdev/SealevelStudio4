/**
 * Market Maker Agent Types
 * On-chain agent with wallet that makes markets based on analytics
 */

export type TradingStrategy = 'grid' | 'twap' | 'market_making' | 'dca' | 'custom';

export interface MarketMakerConfig {
  tokenMint: string;
  tokenSymbol?: string;
  strategy: TradingStrategy;
  
  // Agent Wallet (on-chain)
  agentWalletAddress?: string; // If not provided, will create new
  agentWalletSeed?: string; // For deterministic wallet generation
  
  // Grid Strategy
  gridLevels?: number; // Number of price levels
  gridSpacing?: number; // Percentage between levels
  gridRange?: { min: number; max: number }; // Price range
  
  // TWAP Strategy
  twapDuration?: number; // Minutes
  twapIntervals?: number; // Number of intervals
  twapAmount?: number; // SOL per interval
  
  // Market Making
  spread?: number; // Bid-ask spread percentage
  minSpread?: number; // Minimum spread
  maxSpread?: number; // Maximum spread
  maxPosition?: number; // Maximum position size in SOL
  minPosition?: number; // Minimum position size
  
  // DCA Strategy
  dcaInterval?: number; // Minutes between buys
  dcaAmount?: number; // SOL per buy
  dcaMaxBuys?: number; // Maximum number of buys
  
  // General
  buyAmount?: number; // SOL per buy order
  sellAmount?: number; // SOL per sell order
  slippageTolerance?: number; // Percentage
  priorityFee?: number;
  enabled?: boolean;
  
  // Analytics
  useAnalytics?: boolean; // Use agent's own analytics
  analyticsWindow?: number; // Minutes of historical data
  priceDeviationThreshold?: number; // Percentage for alerts
}

export interface MarketMakerState {
  isRunning: boolean;
  agentWallet: string; // Agent wallet address
  totalBuys: number;
  totalSells: number;
  currentPrice: number;
  profit: number; // Total profit in SOL
  positions: {
    tokenBalance: number;
    solBalance: number;
    averageBuyPrice: number;
    unrealizedPnL: number;
  };
  lastTrade?: {
    type: 'buy' | 'sell';
    price: number;
    amount: number;
    timestamp: Date;
    signature: string;
  };
  analytics?: {
    priceHistory: Array<{ price: number; timestamp: Date }>;
    volume24h: number;
    volatility: number;
    trend: 'up' | 'down' | 'sideways';
  };
}

export interface MarketMakerTrade {
  type: 'buy' | 'sell';
  tokenMint: string;
  amount: number; // SOL amount
  expectedTokens?: number; // Expected tokens to receive
  slippage: number;
  priorityFee: number;
  timestamp: Date;
}

export interface MarketMakerAnalytics {
  priceHistory: Array<{ price: number; timestamp: Date }>;
  volume24h: number;
  buyVolume24h: number;
  sellVolume24h: number;
  volatility: number; // Percentage
  trend: 'up' | 'down' | 'sideways';
  supportLevel?: number;
  resistanceLevel?: number;
  rsi?: number; // Relative Strength Index
  recommendations: {
    action: 'buy' | 'sell' | 'hold';
    confidence: number; // 0-1
    reason: string;
  };
}

