// WebSocket manager for real-time pool state updates
// Provides real-time price and liquidity updates for arbitrage opportunities

import { Connection, PublicKey } from '@solana/web3.js';
import { PoolData, DEXProtocol } from './types';

export interface PoolUpdate {
  poolId: string;
  dex: DEXProtocol;
  price: number;
  reserveA: bigint;
  reserveB: bigint;
  volume24h?: number;
  timestamp: Date;
}

export type PoolUpdateCallback = (update: PoolUpdate) => void;

export class PoolWebSocketManager {
  private connections: Map<string, WebSocket> = new Map();
  private callbacks: Map<string, Set<PoolUpdateCallback>> = new Map();
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  /**
   * Subscribe to real-time updates for a specific pool
   */
  subscribe(
    poolId: string,
    dex: DEXProtocol,
    callback: PoolUpdateCallback
  ): () => void {
    const key = `${dex}:${poolId}`;
    
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, new Set());
    }
    
    this.callbacks.get(key)!.add(callback);
    
    // Start WebSocket connection if not already connected
    if (!this.connections.has(key)) {
      this.connect(key, dex, poolId);
    }
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(key);
      if (callbacks) {
        callbacks.delete(callback);
        
        // Close connection if no more callbacks
        if (callbacks.size === 0) {
          this.disconnect(key);
        }
      }
    };
  }

  /**
   * Subscribe to updates for multiple pools
   */
  subscribeMultiple(
    pools: Array<{ poolId: string; dex: DEXProtocol }>,
    callback: PoolUpdateCallback
  ): () => void {
    const unsubscribes = pools.map(pool => 
      this.subscribe(pool.poolId, pool.dex, callback)
    );
    
    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }

  /**
   * Connect to WebSocket for a specific pool
   */
  private connect(key: string, dex: DEXProtocol, poolId: string): void {
    try {
      // Different WebSocket endpoints for different DEXs
      const wsUrl = this.getWebSocketUrl(dex, poolId);
      
      if (!wsUrl) {
        console.warn(`No WebSocket support for DEX: ${dex}`);
        return;
      }

      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log(`[WebSocket] Connected to ${dex} for pool ${poolId}`);
        this.reconnectAttempts.set(key, 0);
        
        // Send subscription message
        this.sendSubscription(ws, dex, poolId);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const update = this.parseUpdate(data, dex, poolId);
          
          if (update) {
            this.notifyCallbacks(key, update);
          }
        } catch (error) {
          console.error(`[WebSocket] Error parsing message for ${key}:`, error);
        }
      };
      
      ws.onerror = (error) => {
        console.error(`[WebSocket] Error for ${key}:`, error);
      };
      
      ws.onclose = () => {
        console.log(`[WebSocket] Closed connection for ${key}`);
        this.connections.delete(key);
        
        // Attempt to reconnect if there are still callbacks
        if (this.callbacks.has(key) && this.callbacks.get(key)!.size > 0) {
          this.attemptReconnect(key, dex, poolId);
        }
      };
      
      this.connections.set(key, ws);
    } catch (error) {
      console.error(`[WebSocket] Failed to connect for ${key}:`, error);
    }
  }

  /**
   * Get WebSocket URL for a specific DEX
   */
  private getWebSocketUrl(dex: DEXProtocol, poolId: string): string | null {
    // Note: Most DEXs don't have public WebSocket APIs
    // This is a placeholder structure - in production, you'd use:
    // - Helius WebSocket API (if available)
    // - Birdeye WebSocket API (if available)
    // - Custom WebSocket server that monitors on-chain accounts
    
    switch (dex) {
      case 'helius':
        // Helius WebSocket (if available)
        return process.env.NEXT_PUBLIC_HELIUS_WS_URL || null;
      case 'birdeye':
        // Birdeye WebSocket (if available)
        return process.env.NEXT_PUBLIC_BIRDEYE_WS_URL || null;
      default:
        // For other DEXs, we'll use polling fallback
        // In production, you might set up a custom WebSocket server
        // that monitors on-chain account changes
        return null;
    }
  }

  /**
   * Send subscription message to WebSocket
   */
  private sendSubscription(ws: WebSocket, dex: DEXProtocol, poolId: string): void {
    const message = {
      method: 'subscribe',
      params: {
        poolId,
        dex,
      },
    };
    
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Parse WebSocket message into PoolUpdate
   */
  private parseUpdate(data: any, dex: DEXProtocol, poolId: string): PoolUpdate | null {
    try {
      // Parse structure depends on DEX WebSocket API
      // This is a generic parser - adjust based on actual API structure
      return {
        poolId,
        dex,
        price: data.price || 0,
        reserveA: BigInt(data.reserveA || 0),
        reserveB: BigInt(data.reserveB || 0),
        volume24h: data.volume24h,
        timestamp: new Date(data.timestamp || Date.now()),
      };
    } catch (error) {
      console.error(`[WebSocket] Error parsing update:`, error);
      return null;
    }
  }

  /**
   * Notify all callbacks for a pool update
   */
  private notifyCallbacks(key: string, update: PoolUpdate): void {
    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error(`[WebSocket] Error in callback for ${key}:`, error);
        }
      });
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private attemptReconnect(key: string, dex: DEXProtocol, poolId: string): void {
    const attempts = this.reconnectAttempts.get(key) || 0;
    
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`[WebSocket] Max reconnect attempts reached for ${key}`);
      return;
    }
    
    this.reconnectAttempts.set(key, attempts + 1);
    
    setTimeout(() => {
      console.log(`[WebSocket] Reconnecting to ${key} (attempt ${attempts + 1})`);
      this.connect(key, dex, poolId);
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from WebSocket
   */
  private disconnect(key: string): void {
    const ws = this.connections.get(key);
    if (ws) {
      ws.close();
      this.connections.delete(key);
      this.callbacks.delete(key);
      this.reconnectAttempts.delete(key);
    }
  }

  /**
   * Disconnect all WebSocket connections
   */
  disconnectAll(): void {
    this.connections.forEach((ws, key) => {
      ws.close();
    });
    this.connections.clear();
    this.callbacks.clear();
    this.reconnectAttempts.clear();
  }
}

// Singleton instance
export const poolWebSocketManager = new PoolWebSocketManager();

