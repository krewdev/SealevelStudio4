/**
 * Pump.fun QuickNode Stream
 * Uses QuickNode WebSocket streams with filters to monitor pump.fun token launches
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { QuickNodeStreamManager, QuickNodeStreamEvent } from '../quicknode/stream';
import { PumpFunToken, PumpFunStreamEvent } from './stream';
import { PumpFunFilter, processPumpFunFilter, PumpFunFilterResult } from './quicknode-filter';

// Pump.fun Program ID (update with actual program ID)
const PUMPFUN_PROGRAM_ID = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P'; // Example - update with actual

export class PumpFunQuickNodeStream {
  private connection: Connection;
  private streamManager: QuickNodeStreamManager;
  private callbacks: Set<(event: PumpFunStreamEvent) => void> = new Set();
  private isConnected = false;

  constructor(connection: Connection) {
    this.connection = connection;
    this.streamManager = new QuickNodeStreamManager();
  }

  /**
   * Connect to pump.fun stream via QuickNode
   */
  connect(): void {
    if (this.isConnected) {
      return;
    }

    // Create filter for pump.fun program
    const filter = {
      programs: [PUMPFUN_PROGRAM_ID],
      // Also monitor transactions that interact with pump.fun accounts
      accountInclude: [
        // Add pump.fun bonding curve accounts, token mint accounts, etc.
        // These will be detected from program account changes
      ],
    };

    // Subscribe to QuickNode stream
    this.streamManager.subscribe('pumpfun', filter, (event: QuickNodeStreamEvent) => {
      this.handleStreamEvent(event);
    });

    this.isConnected = true;
    console.log('[PumpFun QuickNode Stream] Connected');
  }

  /**
   * Handle QuickNode stream events
   */
  private async handleStreamEvent(event: QuickNodeStreamEvent): Promise<void> {
    try {
      if (event.type === 'account') {
        // Account update - could be a new token mint or bonding curve account
        await this.handleAccountUpdate(event.data);
      } else if (event.type === 'transaction') {
        // Transaction - could be a token creation or buy/sell
        await this.handleTransaction(event.data);
      }
    } catch (error) {
      console.error('[PumpFun QuickNode Stream] Error handling event:', error);
    }
  }

  /**
   * Handle account updates (new token mints, bonding curve accounts)
   */
  private async handleAccountUpdate(accountData: any): Promise<void> {
    try {
      const accountPubkey = accountData.account;
      const accountInfo = accountData.value;

      if (!accountInfo || !accountInfo.data) {
        return;
      }

      // Check if this is a token mint account
      const mintPubkey = new PublicKey(accountPubkey);
      const mintInfo = await this.connection.getParsedAccountInfo(mintPubkey);

      if (mintInfo.value && 'parsed' in mintInfo.value.data) {
        const parsed = mintInfo.value.data.parsed;
        if (parsed.type === 'mint') {
          // This is a new token mint - check if it's from pump.fun
          await this.detectNewToken(mintPubkey.toBase58());
        }
      }
    } catch (error) {
      console.error('[PumpFun QuickNode Stream] Error handling account update:', error);
    }
  }

  /**
   * Handle transaction updates
   */
  private async handleTransaction(txData: any): Promise<void> {
    try {
      const transaction = txData.transaction;
      const meta = txData.meta;

      if (!transaction || !transaction.message) {
        return;
      }

      // Check if transaction involves pump.fun program
      const accountKeys = transaction.message.accountKeys || [];
      const programIndex = accountKeys.findIndex(
        (key: any) => key === PUMPFUN_PROGRAM_ID || key.pubkey === PUMPFUN_PROGRAM_ID
      );

      if (programIndex === -1) {
        return; // Not a pump.fun transaction
      }

      // Check instruction types
      const instructions = transaction.message.instructions || [];
      for (const instruction of instructions) {
        if (instruction.programId === PUMPFUN_PROGRAM_ID || 
            (typeof instruction.programId === 'object' && instruction.programId === PUMPFUN_PROGRAM_ID)) {
          
          // This is a pump.fun instruction
          // Parse instruction to determine type (create, buy, sell, etc.)
          await this.parsePumpFunInstruction(instruction, transaction, meta);
        }
      }
    } catch (error) {
      console.error('[PumpFun QuickNode Stream] Error handling transaction:', error);
    }
  }

  /**
   * Detect new token from mint account
   */
  private async detectNewToken(mintAddress: string): Promise<void> {
    try {
      // Fetch token metadata from pump.fun
      const token = await this.fetchTokenData(mintAddress);
      
      if (token) {
        const event: PumpFunStreamEvent = {
          type: 'token_created',
          token,
          timestamp: Date.now(),
        };

        this.notifyCallbacks(event);
      }
    } catch (error) {
      console.error('[PumpFun QuickNode Stream] Error detecting new token:', error);
    }
  }

  /**
   * Parse pump.fun instruction
   */
  private async parsePumpFunInstruction(
    instruction: any,
    transaction: any,
    meta: any
  ): Promise<void> {
    try {
      // Parse instruction data to determine type
      // Pump.fun instructions typically include:
      // - Create: Creates new token and bonding curve
      // - Buy: Buys tokens from bonding curve
      // - Sell: Sells tokens back to bonding curve

      // Extract mint address from instruction accounts
      const accounts = instruction.accounts || [];
      if (accounts.length > 0) {
        const mintAccount = accounts[0];
        const mintAddress = typeof mintAccount === 'string' ? mintAccount : mintAccount.pubkey;

        // Check if this is a create instruction
        if (this.isCreateInstruction(instruction)) {
          const token = await this.fetchTokenData(mintAddress);
          if (token) {
            const event: PumpFunStreamEvent = {
              type: 'token_created',
              token,
              timestamp: Date.now(),
              transactionSignature: transaction.signatures?.[0],
            };

            this.notifyCallbacks(event);
          }
        } else if (this.isBuyOrSellInstruction(instruction)) {
          // Price update or volume update
          const token = await this.fetchTokenData(mintAddress);
          if (token) {
            const event: PumpFunStreamEvent = {
              type: 'price_update',
              token,
              timestamp: Date.now(),
              transactionSignature: transaction.signatures?.[0],
            };

            this.notifyCallbacks(event);
          }
        }
      }
    } catch (error) {
      console.error('[PumpFun QuickNode Stream] Error parsing instruction:', error);
    }
  }

  /**
   * Check if instruction is a create instruction
   */
  private isCreateInstruction(instruction: any): boolean {
    // Parse instruction discriminator or data
    // Pump.fun typically uses instruction discriminators
    // This is a simplified check - adjust based on actual pump.fun instruction format
    return instruction.data && instruction.data.length > 0;
  }

  /**
   * Check if instruction is a buy or sell
   */
  private isBuyOrSellInstruction(instruction: any): boolean {
    // Similar to isCreateInstruction, check discriminator
    return instruction.data && instruction.data.length > 0;
  }

  /**
   * Fetch token data from pump.fun or on-chain
   */
  private async fetchTokenData(mintAddress: string): Promise<PumpFunToken | null> {
    try {
      // Try to fetch from pump.fun API first
      const response = await fetch(`https://frontend-api.pump.fun/coins/${mintAddress}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return this.parsePumpFunApiResponse(data);
      }

      // Fallback: Parse from on-chain data
      return await this.parseOnChainTokenData(mintAddress);
    } catch (error) {
      console.error('[PumpFun QuickNode Stream] Error fetching token data:', error);
      return null;
    }
  }

  /**
   * Parse pump.fun API response
   */
  private parsePumpFunApiResponse(data: any): PumpFunToken {
    return {
      mint: data.mint || data.address,
      name: data.name || '',
      symbol: data.symbol || '',
      uri: data.uri || data.metadataUri || '',
      description: data.description,
      image: data.imageUri || data.image,
      creator: data.creator || data.creatorWallet || '',
      createdAt: data.createdTimestamp || data.createdAt || Date.now(),
      marketCap: parseFloat(data.marketCap || data.usd_market_cap || '0'),
      volume24h: parseFloat(data.volume24h || data.volume_24h || '0'),
      price: parseFloat(data.priceUsd || data.price || '0'),
      priceChange24h: parseFloat(data.priceChange24h || data.price_change_24h || '0'),
      holders: parseInt(data.holderCount || data.holders || '0'),
      liquidity: parseFloat(data.liquidity || data.liquidityUsd || '0'),
      bondingCurveProgress: parseFloat(data.bondingCurveProgress || data.bonding_curve_progress || '0'),
      raydiumPool: data.raydiumPool || data.raydium_pool,
      socialLinks: {
        twitter: data.twitter || data.twitterUrl,
        telegram: data.telegram || data.telegramUrl,
        website: data.website || data.websiteUrl,
      },
    };
  }

  /**
   * Parse token data from on-chain
   */
  private async parseOnChainTokenData(mintAddress: string): Promise<PumpFunToken | null> {
    try {
      const mintPubkey = new PublicKey(mintAddress);
      const mintInfo = await this.connection.getParsedAccountInfo(mintPubkey);

      if (!mintInfo.value || !('parsed' in mintInfo.value.data)) {
        return null;
      }

      const parsed = mintInfo.value.data.parsed;
      if (parsed.type !== 'mint') {
        return null;
      }

      // Basic token info from on-chain
      return {
        mint: mintAddress,
        name: '',
        symbol: '',
        uri: '',
        creator: '',
        createdAt: Date.now(),
        marketCap: 0,
        volume24h: 0,
        price: 0,
        priceChange24h: 0,
        holders: 0,
        liquidity: 0,
        bondingCurveProgress: 0,
      };
    } catch (error) {
      console.error('[PumpFun QuickNode Stream] Error parsing on-chain data:', error);
      return null;
    }
  }

  /**
   * Subscribe to stream events
   */
  onEvent(callback: (event: PumpFunStreamEvent) => void): () => void {
    this.callbacks.add(callback);

    // Auto-connect if not connected
    if (!this.isConnected) {
      this.connect();
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
      if (this.callbacks.size === 0) {
        this.disconnect();
      }
    };
  }

  /**
   * Notify all callbacks
   */
  private notifyCallbacks(event: PumpFunStreamEvent): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('[PumpFun QuickNode Stream] Callback error:', error);
      }
    });
  }

  /**
   * Disconnect from stream
   */
  disconnect(): void {
    this.streamManager.disconnect('pumpfun');
    this.isConnected = false;
    this.callbacks.clear();
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean } {
    const status = this.streamManager.getStatus('pumpfun');
    return {
      connected: status.connected && this.isConnected,
    };
  }
}










