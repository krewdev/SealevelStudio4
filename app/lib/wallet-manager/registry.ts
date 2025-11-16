/**
 * Wallet Registry
 * Manages wallets created via the transaction bundler
 */

import { Keypair, PublicKey } from '@solana/web3.js';
import { ManagedWallet, WalletGroup, WalletImportOptions } from './types';

// Simple encryption/decryption (in production, use a proper crypto library)
function encryptKeypair(keypair: Keypair, password: string): string {
  // In production, use proper encryption (e.g., AES-256-GCM)
  // For now, base64 encode (NOT SECURE - replace in production)
  const secretKey = Buffer.from(keypair.secretKey).toString('base64');
  return btoa(JSON.stringify({ key: secretKey, password })); // Temporary - not secure
}

function decryptKeypair(encrypted: string, password: string): Keypair {
  // In production, use proper decryption
  try {
    const data = JSON.parse(atob(encrypted));
    if (data.password !== password) {
      throw new Error('Invalid password');
    }
    const secretKey = Buffer.from(data.key, 'base64');
    return Keypair.fromSecretKey(secretKey);
  } catch (error) {
    throw new Error('Failed to decrypt keypair: Invalid password or corrupted data');
  }
}

function generateId(): string {
  return `wallet-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export class WalletRegistry {
  private wallets: Map<string, ManagedWallet> = new Map();
  private groups: Map<string, WalletGroup> = new Map();
  private storageKey = 'wallet_registry';
  private groupsKey = 'wallet_groups';

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Register a new wallet (created via bundler)
   */
  registerWallet(
    address: string,
    keypair?: Keypair,
    label?: string,
    tags?: string[]
  ): ManagedWallet {
    const wallet: ManagedWallet = {
      id: generateId(),
      address,
      label,
      tags: tags || [],
      createdAt: new Date(),
      isImported: false,
      encryptedKeypair: keypair ? this.encryptKeypairForStorage(keypair) : undefined,
    };
    
    this.wallets.set(wallet.id, wallet);
    this.saveToStorage();
    return wallet;
  }

  /**
   * Import existing wallet
   */
  importWallet(options: WalletImportOptions): ManagedWallet {
    let keypair: Keypair;
    try {
      // Try to parse as hex string
      const secretKey = Buffer.from(options.privateKey, 'hex');
      if (secretKey.length !== 64) {
        throw new Error('Invalid private key length');
      }
      keypair = Keypair.fromSecretKey(secretKey);
    } catch {
      // Try as base64
      try {
        const secretKey = Buffer.from(options.privateKey, 'base64');
        keypair = Keypair.fromSecretKey(secretKey);
      } catch {
        throw new Error('Invalid private key format. Expected hex or base64.');
      }
    }

    const wallet: ManagedWallet = {
      id: generateId(),
      address: keypair.publicKey.toString(),
      label: options.label || 'Imported Wallet',
      tags: options.tags || [],
      createdAt: new Date(),
      isImported: true,
      encryptedKeypair: this.encryptKeypairForStorage(keypair),
      notes: options.notes,
    };
    
    this.wallets.set(wallet.id, wallet);
    this.saveToStorage();
    return wallet;
  }

  /**
   * Get all wallets
   */
  getAllWallets(): ManagedWallet[] {
    return Array.from(this.wallets.values());
  }

  /**
   * Get wallet by ID
   */
  getWallet(id: string): ManagedWallet | undefined {
    return this.wallets.get(id);
  }

  /**
   * Get wallet by address
   */
  getWalletByAddress(address: string): ManagedWallet | undefined {
    return Array.from(this.wallets.values()).find(w => w.address === address);
  }

  /**
   * Update wallet label
   */
  updateLabel(walletId: string, label: string): void {
    const wallet = this.wallets.get(walletId);
    if (wallet) {
      wallet.label = label;
      this.saveToStorage();
    }
  }

  /**
   * Update wallet tags
   */
  updateTags(walletId: string, tags: string[]): void {
    const wallet = this.wallets.get(walletId);
    if (wallet) {
      wallet.tags = tags;
      this.saveToStorage();
    }
  }

  /**
   * Update wallet notes
   */
  updateNotes(walletId: string, notes: string): void {
    const wallet = this.wallets.get(walletId);
    if (wallet) {
      wallet.notes = notes;
      this.saveToStorage();
    }
  }

  /**
   * Update wallet balance
   */
  updateBalance(walletId: string, balance: number): void {
    const wallet = this.wallets.get(walletId);
    if (wallet) {
      wallet.balance = balance;
      wallet.lastUsed = new Date();
      this.saveToStorage();
    }
  }

  /**
   * Delete wallet (removes from registry, doesn't delete on-chain)
   */
  deleteWallet(walletId: string): boolean {
    const deleted = this.wallets.delete(walletId);
    if (deleted) {
      // Remove from groups
      this.groups.forEach(group => {
        const index = group.walletIds.indexOf(walletId);
        if (index > -1) {
          group.walletIds.splice(index, 1);
        }
      });
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Get keypair for wallet (requires password if encrypted)
   */
  getKeypair(walletId: string, password?: string): Keypair | null {
    const wallet = this.wallets.get(walletId);
    if (!wallet || !wallet.encryptedKeypair) {
      return null;
    }

    try {
      // In production, use proper password-based decryption
      return decryptKeypair(wallet.encryptedKeypair, password || 'default-password');
    } catch {
      return null;
    }
  }

  /**
   * Create wallet group
   */
  createGroup(name: string, walletIds: string[], color?: string, description?: string): WalletGroup {
    const group: WalletGroup = {
      id: generateId(),
      name,
      walletIds,
      color,
      description,
      createdAt: new Date(),
    };
    
    this.groups.set(group.id, group);
    this.saveToStorage();
    return group;
  }

  /**
   * Get all groups
   */
  getAllGroups(): WalletGroup[] {
    return Array.from(this.groups.values());
  }

  /**
   * Add wallet to group
   */
  addWalletToGroup(groupId: string, walletId: string): void {
    const group = this.groups.get(groupId);
    if (group && !group.walletIds.includes(walletId)) {
      group.walletIds.push(walletId);
      this.saveToStorage();
    }
  }

  /**
   * Remove wallet from group
   */
  removeWalletFromGroup(groupId: string, walletId: string): void {
    const group = this.groups.get(groupId);
    if (group) {
      const index = group.walletIds.indexOf(walletId);
      if (index > -1) {
        group.walletIds.splice(index, 1);
        this.saveToStorage();
      }
    }
  }

  /**
   * Delete group
   */
  deleteGroup(groupId: string): boolean {
    const deleted = this.groups.delete(groupId);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }

  /**
   * Export wallet registry (encrypted backup)
   */
  exportRegistry(password: string, walletIds?: string[]): string {
    const walletsToExport = walletIds
      ? walletIds.map(id => this.wallets.get(id)).filter(Boolean) as ManagedWallet[]
      : Array.from(this.wallets.values());

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      wallets: walletsToExport.map(w => ({
        id: w.id,
        address: w.address,
        label: w.label,
        tags: w.tags,
        encryptedKeypair: w.encryptedKeypair,
        notes: w.notes,
      })),
      groups: Array.from(this.groups.values()),
    };

    // In production, encrypt with password
    return btoa(JSON.stringify(exportData)); // Temporary - not secure
  }

  /**
   * Import wallet registry
   */
  importRegistry(encryptedData: string, password: string): void {
    try {
      const data = JSON.parse(atob(encryptedData));
      
      // Import wallets
      data.wallets.forEach((w: any) => {
        this.wallets.set(w.id, {
          ...w,
          createdAt: new Date(w.createdAt || Date.now()),
        });
      });

      // Import groups
      if (data.groups) {
        data.groups.forEach((g: any) => {
          this.groups.set(g.id, {
            ...g,
            createdAt: new Date(g.createdAt || Date.now()),
          });
        });
      }

      this.saveToStorage();
    } catch (error) {
      throw new Error('Failed to import registry: Invalid format or password');
    }
  }

  /**
   * Clear all wallets (use with caution)
   */
  clearAll(): void {
    this.wallets.clear();
    this.groups.clear();
    this.saveToStorage();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalWallets: number;
    importedWallets: number;
    createdWallets: number;
    totalGroups: number;
    totalBalance: number;
  } {
    const wallets = Array.from(this.wallets.values());
    return {
      totalWallets: wallets.length,
      importedWallets: wallets.filter(w => w.isImported).length,
      createdWallets: wallets.filter(w => !w.isImported).length,
      totalGroups: this.groups.size,
      totalBalance: wallets.reduce((sum, w) => sum + (w.balance || 0), 0),
    };
  }

  private encryptKeypairForStorage(keypair: Keypair): string {
    // In production, use proper encryption
    // For now, base64 encode (NOT SECURE)
    return Buffer.from(keypair.secretKey).toString('base64');
  }

  private saveToStorage(): void {
    if (typeof window !== 'undefined') {
      const walletsData = Array.from(this.wallets.values()).map(w => ({
        ...w,
        createdAt: w.createdAt.toISOString(),
        lastUsed: w.lastUsed?.toISOString(),
      }));
      localStorage.setItem(this.storageKey, JSON.stringify(walletsData));

      const groupsData = Array.from(this.groups.values()).map(g => ({
        ...g,
        createdAt: g.createdAt.toISOString(),
      }));
      localStorage.setItem(this.groupsKey, JSON.stringify(groupsData));
    }
  }

  private loadFromStorage(): void {
    if (typeof window !== 'undefined') {
      try {
        const walletsData = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        walletsData.forEach((w: any) => {
          this.wallets.set(w.id, {
            ...w,
            createdAt: new Date(w.createdAt),
            lastUsed: w.lastUsed ? new Date(w.lastUsed) : undefined,
          });
        });

        const groupsData = JSON.parse(localStorage.getItem(this.groupsKey) || '[]');
        groupsData.forEach((g: any) => {
          this.groups.set(g.id, {
            ...g,
            createdAt: new Date(g.createdAt),
          });
        });
      } catch (error) {
        console.error('Error loading wallet registry from storage:', error);
      }
    }
  }
}

// Singleton instance
export const walletRegistry = new WalletRegistry();

