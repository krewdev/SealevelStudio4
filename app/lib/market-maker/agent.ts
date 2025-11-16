/**
 * On-Chain Market Maker Agent
 * Autonomous agent with wallet that makes markets based on analytics
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import { MarketMakerConfig, MarketMakerState, MarketMakerAnalytics, MarketMakerTrade } from './types';
import { generateAnalytics } from './analytics';
import { executeTrade } from './trading';

export class MarketMakerAgent {
  private connection: Connection;
  private config: MarketMakerConfig;
  private state: MarketMakerState;
  private agentKeypair: Keypair;
  private monitoringInterval?: NodeJS.Timeout;
  private tradingInterval?: NodeJS.Timeout;

  constructor(connection: Connection, config: MarketMakerConfig) {
    this.connection = connection;
    this.config = config;
    
    // Generate or use existing agent wallet
    if (config.agentWalletSeed) {
      // Deterministic wallet from seed
      const seedBuffer = Buffer.from(config.agentWalletSeed, 'utf-8');
      this.agentKeypair = Keypair.fromSeed(seedBuffer.slice(0, 32));
    } else if (config.agentWalletAddress) {
      // Use existing wallet (would need to load keypair from secure storage)
      throw new Error('Loading existing wallet not yet implemented. Use seed for now.');
    } else {
      // Generate new wallet
      this.agentKeypair = Keypair.generate();
    }
    
    this.state = {
      isRunning: false,
      agentWallet: this.agentKeypair.publicKey.toString(),
      totalBuys: 0,
      totalSells: 0,
      currentPrice: 0,
      profit: 0,
      positions: {
        tokenBalance: 0,
        solBalance: 0,
        averageBuyPrice: 0,
        unrealizedPnL: 0,
      },
    };
  }

  /**
   * Get agent wallet address
   */
  getAgentWallet(): PublicKey {
    return this.agentKeypair.publicKey;
  }

  /**
   * Get agent wallet keypair (for signing transactions)
   * WARNING: In production, this should be stored securely
   */
  getAgentKeypair(): Keypair {
    return this.agentKeypair;
  }

  /**
   * Start the market maker agent
   */
  async start() {
    if (this.state.isRunning) {
      console.warn('Market maker agent is already running');
      return;
    }

    this.state.isRunning = true;
    
    // Fund agent wallet if needed
    await this.ensureAgentFunded();
    
    // Update initial state
    await this.updateState();
    
    // Start analytics monitoring (with Birdeye optimization)
    if (this.config.useAnalytics) {
      this.monitoringInterval = setInterval(async () => {
        await this.updateAnalytics();
      }, 30000); // Every 30 seconds
    }
    
    // Start trading based on strategy
    await this.executeStrategy();
    
    console.log(`Market maker agent started: ${this.state.agentWallet}`);
  }

  /**
   * Stop the market maker agent
   */
  async stop() {
    this.state.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.tradingInterval) {
      clearInterval(this.tradingInterval);
    }
    
    console.log('Market maker agent stopped');
  }

  /**
   * Get current state
   */
  getState(): MarketMakerState {
    return { ...this.state };
  }

  /**
   * Ensure agent wallet has sufficient funds
   */
  private async ensureAgentFunded() {
    const balance = await this.connection.getBalance(this.agentKeypair.publicKey);
    const minBalance = 0.1 * LAMPORTS_PER_SOL; // 0.1 SOL minimum
    
    if (balance < minBalance) {
      console.warn(`Agent wallet balance low: ${balance / LAMPORTS_PER_SOL} SOL`);
      // In production, would request funding from user or treasury
    }
  }

  /**
   * Update agent state (balances, positions)
   */
  private async updateState() {
    // Get SOL balance
    const solBalance = await this.connection.getBalance(this.agentKeypair.publicKey);
    this.state.positions.solBalance = solBalance / LAMPORTS_PER_SOL;
    
    // Get token balance
    try {
      const tokenMint = new PublicKey(this.config.tokenMint);
      const tokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        this.agentKeypair.publicKey
      );
      
      const account = await getAccount(this.connection, tokenAccount);
      const decimals = 9; // Would get from mint
      this.state.positions.tokenBalance = Number(account.amount) / Math.pow(10, decimals);
    } catch (error) {
      // Token account doesn't exist yet
      this.state.positions.tokenBalance = 0;
    }
    
    // Update current price
    await this.updatePrice();
  }

  /**
   * Update current token price
   */
  private async updatePrice() {
    try {
      // Use Jupiter Lite API to get price (optimized for performance)
      const response = await fetch(
        `https://lite-api.jup.ag/v6/quote?` +
        `inputMint=So11111111111111111111111111111111111111112&` +
        `outputMint=${this.config.tokenMint}&` +
        `amount=1000000000&` +
        `slippageBps=50`
      );
      
      if (response.ok) {
        const quote = await response.json();
        this.state.currentPrice = parseFloat(quote.outAmount) / 1e9;
      }
    } catch (error) {
      console.error('Failed to update price:', error);
    }
  }

  /**
   * Update analytics
   */
  private async updateAnalytics() {
    if (!this.config.useAnalytics) return;
    
    try {
      // Initialize Birdeye fetcher if available
      let birdeyeFetcher: any = undefined;
      if (process.env.NEXT_PUBLIC_BIRDEYE_API_KEY) {
        try {
          const { BirdeyeFetcher } = await import('@/app/lib/pools/fetchers/birdeye');
          birdeyeFetcher = new BirdeyeFetcher();
        } catch (error) {
          console.error('Error initializing Birdeye fetcher:', error);
        }
      }
      
      const analytics = await generateAnalytics(
        this.connection,
        this.config.tokenMint,
        this.config.analyticsWindow || 60,
        birdeyeFetcher
      );
      
      this.state.analytics = analytics;
      
      // Make trading decision based on analytics
      if (analytics.recommendations.confidence > 0.7) {
        await this.executeAnalyticsBasedTrade(analytics);
      }
    } catch (error) {
      console.error('Failed to update analytics:', error);
    }
  }

  /**
   * Execute trade based on analytics
   */
  private async executeAnalyticsBasedTrade(analytics: MarketMakerAnalytics) {
    const recommendation = analytics.recommendations;
    
    if (recommendation.action === 'hold') return;
    
    const trade: MarketMakerTrade = {
      type: recommendation.action,
      tokenMint: this.config.tokenMint,
      amount: this.config.buyAmount || 0.1, // Default 0.1 SOL
      slippage: this.config.slippageTolerance || 1,
      priorityFee: this.config.priorityFee || 10000,
      timestamp: new Date(),
    };
    
    try {
      const signature = await executeTrade(
        this.connection,
        this.agentKeypair,
        trade
      );
      
      // Update state
      if (trade.type === 'buy') {
        this.state.totalBuys++;
      } else {
        this.state.totalSells++;
      }
      
      this.state.lastTrade = {
        type: trade.type,
        price: this.state.currentPrice,
        amount: trade.amount,
        timestamp: trade.timestamp,
        signature,
      };
      
      // Update positions
      await this.updateState();
      
      console.log(`Agent executed ${trade.type}: ${signature}`);
    } catch (error) {
      console.error(`Failed to execute ${trade.type}:`, error);
    }
  }

  /**
   * Execute trading strategy
   */
  private async executeStrategy() {
    if (!this.config.enabled) return;
    
    switch (this.config.strategy) {
      case 'grid':
        await this.executeGridStrategy();
        break;
      case 'twap':
        await this.executeTWAPStrategy();
        break;
      case 'market_making':
        await this.executeMarketMakingStrategy();
        break;
      case 'dca':
        await this.executeDCAStrategy();
        break;
      default:
        console.warn(`Strategy ${this.config.strategy} not implemented`);
    }
  }

  /**
   * Grid trading strategy
   */
  private async executeGridStrategy() {
    const levels = this.config.gridLevels || 10;
    const spacing = this.config.gridSpacing || 1; // 1%
    const range = this.config.gridRange;
    
    // Place buy orders at lower prices
    // Place sell orders at higher prices
    // Adjust grid based on current price
    
    // Implementation would place limit orders at grid levels
    console.log('Grid strategy: Place orders at grid levels');
  }

  /**
   * TWAP strategy
   */
  private async executeTWAPStrategy() {
    const duration = this.config.twapDuration || 60; // 60 minutes
    const intervals = this.config.twapIntervals || 10;
    const amount = this.config.twapAmount || 1; // 1 SOL per interval
    const intervalMs = (duration * 60 * 1000) / intervals;
    
    this.tradingInterval = setInterval(async () => {
      const trade: MarketMakerTrade = {
        type: 'buy',
        tokenMint: this.config.tokenMint,
        amount,
        slippage: this.config.slippageTolerance || 1,
        priorityFee: this.config.priorityFee || 10000,
        timestamp: new Date(),
      };
      
      try {
        const signature = await executeTrade(
          this.connection,
          this.agentKeypair,
          trade
        );
        
        this.state.totalBuys++;
        this.state.lastTrade = {
          type: 'buy',
          price: this.state.currentPrice,
          amount,
          timestamp: trade.timestamp,
          signature,
        };
        
        await this.updateState();
      } catch (error) {
        console.error('TWAP trade failed:', error);
      }
    }, intervalMs);
  }

  /**
   * Market making strategy
   */
  private async executeMarketMakingStrategy() {
    const spread = this.config.spread || 0.5; // 0.5%
    const buyPrice = this.state.currentPrice * (1 - spread / 100);
    const sellPrice = this.state.currentPrice * (1 + spread / 100);
    
    // Continuously place buy and sell orders around current price
    // Adjust based on inventory and analytics
    
    const interval = setInterval(async () => {
      if (!this.state.isRunning) {
        clearInterval(interval);
        return;
      }
      
      await this.updatePrice();
      
      // Place buy order if price is below buyPrice
      // Place sell order if price is above sellPrice
      // Adjust based on analytics if enabled
      
      if (this.config.useAnalytics && this.state.analytics) {
        const recommendation = this.state.analytics.recommendations;
        if (recommendation.confidence > 0.7) {
          await this.executeAnalyticsBasedTrade(this.state.analytics);
        }
      }
    }, 10000); // Every 10 seconds
    
    this.tradingInterval = interval;
  }

  /**
   * DCA (Dollar Cost Averaging) strategy
   */
  private async executeDCAStrategy() {
    const interval = this.config.dcaInterval || 60; // 60 minutes
    const amount = this.config.dcaAmount || 0.1; // 0.1 SOL per buy
    const maxBuys = this.config.dcaMaxBuys || 10;
    let buyCount = 0;
    
    this.tradingInterval = setInterval(async () => {
      if (buyCount >= maxBuys) {
        if (this.tradingInterval) {
          clearInterval(this.tradingInterval);
        }
        return;
      }
      
      const trade: MarketMakerTrade = {
        type: 'buy',
        tokenMint: this.config.tokenMint,
        amount,
        slippage: this.config.slippageTolerance || 1,
        priorityFee: this.config.priorityFee || 10000,
        timestamp: new Date(),
      };
      
      try {
        const signature = await executeTrade(
          this.connection,
          this.agentKeypair,
          trade
        );
        
        buyCount++;
        this.state.totalBuys++;
        this.state.lastTrade = {
          type: 'buy',
          price: this.state.currentPrice,
          amount,
          timestamp: trade.timestamp,
          signature,
        };
        
        await this.updateState();
      } catch (error) {
        console.error('DCA trade failed:', error);
      }
    }, interval * 60 * 1000);
  }
}

