/**
 * Pump.fun Stream Handler
 * Real-time monitoring of new token launches on pump.fun
 */

import { Connection, PublicKey } from '@solana/web3.js';

export interface PumpFunToken {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  description?: string;
  image?: string;
  creator: string;
  createdAt: number;
  marketCap: number;
  volume24h: number;
  price: number;
  priceChange24h: number;
  holders: number;
  liquidity: number;
  bondingCurveProgress: number; // 0-100, when 100% moves to Raydium
  raydiumPool?: string; // Pool address if graduated
  socialLinks?: {
    twitter?: string;
    telegram?: string;
    website?: string;
  };
}

export interface PumpFunStreamEvent {
  type: 'token_created' | 'token_updated' | 'token_graduated' | 'price_update';
  token: PumpFunToken;
  timestamp: number;
  transactionSignature?: string;
}

export class PumpFunStream {
  private connection: Connection;
  private ws: WebSocket | null = null;
  private callbacks: Set<(event: PumpFunStreamEvent) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private isConnected = false;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Connect to pump.fun WebSocket stream
   * Now uses QuickNode streams with pump.fun filter
   */
  connect(): void {
    try {
      // Use QuickNode stream if available, otherwise fallback to direct WebSocket
      const useQuickNode = !!process.env.QUICKNODE_API_KEY || !!process.env.NEXT_PUBLIC_QUICKNODE_WS_URL;
      
      if (useQuickNode) {
        // Import and use QuickNode stream (will be handled by PumpFunQuickNodeStream)
        console.log('[PumpFun Stream] Using QuickNode stream with pump.fun filter');
        // The actual connection is handled by PumpFunQuickNodeStream
        return;
      }

      // Fallback to direct WebSocket (if pump.fun provides one)
      const wsUrl = process.env.NEXT_PUBLIC_PUMPFUN_WS_URL || 'wss://pumpfun-api.com/stream';
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[PumpFun Stream] Connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Subscribe to new token launches
        this.ws?.send(JSON.stringify({
          method: 'subscribe',
          params: {
            channel: 'new_tokens',
            filters: {
              // Optional filters
            }
          }
        }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[PumpFun Stream] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[PumpFun Stream] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('[PumpFun Stream] Connection closed');
        this.isConnected = false;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('[PumpFun Stream] Failed to connect:', error);
      this.attemptReconnect();
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: any): void {
    if (data.type === 'token_created' || data.type === 'new_token') {
      const token = this.parseToken(data.token || data);
      const event: PumpFunStreamEvent = {
        type: 'token_created',
        token,
        timestamp: Date.now(),
        transactionSignature: data.signature,
      };
      this.notifyCallbacks(event);
    } else if (data.type === 'price_update') {
      const token = this.parseToken(data.token);
      const event: PumpFunStreamEvent = {
        type: 'price_update',
        token,
        timestamp: Date.now(),
      };
      this.notifyCallbacks(event);
    } else if (data.type === 'token_graduated') {
      const token = this.parseToken(data.token);
      const event: PumpFunStreamEvent = {
        type: 'token_graduated',
        token: {
          ...token,
          raydiumPool: data.raydiumPool,
        },
        timestamp: Date.now(),
      };
      this.notifyCallbacks(event);
    }
  }

  /**
   * Parse token data from API response
   */
  private parseToken(data: any): PumpFunToken {
    return {
      mint: data.mint || data.tokenMint || '',
      name: data.name || '',
      symbol: data.symbol || '',
      uri: data.uri || data.metadataUri || '',
      description: data.description,
      image: data.image || data.imageUri,
      creator: data.creator || data.creatorWallet || '',
      createdAt: data.createdAt || data.timestamp || Date.now(),
      marketCap: parseFloat(data.marketCap || data.market_cap || '0'),
      volume24h: parseFloat(data.volume24h || data.volume_24h || '0'),
      price: parseFloat(data.price || '0'),
      priceChange24h: parseFloat(data.priceChange24h || data.price_change_24h || '0'),
      holders: parseInt(data.holders || data.holder_count || '0'),
      liquidity: parseFloat(data.liquidity || '0'),
      bondingCurveProgress: parseFloat(data.bondingCurveProgress || data.bonding_curve_progress || '0'),
      raydiumPool: data.raydiumPool || data.raydium_pool,
      socialLinks: data.socialLinks || data.social_links,
    };
  }

  /**
   * Subscribe to stream events
   */
  onEvent(callback: (event: PumpFunStreamEvent) => void): () => void {
    this.callbacks.add(callback);
    
    // Auto-connect if not connected
    if (!this.isConnected && !this.ws) {
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
   * Notify all callbacks of an event
   */
  private notifyCallbacks(event: PumpFunStreamEvent): void {
    this.callbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[PumpFun Stream] Callback error:', error);
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[PumpFun Stream] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`[PumpFun Stream] Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from stream
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.callbacks.clear();
  }

  /**
   * Get current connection status
   */
  getStatus(): { connected: boolean; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}

