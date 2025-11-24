/**
 * QuickNode Stream Manager
 * Handles QuickNode WebSocket streams with filters for pump.fun and arbitrage
 */

import { Connection, PublicKey } from '@solana/web3.js';

export interface QuickNodeFilter {
  // Account filter - monitor specific accounts
  accounts?: string[];
  // Program filter - monitor all accounts owned by a program
  programs?: string[];
  // Memo filter - filter by memo instruction content
  memos?: string[];
  // Vote filter - include/exclude vote transactions
  vote?: boolean;
  // Failed filter - include/exclude failed transactions
  failed?: boolean;
  // AccountInclude - include specific accounts in transaction
  accountInclude?: string[];
  // AccountExclude - exclude specific accounts from transaction
  accountExclude?: string[];
}

export interface QuickNodeStreamEvent {
  type: 'account' | 'transaction' | 'slot' | 'logs';
  data: any;
  timestamp: number;
  slot?: number;
}

export type QuickNodeStreamCallback = (event: QuickNodeStreamEvent) => void;

export class QuickNodeStreamManager {
  private connections: Map<string, WebSocket> = new Map();
  private callbacks: Map<string, Set<QuickNodeStreamCallback>> = new Map();
  private subscriptionIds: Map<string, number> = new Map();
  private requestIdCounter = 0;
  private reconnectAttempts: Map<string, number> = new Map();
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;

  /**
   * Get QuickNode WebSocket URL
   */
  private getWebSocketUrl(): string | null {
    // Option 1: Use full URL if provided
    const quickNodeWsUrl = process.env.NEXT_PUBLIC_QUICKNODE_WS_URL;
    if (quickNodeWsUrl && quickNodeWsUrl.trim()) {
      return quickNodeWsUrl;
    }

    // Option 2: Construct from endpoint + API key
    const quickNodeEndpoint = process.env.QUICKNODE_ENDPOINT;
    const quickNodeApiKey = process.env.QUICKNODE_API_KEY;

    if (quickNodeEndpoint && quickNodeApiKey) {
      // Remove https:// if present
      const endpoint = quickNodeEndpoint.replace(/^https?:\/\//, '');
      return `wss://${endpoint}/${quickNodeApiKey}/`;
    }

    return null;
  }

  /**
   * Subscribe to QuickNode stream with filter
   */
  subscribe(
    streamId: string,
    filter: QuickNodeFilter,
    callback: QuickNodeStreamCallback
  ): () => void {
    if (!this.callbacks.has(streamId)) {
      this.callbacks.set(streamId, new Set());
    }

    this.callbacks.get(streamId)!.add(callback);

    // Connect if not already connected
    if (!this.connections.has(streamId)) {
      this.connect(streamId, filter);
    }

    // Return unsubscribe function
    return () => {
      const callbacks = this.callbacks.get(streamId);
      if (callbacks) {
        callbacks.delete(callback);

        if (callbacks.size === 0) {
          this.disconnect(streamId);
        }
      }
    };
  }

  /**
   * Connect to QuickNode WebSocket with filter
   */
  private connect(streamId: string, filter: QuickNodeFilter): void {
    const wsUrl = this.getWebSocketUrl();
    if (!wsUrl) {
      console.error('[QuickNode Stream] WebSocket URL not configured');
      return;
    }

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log(`[QuickNode Stream] Connected: ${streamId}`);
        this.reconnectAttempts.set(streamId, 0);

        // Subscribe with filter
        this.subscribeWithFilter(streamId, filter);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(streamId, data);
        } catch (error) {
          console.error(`[QuickNode Stream] Error parsing message for ${streamId}:`, error);
        }
      };

      ws.onerror = (error) => {
        console.error(`[QuickNode Stream] Error for ${streamId}:`, error);
      };

      ws.onclose = () => {
        console.log(`[QuickNode Stream] Connection closed: ${streamId}`);
        this.connections.delete(streamId);
        this.attemptReconnect(streamId, filter);
      };

