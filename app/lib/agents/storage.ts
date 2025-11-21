/**
 * Shared Agent Storage
 * Provides persistent storage for agents across API routes
 * In production, this should use a database
 */

import { BaseSolanaAgent } from './solana-agent-kit';

interface StoredAgent {
  type: string;
  config: any;
  wallet: string;
  createdAt: Date;
  agent?: BaseSolanaAgent;
}

// Shared storage across all API routes
export const agentStorage = new Map<string, StoredAgent>();

/**
 * Store an agent
 */
export function storeAgent(wallet: string, data: StoredAgent): void {
  agentStorage.set(wallet, data);
}

/**
 * Get stored agent data
 */
export function getStoredAgent(wallet: string): StoredAgent | undefined {
  return agentStorage.get(wallet);
}

/**
 * Get all stored agents
 */
export function getAllStoredAgents(): StoredAgent[] {
  return Array.from(agentStorage.values());
}

/**
 * Remove an agent
 */
export function removeAgent(wallet: string): void {
  agentStorage.delete(wallet);
}

/**
 * Clear all agents
 */
export function clearAllAgents(): void {
  agentStorage.clear();
}

