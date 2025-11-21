// Flash Loan Stacking Utility
// Allows chaining multiple flash loans in a single transaction

import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import { LENDING_PROTOCOLS, LendingProtocol, getBestFlashLoanProtocol } from './protocols';

export interface FlashLoanStackItem {
  id: string;
  protocol: LendingProtocol;
  tokenMint: PublicKey;
  amount: bigint;
  fee: bigint; // Calculated fee
  repayAmount: bigint; // amount + fee
  borrowInstruction?: TransactionInstruction;
  repayInstruction?: TransactionInstruction;
}

export interface FlashLoanStack {
  items: FlashLoanStackItem[];
  totalBorrowed: bigint;
  totalFees: bigint;
  totalRepay: bigint;
}

/**
 * Flash Loan Stack Manager
 * Handles stacking multiple flash loans from different protocols
 */
export class FlashLoanStackManager {
  private connection: Connection;
  private stack: FlashLoanStackItem[] = [];

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Add a flash loan to the stack
   */
  async addFlashLoan(
    tokenMint: PublicKey,
    amount: bigint,
    protocolId?: string
  ): Promise<FlashLoanStackItem> {
    // Auto-select best protocol if not specified
    const protocol = protocolId 
      ? LENDING_PROTOCOLS.find(p => p.id === protocolId)
      : getBestFlashLoanProtocol(tokenMint.toString());

    if (!protocol) {
      throw new Error(`No flash loan protocol available for token ${tokenMint.toString()}`);
    }

    // Calculate fee
    const fee = (amount * BigInt(protocol.flashLoanFeeBps)) / BigInt(10000);
    const repayAmount = amount + fee;

    const item: FlashLoanStackItem = {
      id: `${protocol.id}-${tokenMint.toString()}-${Date.now()}`,
      protocol,
      tokenMint,
      amount,
      fee,
      repayAmount,
    };

    this.stack.push(item);
    return item;
  }

  /**
   * Remove a flash loan from the stack
   */
  removeFlashLoan(itemId: string): boolean {
    const index = this.stack.findIndex(item => item.id === itemId);
    if (index === -1) return false;
    this.stack.splice(index, 1);
    return true;
  }

  /**
   * Clear the entire stack
   */
  clearStack(): void {
    this.stack = [];
  }

  /**
   * Get current stack summary
   */
  getStackSummary(): FlashLoanStack {
    const totalBorrowed = this.stack.reduce((sum, item) => sum + item.amount, BigInt(0));
    const totalFees = this.stack.reduce((sum, item) => sum + item.fee, BigInt(0));
    const totalRepay = this.stack.reduce((sum, item) => sum + item.repayAmount, BigInt(0));

    return {
      items: [...this.stack],
      totalBorrowed,
      totalFees,
      totalRepay,
    };
  }

  /**
   * Build transaction with all flash loans
   * Order: All borrows -> User operations -> All repays
   */
  async buildStackedTransaction(
    userInstructions: TransactionInstruction[],
    borrower: PublicKey
  ): Promise<Transaction> {
    const transaction = new Transaction();

    // Step 1: Add all borrow instructions
    for (const item of this.stack) {
      if (item.borrowInstruction) {
        transaction.add(item.borrowInstruction);
      } else {
        // Placeholder: In production, construct actual borrow instruction
        // This would use the protocol's SDK or Anchor program
        throw new Error(`Borrow instruction not set for ${item.id}. Please set borrowInstruction first.`);
      }
    }

    // Step 2: Add user's operations (arbitrage, swaps, etc.)
    for (const instruction of userInstructions) {
      transaction.add(instruction);
    }

    // Step 3: Add all repay instructions (in reverse order for safety)
    for (let i = this.stack.length - 1; i >= 0; i--) {
      const item = this.stack[i];
      if (item.repayInstruction) {
        transaction.add(item.repayInstruction);
      } else {
        // Placeholder: In production, construct actual repay instruction
        throw new Error(`Repay instruction not set for ${item.id}. Please set repayInstruction first.`);
      }
    }

    return transaction;
  }

  /**
   * Validate stack (check for conflicts, ensure profitability, etc.)
   */
  validateStack(estimatedProfit: bigint): {
    valid: boolean;
    errors: string[];
    warnings: string[];
    netProfit: bigint;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const summary = this.getStackSummary();

    // Check if profit covers all fees
    const netProfit = estimatedProfit - summary.totalFees;
    if (netProfit <= 0) {
      errors.push(`Estimated profit (${estimatedProfit}) does not cover total fees (${summary.totalFees})`);
    }

    // Check for duplicate protocols (might want to diversify)
    const protocolCounts = new Map<string, number>();
    this.stack.forEach(item => {
      protocolCounts.set(item.protocol.id, (protocolCounts.get(item.protocol.id) || 0) + 1);
    });
    protocolCounts.forEach((count, protocolId) => {
      if (count > 1) {
        warnings.push(`Multiple loans from ${protocolId} (${count}). Consider diversifying.`);
      }
    });

    // Check transaction size (Solana limit is ~1232 bytes)
    // This is a simplified check - actual size depends on instruction encoding
    const estimatedSize = this.stack.length * 200 + 500; // Rough estimate
    if (estimatedSize > 1200) {
      warnings.push(`Estimated transaction size (${estimatedSize} bytes) is close to limit.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      netProfit,
    };
  }

  /**
   * Get recommended stack based on token amounts and protocols
   */
  static getRecommendedStack(
    tokenAmounts: Array<{ tokenMint: PublicKey; amount: bigint }>
  ): Array<{ tokenMint: PublicKey; amount: bigint; recommendedProtocol: string }> {
    return tokenAmounts.map(({ tokenMint, amount }) => {
      const protocol = getBestFlashLoanProtocol(tokenMint.toString());
      return {
        tokenMint,
        amount,
        recommendedProtocol: protocol?.id || 'unknown',
      };
    });
  }
}

