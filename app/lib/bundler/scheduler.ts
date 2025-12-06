/**
 * Bundler Test Scheduler
 * Handles scheduled transactions for test wallets (DCA buys, scheduled sells)
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { TestWallet, sendSolFromWallet, sendTokenFromWallet, getWalletBalance } from './test-utils';

export interface ScheduleConfig {
  enabled: boolean;
  intervalMinutes: number;
  amountPerBuy?: number;
  amountPerSell?: number;
  targetToken?: string;
  token?: string;
  maxBuys?: number;
  maxSells?: number;
  destinationAddress?: string; // For sells
}

export interface WalletSchedule {
  wallet: TestWallet;
  config: ScheduleConfig;
  lastExecution?: Date;
  executionCount: number;
  intervalId?: NodeJS.Timeout;
}

export class BundlerScheduler {
  private schedules: Map<string, WalletSchedule> = new Map();
  private connection: Connection;
  private isRunning: boolean = false;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Add a wallet to the scheduler
   */
  addWalletSchedule(wallet: TestWallet, config: ScheduleConfig): void {
    const scheduleId = wallet.address;
    
    // Remove existing schedule if any
    this.removeWalletSchedule(wallet.address);

    const schedule: WalletSchedule = {
      wallet,
      config,
      executionCount: 0,
    };

    this.schedules.set(scheduleId, schedule);

    // Start schedule if enabled
    if (config.enabled && this.isRunning) {
      this.startSchedule(scheduleId);
    }
  }

  /**
   * Remove a wallet from the scheduler
   */
  removeWalletSchedule(walletAddress: string): void {
    const schedule = this.schedules.get(walletAddress);
    if (schedule?.intervalId) {
      clearInterval(schedule.intervalId);
    }
    this.schedules.delete(walletAddress);
  }

  /**
   * Start all schedules
   */
  start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    
    for (const [scheduleId, schedule] of this.schedules.entries()) {
      if (schedule.config.enabled) {
        this.startSchedule(scheduleId);
      }
    }
  }

  /**
   * Stop all schedules
   */
  stop(): void {
    this.isRunning = false;
    
    for (const schedule of this.schedules.values()) {
      if (schedule.intervalId) {
        clearInterval(schedule.intervalId);
        schedule.intervalId = undefined;
      }
    }
  }

  /**
   * Start a specific schedule
   */
  private startSchedule(scheduleId: string): void {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || !schedule.config.enabled) {
      return;
    }

    // Clear existing interval if any
    if (schedule.intervalId) {
      clearInterval(schedule.intervalId);
    }

    // Execute immediately
    this.executeSchedule(scheduleId);

    // Set up interval
    const intervalMs = schedule.config.intervalMinutes * 60 * 1000;
    schedule.intervalId = setInterval(() => {
      this.executeSchedule(scheduleId);
    }, intervalMs);
  }

  /**
   * Execute a scheduled transaction
   */
  private async executeSchedule(scheduleId: string): Promise<void> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule || !schedule.config.enabled) {
      return;
    }

    // Check max execution limits
    if (schedule.config.maxBuys && schedule.executionCount >= schedule.config.maxBuys) {
      console.log(`Schedule for ${schedule.wallet.label} reached max buys (${schedule.config.maxBuys})`);
      this.removeWalletSchedule(scheduleId);
      return;
    }

    if (schedule.config.maxSells && schedule.executionCount >= schedule.config.maxSells) {
      console.log(`Schedule for ${schedule.wallet.label} reached max sells (${schedule.config.maxSells})`);
      this.removeWalletSchedule(scheduleId);
      return;
    }

    try {
      // Check wallet balance
      const balance = await getWalletBalance(this.connection, schedule.wallet);
      
      if (balance < 0.001) {
        console.warn(`Insufficient balance for ${schedule.wallet.label}: ${balance} SOL`);
        return;
      }

      // Execute based on schedule type
      if (schedule.config.amountPerBuy && schedule.config.targetToken) {
        // DCA Buy - for now, just log (would need DEX integration for actual buys)
        console.log(`[DCA Buy] ${schedule.wallet.label}: Would buy ${schedule.config.amountPerBuy} ${schedule.config.targetToken}`);
        // TODO: Implement actual DEX swap here
        schedule.executionCount++;
        schedule.lastExecution = new Date();
      } else if (schedule.config.amountPerSell && schedule.config.destinationAddress) {
        // Scheduled Sell
        const amount = schedule.config.amountPerSell;
        const token = schedule.config.token || 'SOL';
        
        if (token === 'SOL') {
          const signature = await sendSolFromWallet(this.connection, {
            fromWallet: schedule.wallet,
            toAddress: schedule.config.destinationAddress!,
            amount: amount,
          });
          console.log(`[Scheduled Sell] ${schedule.wallet.label}: Sold ${amount} SOL. Signature: ${signature}`);
        } else {
          const signature = await sendTokenFromWallet(this.connection, {
            fromWallet: schedule.wallet,
            toAddress: schedule.config.destinationAddress!,
            amount: amount,
            tokenMint: token,
          });
          console.log(`[Scheduled Sell] ${schedule.wallet.label}: Sold ${amount} ${token}. Signature: ${signature}`);
        }
        
        schedule.executionCount++;
        schedule.lastExecution = new Date();
      }
    } catch (error) {
      console.error(`Error executing schedule for ${schedule.wallet.label}:`, error);
    }
  }

  /**
   * Get all schedules
   */
  getSchedules(): WalletSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get schedule for a specific wallet
   */
  getSchedule(walletAddress: string): WalletSchedule | undefined {
    return this.schedules.get(walletAddress);
  }

  /**
   * Update schedule config
   */
  updateSchedule(walletAddress: string, config: Partial<ScheduleConfig>): void {
    const schedule = this.schedules.get(walletAddress);
    if (schedule) {
      schedule.config = { ...schedule.config, ...config };
      
      // Restart schedule if running
      if (this.isRunning && schedule.config.enabled) {
        this.startSchedule(walletAddress);
      }
    }
  }
}


