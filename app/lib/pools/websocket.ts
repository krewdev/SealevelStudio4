// WebSocket manager for real-time pool state updates
// Provides real-time price and liquidity updates for arbitrage opportunities
// Uses QuickNode WebSocket streaming for account updates

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
  private subscriptionIds: Map<string, number> = new Map();
  private requestIdCounter = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  // Connection pooling
  private connectionPool: Map<string, WebSocket[]> = new Map(); // endpoint -> connections
  private maxConnectionsPerEndpoint = 10;
  private activeSubscriptions: Map<string, string> = new Map(); // poolKey -> connectionKey

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
   * Get or create WebSocket connection from pool
   */
  private getConnectionFromPool(endpoint: string): WebSocket | null {
    const pool = this.connectionPool.get(endpoint) || [];
    
    // Find available connection (not at max subscriptions)
    for (const ws of pool) {
      if (ws.readyState === WebSocket.OPEN) {
        return ws;
      }
    }
    
    // Create new connection if pool not full
    if (pool.length < this.maxConnectionsPerEndpoint) {
      const ws = new WebSocket(endpoint);
      pool.push(ws);
      this.connectionPool.set(endpoint, pool);
      return ws;
    }
    
    // Reuse least used connection
    return pool[0] || null;
  }

  /**
   * Connect to WebSocket for a specific pool (with connection pooling)
   */
  private connect(key: string, dex: DEXProtocol, poolId: string): void {
    try {
      // Different WebSocket endpoints for different DEXs
      const wsUrl = this.getWebSocketUrl(dex, poolId);
      
      if (!wsUrl) {
        console.warn(`No WebSocket support for DEX: ${dex}`);
        return;
      }

      // Get connection from pool
      let ws = this.getConnectionFromPool(wsUrl);
      
      if (!ws) {
        // Fallback: create new connection
        ws = new WebSocket(wsUrl);
      }
      
      ws.onopen = () => {
        console.log(`[WebSocket] Connected to ${dex} for pool ${poolId}`);
        this.reconnectAttempts.set(key, 0);
        
        // Send subscription message
        this.sendSubscription(ws, dex, poolId);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle Solana WebSocket response format
          // Response can be: subscription confirmation, account update, or error
          if (data.result) {
            // This is a subscription confirmation
            if (typeof data.result === 'number') {
              const subscriptionId = data.result;
              this.subscriptionIds.set(key, subscriptionId);
              console.log(`[WebSocket] Subscription confirmed for ${key} (ID: ${subscriptionId})`);
              return;
            }
            
            // This is an account update notification
            if (data.params && data.params.result && data.params.result.value) {
              const accountData = data.params.result.value;
              const update = this.parseSolanaAccountUpdate(accountData, dex, poolId);
              
              if (update) {
                this.notifyCallbacks(key, update);
              }
              return;
            }
          }
          
          // Fallback: try to parse as generic update
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
   * Get WebSocket URL for QuickNode stream
   * QuickNode provides WebSocket streaming for Solana accounts
   */
  private getWebSocketUrl(dex: DEXProtocol, poolId: string): string | null {
    // Use QuickNode WebSocket for all DEXs (monitors on-chain account changes)
    // QuickNode WebSocket URL format: wss://your-endpoint.solana-mainnet.quiknode.pro/your-api-key/
    
    // Option 1: Use full URL if provided
    const quickNodeWsUrl = process.env.NEXT_PUBLIC_QUICKNODE_WS_URL;
    if (quickNodeWsUrl && quickNodeWsUrl.trim()) {
      return quickNodeWsUrl;
    }
    
    // Option 2: Construct URL from endpoint + API key
    const quickNodeEndpoint = process.env.QUICKNODE_ENDPOINT;
    const quickNodeApiKey = process.env.QUICKNODE_API_KEY;
    
    if (quickNodeEndpoint && quickNodeApiKey) {
      // Construct WebSocket URL from endpoint and API key
      const wsUrl = `wss://${quickNodeEndpoint}/${quickNodeApiKey}/`;
      return wsUrl;
    }
    
    // Fallback to Helius if QuickNode not configured
    if (dex === 'helius') {
      return process.env.NEXT_PUBLIC_HELIUS_WS_URL || null;
    }
    
    // For other DEXs without QuickNode, return null (will use polling fallback)
    return null;
  }

  /**
   * Send subscription message to QuickNode WebSocket
   * Uses Solana's accountSubscribe method to monitor pool account changes
   */
  private sendSubscription(ws: WebSocket, dex: DEXProtocol, poolId: string): void {
    try {
      // Convert poolId to PublicKey if it's a valid address
      let accountPubkey: PublicKey;
      try {
        accountPubkey = new PublicKey(poolId);
      } catch {
        console.warn(`[WebSocket] Invalid pool ID for subscription: ${poolId}`);
        return;
      }

      // Solana WebSocket subscription format
      const requestId = ++this.requestIdCounter;
      const subscriptionId = requestId;
      
      const message = {
        jsonrpc: '2.0',
        id: requestId,
        method: 'accountSubscribe',
        params: [
          accountPubkey.toBase58(),
          {
            encoding: 'base64',
            commitment: 'confirmed',
          },
        ],
      };
      
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        this.subscriptionIds.set(`${dex}:${poolId}`, subscriptionId);
        console.log(`[WebSocket] Subscribed to account ${poolId} (subscription ID: ${subscriptionId})`);
      }
    } catch (error) {
      console.error(`[WebSocket] Error sending subscription for ${poolId}:`, error);
    }
  }

  /**
   * Parse Solana account update from QuickNode WebSocket
   */
  private parseSolanaAccountUpdate(accountData: any, dex: DEXProtocol, poolId: string): PoolUpdate | null {
    try {
      // Account data comes as base64 encoded
      // We need to decode and parse the pool state
      // This is a simplified parser - actual parsing depends on pool type (Raydium, Orca, etc.)
      
      if (!accountData.data || !Array.isArray(accountData.data)) {
        return null;
      }

      // Decode base64 account data
      const accountBytes = Buffer.from(accountData.data[0], 'base64');
      
      // Parse pool reserves and price from account data
      // This is a generic parser - you'll need to adjust based on specific DEX pool structure
      // For Raydium: reserves are typically at specific offsets
      // For Orca: different structure
      // This is a placeholder that extracts what it can
      
      let reserveA = BigInt(0);
      let reserveB = BigInt(0);
      let price = 0;

      // Try to extract reserves (simplified - actual parsing depends on pool type)
      if (accountBytes.length >= 16) {
        // Example: read first 8 bytes as reserveA, next 8 as reserveB
        // This is a placeholder - adjust based on actual pool account structure
        try {
          reserveA = accountBytes.readBigUInt64LE(0);
          reserveB = accountBytes.length >= 16 ? accountBytes.readBigUInt64LE(8) : BigInt(0);
          
          // Calculate price from reserves
          if (reserveB > 0) {
            price = Number(reserveA) / Number(reserveB);
          }
        } catch (e) {
          // If parsing fails, we still create an update to notify of account change
          console.warn(`[WebSocket] Could not parse reserves from account data for ${poolId}`);
        }
      }

      return {
        poolId,
        dex,
        price,
        reserveA,
        reserveB,
        volume24h: undefined, // Not available from account data alone
        timestamp: new Date(),
      };
    } catch (error) {
      console.error(`[WebSocket] Error parsing Solana account update:`, error);
      return null;
    }
  }

  /**
   * Parse WebSocket message into PoolUpdate (fallback for non-Solana formats)
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
      // Unsubscribe before closing if we have a subscription ID
      const subscriptionId = this.subscriptionIds.get(key);
      if (subscriptionId && ws.readyState === WebSocket.OPEN) {
        try {
          const unsubscribeMessage = {
            jsonrpc: '2.0',
            id: ++this.requestIdCounter,
            method: 'accountUnsubscribe',
            params: [subscriptionId],
          };
          ws.send(JSON.stringify(unsubscribeMessage));
        } catch (error) {
          console.error(`[WebSocket] Error unsubscribing ${key}:`, error);
        }
      }
      
      ws.close();
      this.connections.delete(key);
      this.callbacks.delete(key);
      this.reconnectAttempts.delete(key);
      this.subscriptionIds.delete(key);
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