      this.connections.set(streamId, ws);
    } catch (error) {
      console.error(`[QuickNode Stream] Failed to connect ${streamId}:`, error);
      this.attemptReconnect(streamId, filter);
    }
  }

  /**
   * Subscribe to QuickNode stream with filter
   */
  private subscribeWithFilter(streamId: string, filter: QuickNodeFilter): void {
    const ws = this.connections.get(streamId);
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const requestId = ++this.requestIdCounter;

    // Build subscription request based on filter type
    let subscriptionRequest: any;

    // If programs filter, use accountSubscribe for each program
    if (filter.programs && filter.programs.length > 0) {
      // For program filters, we subscribe to account changes
      // QuickNode will send updates when any account owned by the program changes
      filter.programs.forEach((programId, index) => {
        const subRequestId = requestId + index;
        subscriptionRequest = {
          jsonrpc: '2.0',
          id: subRequestId,
          method: 'accountSubscribe',
          params: [
            programId,
            {
              encoding: 'base64',
              commitment: 'confirmed',
            },
          ],
        };

        ws.send(JSON.stringify(subscriptionRequest));
      });
    }

    // If accounts filter, subscribe to specific accounts
    if (filter.accounts && filter.accounts.length > 0) {
      filter.accounts.forEach((account, index) => {
        const subRequestId = requestId + index + (filter.programs?.length || 0);
        subscriptionRequest = {
          jsonrpc: '2.0',
          id: subRequestId,
          method: 'accountSubscribe',
          params: [
            account,
            {
              encoding: 'base64',
              commitment: 'confirmed',
            },
          ],
        };

        ws.send(JSON.stringify(subscriptionRequest));
      });
    }

    // If transaction filters, use transactionSubscribe
    if (filter.accountInclude || filter.accountExclude || filter.memos) {
      const transactionFilters: any[] = [];

      if (filter.accountInclude) {
        transactionFilters.push({
          accountInclude: filter.accountInclude,
        });
      }

      if (filter.accountExclude) {
        transactionFilters.push({
          accountExclude: filter.accountExclude,
        });
      }

      if (filter.memos) {
        filter.memos.forEach((memo) => {
          transactionFilters.push({
            memos: [memo],
          });
        });
      }

      subscriptionRequest = {
        jsonrpc: '2.0',
        id: requestId,
        method: 'transactionSubscribe',
        params: [
          {
            vote: filter.vote ?? false,
            failed: filter.failed ?? false,
            accountInclude: filter.accountInclude,
            accountExclude: filter.accountExclude,
          },
          {
            commitment: 'confirmed',
            encoding: 'jsonParsed',
          },
        ],
      };

      ws.send(JSON.stringify(subscriptionRequest));
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(streamId: string, data: any): void {
    // Handle subscription confirmation
    if (data.result && typeof data.result === 'number') {
      this.subscriptionIds.set(`${streamId}:${data.id}`, data.result);
      return;
    }

    // Handle account updates
    if (data.method === 'accountNotification' && data.params) {
      const accountData = data.params.result;
      const event: QuickNodeStreamEvent = {
        type: 'account',
        data: accountData,
        timestamp: Date.now(),
        slot: accountData.context?.slot,
      };

      this.notifyCallbacks(streamId, event);
      return;
    }

    // Handle transaction notifications
    if (data.method === 'transactionNotification' && data.params) {
      const transactionData = data.params.result;
      const event: QuickNodeStreamEvent = {
        type: 'transaction',
        data: transactionData,
        timestamp: Date.now(),
        slot: transactionData.slot,
      };

      this.notifyCallbacks(streamId, event);
      return;
    }

    // Handle slot updates
    if (data.method === 'slotNotification') {
      const event: QuickNodeStreamEvent = {
        type: 'slot',
        data: data.params,
        timestamp: Date.now(),
        slot: data.params.slot,
      };

      this.notifyCallbacks(streamId, event);
      return;
    }

    // Handle log notifications
    if (data.method === 'logsNotification' && data.params) {
      const event: QuickNodeStreamEvent = {
        type: 'logs',
        data: data.params.result,
        timestamp: Date.now(),
        slot: data.params.result.context?.slot,
      };

      this.notifyCallbacks(streamId, event);
      return;
    }
  }

  /**
   * Notify all callbacks for a stream
   */
  private notifyCallbacks(streamId: string, event: QuickNodeStreamEvent): void {
    const callbacks = this.callbacks.get(streamId);
    if (!callbacks) return;

    callbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error(`[QuickNode Stream] Callback error for ${streamId}:`, error);
      }
    });
  }

  /**
   * Attempt to reconnect
   */
  private attemptReconnect(streamId: string, filter: QuickNodeFilter): void {
    const attempts = this.reconnectAttempts.get(streamId) || 0;
    if (attempts >= this.maxReconnectAttempts) {
      console.error(`[QuickNode Stream] Max reconnection attempts reached for ${streamId}`);
      return;
    }

    this.reconnectAttempts.set(streamId, attempts + 1);
    console.log(`[QuickNode Stream] Attempting reconnect ${attempts + 1}/${this.maxReconnectAttempts} for ${streamId}`);

    setTimeout(() => {
      this.connect(streamId, filter);
    }, this.reconnectDelay);
  }

  /**
   * Disconnect from stream
   */
  disconnect(streamId: string): void {
    const ws = this.connections.get(streamId);
    if (ws) {
      // Unsubscribe from all subscriptions
      const subscriptions = Array.from(this.subscriptionIds.entries())
        .filter(([key]) => key.startsWith(streamId));

      subscriptions.forEach(([key, subId]) => {
        const unsubscribeRequest = {
          jsonrpc: '2.0',
          id: ++this.requestIdCounter,
          method: 'accountUnsubscribe',
          params: [subId],
        };

        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(unsubscribeRequest));
        }

        this.subscriptionIds.delete(key);
      });

      ws.close();
      this.connections.delete(streamId);
    }

    this.callbacks.delete(streamId);
    this.reconnectAttempts.delete(streamId);
  }

  /**
   * Get connection status
   */
  getStatus(streamId: string): { connected: boolean; reconnectAttempts: number } {
    const ws = this.connections.get(streamId);
    return {
      connected: ws?.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts.get(streamId) || 0,
    };
  }
}







