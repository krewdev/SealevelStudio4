/**
 * SEAL Treasury Vault
 * Secure treasury management with robust safeguards
 */

import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';

/**
 * Treasury Configuration
 */
export interface TreasuryConfig {
  // Vault addresses
  primaryVault: PublicKey; // Main treasury wallet
  secondaryVault: PublicKey; // Backup vault for redundancy
  emergencyVault: PublicKey; // Emergency access vault

  // Multi-signature requirements
  requiredSignatures: number; // Number of signatures required
  authorizedSigners: PublicKey[]; // List of authorized signers

  // Withdrawal limits and timelocks
  maxDailyWithdrawal: number; // Max SOL per day
  withdrawalTimelock: number; // Hours to wait after proposal

  // Fund allocation (percentages)
  liquidityAllocation: number; // % to liquidity pool
  operationsAllocation: number; // % to operations
  rewardsAllocation: number; // % to staking rewards
  reserveAllocation: number; // % to emergency reserve

  // Security features
  emergencyPause: boolean; // Emergency pause capability
  timelockActive: boolean; // Timelock for large withdrawals
}

/**
 * Withdrawal Request
 */
export interface WithdrawalRequest {
  id: string;
  amount: number;
  destination: PublicKey;
  purpose: string;
  proposer: PublicKey;
  signatures: PublicKey[];
  timestamp: Date;
  executed: boolean;
  timelockExpiry?: Date;
}

/**
 * Default Treasury Configuration
 */
export const DEFAULT_TREASURY_CONFIG: TreasuryConfig = {
  primaryVault: PublicKey.default, // Will be set to user's wallet
  secondaryVault: Keypair.generate().publicKey, // Generate backup vault
  emergencyVault: Keypair.generate().publicKey, // Generate emergency vault

  requiredSignatures: 1, // Single signature for presale (can be upgraded later)
  authorizedSigners: [], // Will be set to authorized wallets

  maxDailyWithdrawal: 100, // 100 SOL per day max
  withdrawalTimelock: 24, // 24 hour timelock

  liquidityAllocation: 50, // 50% to liquidity
  operationsAllocation: 30, // 30% to operations
  rewardsAllocation: 15, // 15% to rewards
  reserveAllocation: 5, // 5% to reserve

  emergencyPause: false,
  timelockActive: true,
};

/**
 * Create treasury vault initialization transaction
 */
export async function createTreasuryVault(
  connection: Connection,
  owner: PublicKey,
  config: TreasuryConfig
): Promise<{ transaction: Transaction; vaultKeypair: Keypair }> {
  const transaction = new Transaction();

  // Generate primary vault keypair (for demo - in production use secure key management)
  const vaultKeypair = Keypair.generate();

  // Create vault account with initial funding
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: owner,
      newAccountPubkey: vaultKeypair.publicKey,
      lamports: await connection.getMinimumBalanceForRentExemption(0),
      space: 0, // Simple account for now
      programId: SystemProgram.programId,
    })
  );

  return { transaction, vaultKeypair };
}

/**
 * Distribute presale funds according to allocation
 */
export async function distributePresaleFunds(
  connection: Connection,
  treasuryWallet: Keypair,
  totalAmount: number,
  config: TreasuryConfig
): Promise<Transaction[]> {
  const transactions: Transaction[] = [];

  // Calculate allocations
  const liquidityAmount = Math.floor((totalAmount * config.liquidityAllocation) / 100);
  const operationsAmount = Math.floor((totalAmount * config.operationsAllocation) / 100);
  const rewardsAmount = Math.floor((totalAmount * config.rewardsAllocation) / 100);
  const reserveAmount = totalAmount - liquidityAmount - operationsAmount - rewardsAmount;

  // Create distribution transactions
  const allocations = [
    { name: 'liquidity', amount: liquidityAmount, address: config.secondaryVault },
    { name: 'operations', amount: operationsAmount, address: config.primaryVault },
    { name: 'rewards', amount: rewardsAmount, address: config.emergencyVault },
    { name: 'reserve', amount: reserveAmount, address: config.secondaryVault },
  ];

  for (const allocation of allocations) {
    if (allocation.amount > 0) {
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: treasuryWallet.publicKey,
          toPubkey: allocation.address,
          lamports: allocation.amount * LAMPORTS_PER_SOL,
        })
      );
      transactions.push(transaction);
    }
  }

  return transactions;
}

/**
 * Create withdrawal request (with timelock if required)
 */
export function createWithdrawalRequest(
  amount: number,
  destination: PublicKey,
  purpose: string,
  proposer: PublicKey,
  config: TreasuryConfig
): WithdrawalRequest {
  const request: WithdrawalRequest = {
    id: `withdrawal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    amount,
    destination,
    purpose,
    proposer,
    signatures: [proposer], // Auto-sign by proposer
    timestamp: new Date(),
    executed: false,
  };

  // Add timelock for large withdrawals
  if (amount > config.maxDailyWithdrawal * 0.1 && config.timelockActive) {
    request.timelockExpiry = new Date(Date.now() + config.withdrawalTimelock * 60 * 60 * 1000);
  }

  return request;
}

/**
 * Execute withdrawal (after validation)
 */
export async function executeWithdrawal(
  connection: Connection,
  request: WithdrawalRequest,
  treasuryWallet: Keypair,
  config: TreasuryConfig
): Promise<Transaction> {
  // Validate request
  if (request.executed) {
    throw new Error('Withdrawal already executed');
  }

  if (request.signatures.length < config.requiredSignatures) {
    throw new Error(`Insufficient signatures: ${request.signatures.length}/${config.requiredSignatures}`);
  }

  // Check timelock
  if (request.timelockExpiry && request.timelockExpiry > new Date()) {
    throw new Error(`Timelock not expired. Available at: ${request.timelockExpiry.toISOString()}`);
  }

  // Check daily withdrawal limit (simplified - in production use proper tracking)
  if (request.amount > config.maxDailyWithdrawal) {
    throw new Error(`Amount exceeds daily withdrawal limit: ${request.amount} > ${config.maxDailyWithdrawal}`);
  }

  // Create withdrawal transaction
  const transaction = new Transaction();
  transaction.add(
    SystemProgram.transfer({
      fromPubkey: treasuryWallet.publicKey,
      toPubkey: request.destination,
      lamports: request.amount * LAMPORTS_PER_SOL,
    })
  );

  return transaction;
}

/**
 * Get treasury status and balances
 */
export async function getTreasuryStatus(
  connection: Connection,
  config: TreasuryConfig
): Promise<{
  primaryBalance: number;
  secondaryBalance: number;
  emergencyBalance: number;
  totalBalance: number;
  lastActivity: Date;
}> {
  const [primaryBalance, secondaryBalance, emergencyBalance] = await Promise.all([
    connection.getBalance(config.primaryVault).catch(() => 0),
    connection.getBalance(config.secondaryVault).catch(() => 0),
    connection.getBalance(config.emergencyVault).catch(() => 0),
  ]);

  return {
    primaryBalance: primaryBalance / LAMPORTS_PER_SOL,
    secondaryBalance: secondaryBalance / LAMPORTS_PER_SOL,
    emergencyBalance: emergencyBalance / LAMPORTS_PER_SOL,
    totalBalance: (primaryBalance + secondaryBalance + emergencyBalance) / LAMPORTS_PER_SOL,
    lastActivity: new Date(), // In production, track actual activity
  };
}
