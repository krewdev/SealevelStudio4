// Whale tracking and capital flow analysis
// Monitors large wallets and predicts their trading behavior

import { Connection, PublicKey } from '@solana/web3.js';

export interface Whale {
  address: string;
  label?: string;
  totalValue: number; // SOL
  recentActivity: WhaleActivity[];
  behaviorPattern: 'accumulator' | 'distributor' | 'trader' | 'unknown';
  successRate: number; // 0-1
}

export interface WhaleActivity {
  type: 'buy' | 'sell' | 'transfer' | 'swap';
  token: string;
  amount: number;
  price?: number;
  timestamp: Date;
  profit?: number; // If we can track profit
  txSignature: string;
}

export interface WhaleSignal {
  whale: Whale;
  predictedAction: 'buy' | 'sell' | 'hold';
  targetToken?: string;
  confidence: number;
  reasoning: string;
  opportunity?: {
    type: 'follow_whale' | 'frontrun_whale' | 'backrun_whale';
    estimatedProfit: number;
    timeWindow: number;
  };
}

export class WhaleTracker {
  private connection: Connection;
  private whales: Map<string, Whale> = new Map();
  private minWhaleSize = 1000; // 1000 SOL minimum to be considered whale

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Track a whale wallet
   */
  async trackWhale(address: string): Promise<Whale | null> {
    try {
      const pubkey = new PublicKey(address);
      const balance = await this.connection.getBalance(pubkey);
      const balanceSOL = balance / 1e9;

      if (balanceSOL < this.minWhaleSize) {
        return null; // Not a whale
      }

      // Fetch recent transactions
      const signatures = await this.connection.getSignaturesForAddress(pubkey, { limit: 50 });
      const activities: WhaleActivity[] = [];

      // Analyze transactions to determine activity
      for (const sig of signatures.slice(0, 20)) {
        const tx = await this.connection.getParsedTransaction(sig.signature);
        if (tx) {
          const activity = this.parseTransaction(tx, address);
          if (activity) {
            activities.push(activity);
          }
        }
      }

      const behaviorPattern = this.analyzeBehavior(activities);
      const successRate = this.calculateSuccessRate(activities);

      const whale: Whale = {
        address,
        totalValue: balanceSOL,
        recentActivity: activities,
        behaviorPattern,
        successRate,
      };

      this.whales.set(address, whale);
      return whale;
    } catch (error) {
      console.error('Error tracking whale:', error);
      return null;
    }
  }

  /**
   * Parse transaction to extract whale activity
   */
  private parseTransaction(tx: any, whaleAddress: string): WhaleActivity | null {
    // Simplified - would need full transaction parsing
    // This is a placeholder for actual implementation
    
    if (!tx.transaction || !tx.transaction.signatures) return null;

    return {
      type: 'swap', // Would determine from transaction
      token: 'SOL',
      amount: 0,
      timestamp: new Date(tx.blockTime ? tx.blockTime * 1000 : Date.now()),
      txSignature: tx.transaction.signatures[0],
    };
  }

  /**
   * Analyze whale behavior pattern
   */
  private analyzeBehavior(activities: WhaleActivity[]): Whale['behaviorPattern'] {
    if (activities.length === 0) return 'unknown';

    const buys = activities.filter(a => a.type === 'buy').length;
    const sells = activities.filter(a => a.type === 'sell').length;

    if (buys > sells * 2) return 'accumulator';
    if (sells > buys * 2) return 'distributor';
    if (buys > 5 && sells > 5) return 'trader';
    return 'unknown';
  }

  /**
   * Calculate success rate (how often whale makes profitable trades)
   */
  private calculateSuccessRate(activities: WhaleActivity[]): number {
    const profitable = activities.filter(a => a.profit && a.profit > 0).length;
    return activities.length > 0 ? profitable / activities.length : 0;
  }

  /**
   * Predict whale's next action
   */
  async predictWhaleAction(whaleAddress: string): Promise<WhaleSignal | null> {
    const whale = this.whales.get(whaleAddress);
    if (!whale) return null;

    // Analyze recent activity to predict next move
    const recentBuys = whale.recentActivity
      .filter(a => a.type === 'buy' && Date.now() - a.timestamp.getTime() < 86400000)
      .length;
    
    const recentSells = whale.recentActivity
      .filter(a => a.type === 'sell' && Date.now() - a.timestamp.getTime() < 86400000)
      .length;

    let predictedAction: 'buy' | 'sell' | 'hold' = 'hold';
    let confidence = 0.5;
    let reasoning = '';

    if (whale.behaviorPattern === 'accumulator' && recentBuys > 0) {
      predictedAction = 'buy';
      confidence = 0.7;
      reasoning = 'Whale is in accumulation phase, likely to continue buying';
    } else if (whale.behaviorPattern === 'distributor' && recentSells > 0) {
      predictedAction = 'sell';
      confidence = 0.7;
      reasoning = 'Whale is distributing, likely to continue selling';
    } else if (whale.behaviorPattern === 'trader') {
      // More complex prediction based on patterns
      predictedAction = recentBuys > recentSells ? 'buy' : 'sell';
      confidence = 0.6;
      reasoning = 'Active trader, following recent trend';
    }

    // Generate opportunity if high confidence
    let opportunity: { type: 'follow_whale' | 'frontrun_whale' | 'backrun_whale'; estimatedProfit: number; timeWindow: number } | undefined;
    if (confidence > 0.6 && predictedAction !== 'hold') {
      opportunity = {
        type: (predictedAction === 'buy' ? 'follow_whale' : 'frontrun_whale') as 'follow_whale' | 'frontrun_whale',
        estimatedProfit: whale.successRate * 0.05, // Estimate based on success rate
        timeWindow: 60, // 1 minute window
      };
    }

    return {
      whale,
      predictedAction,
      confidence,
      reasoning,
      opportunity,
    };
  }

  /**
   * Get all tracked whales
   */
  getWhales(): Whale[] {
    return Array.from(this.whales.values());
  }

  /**
   * Get top whales by value
   */
  getTopWhales(limit: number = 10): Whale[] {
    return Array.from(this.whales.values())
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, limit);
  }
}

