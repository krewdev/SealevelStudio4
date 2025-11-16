/**
 * Transaction Bundler Types
 * Multi-send SOL to up to 50 wallets with account creation
 */

export interface MultiSendRecipient {
  address: string; // Wallet address (or 'new' to create)
  amount: number; // Amount in SOL
  createAccount?: boolean; // Create account if doesn't exist
  label?: string; // Optional label for tracking
}

export interface MultiSendConfig {
  recipients: MultiSendRecipient[];
  priorityFee?: number; // In lamports
  maxRecipients?: number; // Default: 50
  createAccounts?: boolean; // Auto-create missing accounts
  memo?: string; // Optional memo
}

export interface MultiSendResult {
  signature: string;
  recipients: number;
  totalAmount: number; // Total SOL sent
  accountsCreated: number;
  transactionSize: number; // Bytes
  fees: {
    baseFee: number;
    priorityFee: number;
    rentExempt: number; // For new accounts
    total: number;
  };
  createdWalletIds?: string[]; // IDs of wallets registered in wallet manager
}

export interface MultiSendEstimate {
  totalAmount: number;
  totalFees: number;
  accountsToCreate: number;
  transactionSize: number;
  canFitInTransaction: boolean;
}

