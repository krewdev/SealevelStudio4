/**
 * Wallet Manager Types
 * Types for managing wallets created via the transaction bundler
 */

export interface ManagedWallet {
  id: string;
  address: string;
  label?: string;
  tags?: string[];
  createdAt: Date;
  lastUsed?: Date;
  balance?: number; // SOL balance
  isImported: boolean; // true if imported, false if created via bundler
  encryptedKeypair?: string; // Encrypted private key (if stored)
  notes?: string; // User notes about the wallet
}

export interface WalletGroup {
  id: string;
  name: string;
  walletIds: string[];
  color?: string;
  description?: string;
  createdAt: Date;
}

export interface WalletManagerState {
  wallets: ManagedWallet[];
  groups: WalletGroup[];
  selectedWalletIds: string[];
  searchQuery: string;
  filterTags: string[];
  sortBy: 'created' | 'label' | 'balance' | 'lastUsed';
  sortOrder: 'asc' | 'desc';
}

export interface WalletImportOptions {
  privateKey: string;
  label?: string;
  tags?: string[];
  notes?: string;
}

export interface WalletExportOptions {
  walletIds: string[];
  password: string; // Password to encrypt the export
  includePrivateKeys: boolean;
}

export interface WalletExportData {
  version: string;
  exportedAt: string;
  wallets: Array<{
    id: string;
    address: string;
    label?: string;
    tags?: string[];
    encryptedKeypair?: string;
    notes?: string;
  }>;
  groups?: WalletGroup[];
}

