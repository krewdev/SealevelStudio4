/**
 * Enhanced Pump Fun Protocol Transaction Filter for QuickNode
 * 
 * This filter processes Solana block data to identify and extract all major
 * Pump Fun protocol operations including:
 * - Buy/Sell trades
 * - Token creation
 * - Migration events
 * - Liquidity operations
 * 
 * Enhanced Discovery Features:
 * - Price calculation from trades
 * - Volume tracking
 * - Whale transaction detection
 * - Pattern detection (bot activity, sandwich attacks, flash loans)
 * - Account change tracking
 * - Fee extraction (transaction fees, priority fees, compute units)
 * - Related token discovery
 * - Token metadata extraction
 * - Enhanced account information (bonding curve, ATA, etc.)
 * 
 * IMPORTANT: For QuickNode Stream custom filters, use the JavaScript version:
 * - Use: app/lib/pumpfun/quicknode-filter.js
 * - QuickNode's isolated VM doesn't support TypeScript or ES6+ features
 * - The .js file is compatible with QuickNode's environment
 * 
 * Usage: Copy the contents of quicknode-filter.js into QuickNode Stream custom filter
 * 
 * Configuration (in the .js file, modify CONFIG object):
 * - MIN_TRADE_THRESHOLD_SOL: Minimum SOL amount to include trades (default: 0.01)
 * - WHALE_THRESHOLD_SOL: SOL amount to flag as whale transaction (default: 10)
 * - ENABLE_ENHANCED_DISCOVERY: Enable advanced discovery features (default: true)
 * - ENABLE_PATTERN_DETECTION: Enable pattern detection (default: true)
 * - ENABLE_PRICE_CALCULATION: Enable price calculation (default: true)
 * - INCLUDE_ERRORS: Include failed transactions (default: false)
 */

export interface PumpFunFilterConfig {
  /** Minimum trade threshold in SOL (default: 0.01) */
  minTradeThresholdSol?: number;
  /** Include failed transactions */
  includeErrors?: boolean;
  /** Enable enhanced discovery features */
  enableEnhancedDiscovery?: boolean;
  /** Minimum SOL amount to flag as whale transaction */
  whaleThresholdSol?: number;
  /** Enable pattern detection */
  enablePatternDetection?: boolean;
  /** Enable price calculation */
  enablePriceCalculation?: boolean;
}

export interface PumpFunTransactionResult {
  signature: string;
  operation: 'buy' | 'sell' | 'tokenCreation' | 'migration' | 'addLiquidity' | 'removeLiquidity';
  timestamp: number;
  accounts: {
    owner?: string;
    source?: string;
    destination?: string;
    bondingCurve?: string;
    associatedTokenAccount?: string;
    mint?: string;
  };
  info: {
    tokenAddress?: string;
    changes?: {
      sol: number;
      token: number;
    };
    liquidityAmount?: number;
    tokenMint?: string;
    initialSupply?: number;
    decimals?: number;
    bondingCurve?: {
      k: number;
      initialReserves: number;
      createFee: number;
    };
    stage?: 'pre' | 'post';
    // Enhanced discovery fields
    price?: number;
    volume?: number;
    isWhale?: boolean;
    patterns?: string[];
    fee?: number;
    priorityFee?: number;
    computeUnits?: number;
    slot?: number;
    blockTime?: number;
    relatedTokens?: string[];
    accountChanges?: Array<{
      account: string;
      preBalance: number;
      postBalance: number;
      change: number;
    }>;
  };
}

export interface PumpFunFilterResult {
  slot: number;
  blockTime: number;
  transactions: PumpFunTransactionResult[];
}

const CONFIG = {
  MIN_TRADE_THRESHOLD_SOL: 0.01,
  LAMPORTS_PER_SOL: 1000000000,
  TOTAL_SUPPLY: 1000000000,
  DECIMAL_PRECISION: 6,
  TOKEN_DECIMALS: 6,
};

const PROTOCOL = {
  PROGRAM_ID: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  NATIVE_SOL: 'So11111111111111111111111111111111111111112',
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  MIGRATION_ACCOUNT: '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg',
  DISCRIMINATOR: {
    BUY: new Uint8Array([102, 6, 61, 18, 1, 218, 235, 234]),
    SELL: new Uint8Array([51, 230, 133, 164, 1, 127, 131, 173]),
    CREATE: new Uint8Array([24, 30, 200, 40, 5, 28, 7, 119]),
    MIGRATE: new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34]),
  },
  BONDING_CURVE: {
    K: 32190005730,
    CREATE_ACCOUNT_FEE_SOL: 1231920 / 1000000000,
    INITIAL_RESERVES_SOL: 30,
  },
};

/**
 * Main entry point for QuickNode Stream filter
 * Can be used directly in QuickNode Stream custom filter configuration
 */
export function processPumpFunFilter(payload: any, config?: PumpFunFilterConfig): PumpFunFilterResult[] | null {
  if (!payload || typeof payload !== 'object') {
    console.warn('Invalid payload format');
    return null;
  }

  const filter = new PumpFunFilter(config);
  return filter.processStream(payload);
}

export class PumpFunFilter {
  private includeErrors: boolean;
  private minTradeThreshold: number;
  private enableEnhancedDiscovery: boolean;
  private whaleThreshold: number;
  private enablePatternDetection: boolean;
  private enablePriceCalculation: boolean;

  constructor(config: PumpFunFilterConfig = {}) {
    this.includeErrors = config.includeErrors ?? false;
    this.minTradeThreshold = config.minTradeThresholdSol ?? CONFIG.MIN_TRADE_THRESHOLD_SOL;
    this.enableEnhancedDiscovery = config.enableEnhancedDiscovery ?? true;
    this.whaleThreshold = config.whaleThresholdSol ?? 10; // 10 SOL default whale threshold
    this.enablePatternDetection = config.enablePatternDetection ?? true;
    this.enablePriceCalculation = config.enablePriceCalculation ?? true;
  }

  processStream(stream: any): PumpFunFilterResult[] | null {
    try {
      // Validate stream structure
      if (!stream || typeof stream !== 'object') {
        console.warn('Invalid stream format');
        return null;
      }

      // Safely extract block data with better validation
      const blockData = this._extractBlockData(stream);
      if (!blockData || !blockData.length) {
        console.warn('No valid block data found');
        return null;
      }

      const results: PumpFunFilterResult[] = [];

      for (const block of blockData) {
        // Skip empty or invalid blocks
        if (!this._isValidBlock(block)) {
          continue;
        }

        const blockTransactions = this._processBlock(block);
        if (blockTransactions.length > 0) {
          results.push({
            slot: block.parentSlot + 1,
            blockTime: block.blockTime,
            transactions: blockTransactions,
          });
        }
      }

      return results.length > 0 ? results : null;
    } catch (error) {
      console.error('Stream processing error:', error);
      return null;
    }
  }

  private _isValidBlock(block: any): boolean {
    return (
      block &&
      typeof block === 'object' &&
      Array.isArray(block.transactions) &&
      typeof block.blockTime === 'number' &&
      typeof block.parentSlot === 'number'
    );
  }

  private _extractBlockData(stream: any): any[] {
    // Handle different stream data structures
    if (stream.data === null || stream.data === undefined) {
      return [];
    }

    // If data is an array, ensure all elements are objects
    if (Array.isArray(stream.data)) {
      return stream.data.filter((block: any) => block && typeof block === 'object');
    }

    // If data is a single block object
    if (typeof stream.data === 'object') {
      return [stream.data];
    }

    return [];
  }

  private _processBlock(block: any): PumpFunTransactionResult[] {
    const transactions: PumpFunTransactionResult[] = [];

    // Additional validation for transactions array
    if (!Array.isArray(block.transactions)) {
      return transactions;
    }

    for (const tx of block.transactions) {
      // Skip invalid transactions
      if (!this._isValidTransaction(tx)) {
        continue;
      }

      try {
        const txInfo = this._processTransaction(tx, block);
        if (txInfo) {
          transactions.push(txInfo);
        }
      } catch (error: any) {
        console.warn('Error processing transaction:', error.message);
        continue;
      }
    }

    return transactions;
  }

  private _isValidTransaction(tx: any): boolean {
    // Basic structure validation
    if (!tx || !tx.transaction || !tx.meta) {
      return false;
    }

    // Skip failed transactions unless explicitly included
    if (tx.meta.err && !this.includeErrors) {
      return false;
    }

    // Validate required transaction properties
    if (
      !Array.isArray(tx.transaction.message?.instructions) ||
      !Array.isArray(tx.transaction.signatures) ||
      !Array.isArray(tx.transaction.message?.accountKeys)
    ) {
      return false;
    }

    // Primary check: Pump Fun program instruction
    const hasPumpFunProgram = tx.transaction.message.instructions.some(
      (ix: any) => ix.programId === PROTOCOL.PROGRAM_ID
    );

    if (hasPumpFunProgram) {
      return true;
    }

    // Enhanced discovery: Check for related transactions if enabled
    if (this.enableEnhancedDiscovery) {
      return this._enhanceTransactionDiscovery(tx);
    }

    return false;
  }

  private _processTransaction(tx: any, block: any): PumpFunTransactionResult | null {
    // Validate operation type
    const operation = this._determineOperation(tx);
    if (!operation) {
      return null;
    }

    // Ensure required transaction data exists
    const signature = tx.transaction.signatures[0];
    if (!signature) {
      return null;
    }

    const baseInfo: Partial<PumpFunTransactionResult> = {
      signature,
      operation: operation.type as any,
      timestamp: block.blockTime,
      accounts: {
        owner: this._extractOwnerAccount(tx),
      },
    };

    // Process based on operation type with error handling
    try {
      switch (operation.type) {
        case 'buy':
        case 'sell':
          return this._processTradeOperation(tx, baseInfo as PumpFunTransactionResult);
        case 'tokenCreation':
          return this._processTokenCreation(tx, baseInfo as PumpFunTransactionResult);
        case 'migration':
          return this._processMigration(tx, baseInfo as PumpFunTransactionResult);
        case 'addLiquidity':
        case 'removeLiquidity':
          return this._processLiquidityOperation(tx, baseInfo as PumpFunTransactionResult);
        default:
          return null;
      }
    } catch (error) {
      console.warn('Error processing', operation.type, 'operation');
      return null;
    }
  }

  private _determineOperation(tx: any): { type: string } | null {
    const instructions = tx.transaction.message.instructions;
    const logs = tx.meta?.logMessages || [];

    // Check for liquidity operations in logs
    if (logs.some((log: string) => log.includes('Instruction: MintTo'))) {
      return { type: 'addLiquidity' };
    }

    if (logs.some((log: string) => log.includes('Instruction: Withdraw'))) {
      return { type: 'removeLiquidity' };
    }

    // Check instruction data for other operations
    for (const ix of instructions) {
      if (ix.programId !== PROTOCOL.PROGRAM_ID) continue;
      const data = this._decodeInstructionData(ix.data);
      if (!data || data.length < 8) continue;

      if (this._matchesDiscriminator(data, PROTOCOL.DISCRIMINATOR.CREATE)) {
        return { type: 'tokenCreation' };
      }

      if (this._matchesDiscriminator(data, PROTOCOL.DISCRIMINATOR.BUY)) {
        return { type: 'buy' };
      }

      if (this._matchesDiscriminator(data, PROTOCOL.DISCRIMINATOR.SELL)) {
        return { type: 'sell' };
      }

      if (this._matchesDiscriminator(data, PROTOCOL.DISCRIMINATOR.MIGRATE)) {
        return { type: 'migration' };
      }
    }

    return null;
  }

  private _processTradeOperation(tx: any, baseInfo: PumpFunTransactionResult): PumpFunTransactionResult | null {
    const changes = this._calculateBalanceChanges(tx);
    if (!this._meetsTradeThreshold(changes)) return null;

    const tokenAddress = this._extractTokenAddress(tx);
    const info: any = {
      tokenAddress,
      changes,
      accounts: {
        ...baseInfo.accounts,
        source: this._extractSourceAccount(tx),
        destination: this._extractDestinationAccount(tx),
        bondingCurve: this._extractBondingCurveAccount(tx),
        associatedTokenAccount: this._extractAssociatedTokenAccount(tx),
        mint: tokenAddress,
      },
    };

    // Enhanced discovery features
    if (this.enableEnhancedDiscovery) {
      // Calculate price if enabled
      if (this.enablePriceCalculation && changes.token !== 0) {
        info.price = this._calculatePrice(changes);
      }

      // Calculate volume
      info.volume = Math.abs(changes.sol);

      // Whale detection
      info.isWhale = Math.abs(changes.sol) >= this.whaleThreshold;

      // Pattern detection
      if (this.enablePatternDetection) {
        info.patterns = this._detectPatterns(tx, changes);
      }

      // Extract fees
      info.fee = this._extractTransactionFee(tx);
      info.priorityFee = this._extractPriorityFee(tx);
      info.computeUnits = this._extractComputeUnits(tx);

      // Account changes
      info.accountChanges = this._extractAccountChanges(tx);

      // Related tokens (tokens involved in the transaction)
      info.relatedTokens = this._extractRelatedTokens(tx);
    }

    return {
      ...baseInfo,
      info,
    } as any;
  }

  private _processTokenCreation(tx: any, baseInfo: PumpFunTransactionResult): PumpFunTransactionResult | null {
    const creationInfo = this._extractTokenCreationInfo(tx);
    if (!creationInfo) return null;

    const info: any = {
      ...creationInfo,
      bondingCurve: {
        k: PROTOCOL.BONDING_CURVE.K,
        initialReserves: PROTOCOL.BONDING_CURVE.INITIAL_RESERVES_SOL,
        createFee: PROTOCOL.BONDING_CURVE.CREATE_ACCOUNT_FEE_SOL,
      },
    };

    // Enhanced discovery for token creation
    if (this.enableEnhancedDiscovery) {
      info.accounts = {
        ...baseInfo.accounts,
        mint: creationInfo.tokenMint,
        bondingCurve: this._extractBondingCurveAccount(tx),
        owner: baseInfo.accounts?.owner,
      };

      info.fee = this._extractTransactionFee(tx);
      info.computeUnits = this._extractComputeUnits(tx);
      info.accountChanges = this._extractAccountChanges(tx);
      
      // Extract metadata if available
      const metadata = this._extractTokenMetadata(tx);
      if (metadata) {
        info.metadata = metadata;
      }
    }

    return {
      ...baseInfo,
      info,
    };
  }

  private _processMigration(tx: any, baseInfo: PumpFunTransactionResult): PumpFunTransactionResult {
    const tokenAddress = this._extractTokenAddress(tx);
    const migrationInfo: any = {
      stage: this._determineMigrationStage(tx),
      tokenAddress,
    };

    // Enhanced discovery for migration
    if (this.enableEnhancedDiscovery) {
      migrationInfo.accounts = {
        ...baseInfo.accounts,
        mint: tokenAddress,
        migrationAccount: PROTOCOL.MIGRATION_ACCOUNT,
      };

      migrationInfo.fee = this._extractTransactionFee(tx);
      migrationInfo.computeUnits = this._extractComputeUnits(tx);
      migrationInfo.accountChanges = this._extractAccountChanges(tx);
      
      // Migration-specific patterns
      if (this.enablePatternDetection) {
        migrationInfo.patterns = ['migration'];
        if (migrationInfo.stage === 'pre') {
          migrationInfo.patterns.push('pre_migration');
        } else {
          migrationInfo.patterns.push('post_migration');
        }
      }
    }

    return {
      ...baseInfo,
      info: migrationInfo,
    };
  }

  private _processLiquidityOperation(tx: any, baseInfo: PumpFunTransactionResult): PumpFunTransactionResult {
    const changes = this._calculateBalanceChanges(tx);
    const tokenAddress = this._extractTokenAddress(tx);
    const info: any = {
      tokenAddress,
      changes,
      liquidityAmount: Math.abs(changes.token),
    };

    // Enhanced discovery for liquidity operations
    if (this.enableEnhancedDiscovery) {
      info.accounts = {
        ...baseInfo.accounts,
        mint: tokenAddress,
        bondingCurve: this._extractBondingCurveAccount(tx),
      };

      info.volume = Math.abs(changes.sol);
      info.fee = this._extractTransactionFee(tx);
      info.computeUnits = this._extractComputeUnits(tx);
      info.accountChanges = this._extractAccountChanges(tx);

      // Large liquidity operations
      if (Math.abs(changes.sol) >= this.whaleThreshold) {
        info.isWhale = true;
      }

      if (this.enablePatternDetection) {
        info.patterns = ['liquidity_operation'];
        if (baseInfo.operation === 'addLiquidity') {
          info.patterns.push('liquidity_add');
        } else {
          info.patterns.push('liquidity_remove');
        }
      }
    }

    return {
      ...baseInfo,
      info,
    };
  }

  private _calculateBalanceChanges(tx: any): { sol: number; token: number } {
    const changes = {
      sol: this._calculateSolChange(tx),
      token: this._calculateTokenChange(tx),
    };

    return {
      sol: this._formatAmount(changes.sol),
      token: this._formatAmount(changes.token),
    };
  }

  private _calculateSolChange(tx: any): number {
    const ownerIndex = this._getOwnerIndex(tx);
    if (ownerIndex === -1) return 0;

    const preSol = tx.meta.preBalances[ownerIndex] / CONFIG.LAMPORTS_PER_SOL;
    const postSol = tx.meta.postBalances[ownerIndex] / CONFIG.LAMPORTS_PER_SOL;
    return postSol - preSol;
  }

  private _calculateTokenChange(tx: any): number {
    const preTokens = tx.meta.preTokenBalances || [];
    const postTokens = tx.meta.postTokenBalances || [];

    const tokenAddress = this._extractTokenAddress(tx);
    if (!tokenAddress) return 0;

    const preAmount = this._findTokenBalance(preTokens, tokenAddress);
    const postAmount = this._findTokenBalance(postTokens, tokenAddress);
    return postAmount - preAmount;
  }

  private _extractTokenCreationInfo(tx: any): any {
    const postTokens = tx.meta?.postTokenBalances || [];
    const mintAccount = postTokens.find(
      (balance: any) =>
        balance.uiTokenAmount.amount ===
        (CONFIG.TOTAL_SUPPLY * 10 ** CONFIG.TOKEN_DECIMALS).toString()
    );

    if (!mintAccount) return null;

    return {
      tokenMint: mintAccount.mint,
      initialSupply: CONFIG.TOTAL_SUPPLY,
      decimals: CONFIG.TOKEN_DECIMALS,
    };
  }

  private _determineMigrationStage(tx: any): 'pre' | 'post' {
    const logs = tx.meta?.logMessages || [];
    return logs.some((log: string) => log.includes('Initialize')) ? 'pre' : 'post';
  }

  /**
   * Decode base58 instruction data
   */
  private _decodeInstructionData(encoded: string): Uint8Array | null {
    try {
      return base58Decode(encoded);
    } catch (error) {
      console.error('Instruction decode error:', error);
      return null;
    }
  }

  /**
   * Check if instruction matches a discriminator
   */
  private _matchesDiscriminator(data: Uint8Array, discriminator: Uint8Array): boolean {
    return discriminator.every((byte, i) => byte === data[i]);
  }

  /**
   * Find token balance in balance array
   */
  private _findTokenBalance(balances: any[], mint: string): number {
    const balance = balances.find((b: any) => b.mint === mint);
    return balance ? balance.uiTokenAmount.uiAmount || 0 : 0;
  }

  /**
   * Check if transaction meets minimum SOL threshold
   */
  private _meetsTradeThreshold(changes: { sol: number; token: number }): boolean {
    return Math.abs(changes.sol) >= this.minTradeThreshold;
  }

  /**
   * Format amount to standard decimal places
   */
  private _formatAmount(amount: number): number {
    return parseFloat(amount.toFixed(CONFIG.DECIMAL_PRECISION));
  }

  /**
   * Extract token address from transaction
   */
  private _extractTokenAddress(tx: any): string | null {
    const postTokens = tx.meta.postTokenBalances || [];
    return postTokens.length > 0 ? postTokens[0].mint : null;
  }

  /**
   * Extract owner (signer) account from transaction
   */
  private _extractOwnerAccount(tx: any): string | undefined {
    return tx.transaction.message.accountKeys.find((key: any) => key.signer)?.pubkey;
  }

  /**
   * Extract source account from transaction
   */
  private _extractSourceAccount(tx: any): string | null {
    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
      if (ix.programId === PROTOCOL.TOKEN_PROGRAM) {
        return ix.accounts[0];
      }
    }
    return null;
  }

  /**
   * Extract destination account from transaction
   */
  private _extractDestinationAccount(tx: any): string | null {
    const instructions = tx.transaction.message.instructions;
    for (const ix of instructions) {
      if (ix.programId === PROTOCOL.TOKEN_PROGRAM) {
        return ix.accounts[1];
      }
    }
    return null;
  }

  /**
   * Get index of owner account in accountKeys array
   */
  private _getOwnerIndex(tx: any): number {
    return tx.transaction.message.accountKeys.findIndex((key: any) => key.signer);
  }

  /**
   * Enhanced Discovery Methods
   */

  /**
   * Calculate token price from trade changes
   */
  private _calculatePrice(changes: { sol: number; token: number }): number {
    if (changes.token === 0) return 0;
    return Math.abs(changes.sol / changes.token);
  }

  /**
   * Detect trading patterns
   */
  private _detectPatterns(tx: any, changes: { sol: number; token: number }): string[] {
    const patterns: string[] = [];
    const logs = tx.meta?.logMessages || [];
    const instructions = tx.transaction.message.instructions || [];

    // Large trade pattern
    if (Math.abs(changes.sol) >= this.whaleThreshold) {
      patterns.push('whale_trade');
    }

    // Rapid trading detection (multiple instructions)
    if (instructions.length > 5) {
      patterns.push('complex_transaction');
    }

    // Bot-like patterns (specific instruction sequences)
    if (this._hasBotPattern(tx)) {
      patterns.push('potential_bot');
    }

    // Sandwich attack detection
    if (this._detectSandwichAttack(tx)) {
      patterns.push('potential_sandwich');
    }

    // Flash loan detection
    if (logs.some((log: string) => log.includes('FlashLoan') || log.includes('flash'))) {
      patterns.push('flash_loan');
    }

    // High frequency pattern (check compute units)
    const computeUnits = this._extractComputeUnits(tx);
    if (computeUnits && computeUnits > 200000) {
      patterns.push('high_compute');
    }

    return patterns;
  }

  /**
   * Detect bot-like patterns
   */
  private _hasBotPattern(tx: any): boolean {
    const instructions = tx.transaction.message.instructions || [];
    
    // Check for repetitive instruction patterns
    const programIds = instructions.map((ix: any) => ix.programId);
    const uniquePrograms = new Set(programIds);
    
    // Bots often use multiple similar instructions
    if (instructions.length > 3 && uniquePrograms.size === 1) {
      return true;
    }

    // Check for specific bot signatures in logs
    const logs = tx.meta?.logMessages || [];
    const botKeywords = ['bot', 'automated', 'script', 'mev'];
    if (logs.some((log: string) => 
      botKeywords.some(keyword => log.toLowerCase().includes(keyword))
    )) {
      return true;
    }

    return false;
  }

  /**
   * Detect potential sandwich attack
   */
  private _detectSandwichAttack(tx: any): boolean {
    const instructions = tx.transaction.message.instructions || [];
    
    // Sandwich attacks typically have:
    // 1. Multiple swap instructions
    // 2. Same token mint appearing multiple times
    // 3. High priority fee
    
    const swapCount = instructions.filter((ix: any) => 
      ix.programId === PROTOCOL.PROGRAM_ID
    ).length;

    if (swapCount >= 2) {
      const priorityFee = this._extractPriorityFee(tx);
      if (priorityFee && priorityFee > 0.001) { // High priority fee
        return true;
      }
    }

    return false;
  }

  /**
   * Extract transaction fee
   */
  private _extractTransactionFee(tx: any): number {
    if (!tx.meta?.fee) return 0;
    return tx.meta.fee / CONFIG.LAMPORTS_PER_SOL;
  }

  /**
   * Extract priority fee
   */
  private _extractPriorityFee(tx: any): number | null {
    const logs = tx.meta?.logMessages || [];
    
    // Look for priority fee in logs
    for (const log of logs) {
      if (typeof log === 'string') {
        const match = log.match(/priority.*?(\d+)/i);
        if (match) {
          return parseInt(match[1]) / CONFIG.LAMPORTS_PER_SOL;
        }
      }
    }

    // Check compute budget instructions
    const instructions = tx.transaction.message.instructions || [];
    for (const ix of instructions) {
      if (ix.programId === 'ComputeBudget111111111111111111111111111111') {
        // Try to extract priority fee from compute budget instruction
        const data = this._decodeInstructionData(ix.data);
        if (data && data.length >= 8) {
          // Compute budget instruction format may contain priority fee
          // This is a simplified extraction
          return null; // Would need full instruction parsing
        }
      }
    }

    return null;
  }

  /**
   * Extract compute units used
   */
  private _extractComputeUnits(tx: any): number | null {
    if (tx.meta?.computeUnitsConsumed) {
      return tx.meta.computeUnitsConsumed;
    }

    // Try to extract from logs
    const logs = tx.meta?.logMessages || [];
    for (const log of logs) {
      if (typeof log === 'string') {
        const match = log.match(/compute.*?(\d+)/i);
        if (match) {
          return parseInt(match[1]);
        }
      }
    }

    return null;
  }

  /**
   * Extract all account balance changes
   */
  private _extractAccountChanges(tx: any): Array<{
    account: string;
    preBalance: number;
    postBalance: number;
    change: number;
  }> {
    const changes: Array<{
      account: string;
      preBalance: number;
      postBalance: number;
      change: number;
    }> = [];

    const accountKeys = tx.transaction.message.accountKeys || [];
    const preBalances = tx.meta?.preBalances || [];
    const postBalances = tx.meta?.postBalances || [];

    for (let i = 0; i < accountKeys.length; i++) {
      const preBalance = (preBalances[i] || 0) / CONFIG.LAMPORTS_PER_SOL;
      const postBalance = (postBalances[i] || 0) / CONFIG.LAMPORTS_PER_SOL;
      const change = postBalance - preBalance;

      // Only include accounts with significant changes
      if (Math.abs(change) > 0.0001) {
        changes.push({
          account: typeof accountKeys[i] === 'string' 
            ? accountKeys[i] 
            : accountKeys[i]?.pubkey || accountKeys[i]?.toBase58?.() || 'unknown',
          preBalance: this._formatAmount(preBalance),
          postBalance: this._formatAmount(postBalance),
          change: this._formatAmount(change),
        });
      }
    }

    return changes;
  }

  /**
   * Extract related tokens from transaction
   */
  private _extractRelatedTokens(tx: any): string[] {
    const tokens = new Set<string>();
    
    // Extract from token balances
    const preTokens = tx.meta?.preTokenBalances || [];
    const postTokens = tx.meta?.postTokenBalances || [];

    preTokens.forEach((balance: any) => {
      if (balance.mint) tokens.add(balance.mint);
    });

    postTokens.forEach((balance: any) => {
      if (balance.mint) tokens.add(balance.mint);
    });

    // Extract from instructions
    const instructions = tx.transaction.message.instructions || [];
    instructions.forEach((ix: any) => {
      if (ix.accounts) {
        ix.accounts.forEach((acc: any) => {
          const accStr = typeof acc === 'string' ? acc : acc?.toBase58?.() || '';
          // Check if account might be a token mint (basic heuristic)
          if (accStr.length === 44) {
            // Could be a token mint, but we can't be sure without more context
          }
        });
      }
    });

    return Array.from(tokens);
  }

  /**
   * Extract bonding curve account
   */
  private _extractBondingCurveAccount(tx: any): string | null {
    const instructions = tx.transaction.message.instructions || [];
    
    for (const ix of instructions) {
      if (ix.programId === PROTOCOL.PROGRAM_ID && ix.accounts) {
        // Bonding curve account is typically one of the accounts
        // This is a simplified extraction - may need adjustment based on actual program structure
        if (ix.accounts.length > 2) {
          return typeof ix.accounts[1] === 'string' 
            ? ix.accounts[1] 
            : ix.accounts[1]?.pubkey || ix.accounts[1]?.toBase58?.() || null;
        }
      }
    }

    return null;
  }

  /**
   * Extract associated token account
   */
  private _extractAssociatedTokenAccount(tx: any): string | null {
    const postTokens = tx.meta?.postTokenBalances || [];
    
    if (postTokens.length > 0) {
      return postTokens[0].owner || null;
    }

    // Try to extract from instructions
    const instructions = tx.transaction.message.instructions || [];
    for (const ix of instructions) {
      if (ix.programId === PROTOCOL.TOKEN_PROGRAM && ix.accounts) {
        if (ix.accounts.length > 0) {
          const acc = ix.accounts[0];
          return typeof acc === 'string' ? acc : acc?.pubkey || acc?.toBase58?.() || null;
        }
      }
    }

    return null;
  }

  /**
   * Extract token metadata if available
   */
  private _extractTokenMetadata(tx: any): any | null {
    const logs = tx.meta?.logMessages || [];
    const metadata: any = {};

    // Try to extract metadata from logs
    for (const log of logs) {
      if (typeof log === 'string') {
        // Look for metadata patterns
        if (log.includes('name:') || log.includes('symbol:')) {
          const nameMatch = log.match(/name:\s*([^\s,]+)/i);
          const symbolMatch = log.match(/symbol:\s*([^\s,]+)/i);
          
          if (nameMatch) metadata.name = nameMatch[1];
          if (symbolMatch) metadata.symbol = symbolMatch[1];
        }

        // Look for URI
        if (log.includes('uri:') || log.includes('metadata')) {
          const uriMatch = log.match(/uri:\s*([^\s,]+)/i);
          if (uriMatch) metadata.uri = uriMatch[1];
        }
      }
    }

    return Object.keys(metadata).length > 0 ? metadata : null;
  }

  /**
   * Enhanced transaction discovery - check for additional Pump Fun related transactions
   */
  private _enhanceTransactionDiscovery(tx: any): boolean {
    if (!this.enableEnhancedDiscovery) return false;

    const instructions = tx.transaction.message.instructions || [];
    const logs = tx.meta?.logMessages || [];

    // Check for indirect Pump Fun involvement
    // (e.g., transactions that interact with tokens created on Pump Fun)
    const hasPumpFunToken = this._hasPumpFunToken(tx);
    const hasRelatedActivity = this._hasRelatedActivity(tx);

    return hasPumpFunToken || hasRelatedActivity;
  }

  /**
   * Check if transaction involves a Pump Fun created token
   */
  private _hasPumpFunToken(tx: any): boolean {
    const postTokens = tx.meta?.postTokenBalances || [];
    const preTokens = tx.meta?.preTokenBalances || [];
    const allTokens = [...preTokens, ...postTokens];

    // Check if any token mint matches known Pump Fun token patterns
    // This is a simplified check - in production, you'd maintain a registry
    for (const token of allTokens) {
      if (token.mint) {
        // Could check against a known list of Pump Fun tokens
        // For now, we rely on program ID matching
      }
    }

    return false;
  }

  /**
   * Check for related activity (e.g., swaps involving Pump Fun tokens)
   */
  private _hasRelatedActivity(tx: any): boolean {
    const instructions = tx.transaction.message.instructions || [];
    
    // Check for DEX swaps that might involve Pump Fun tokens
    const dexPrograms = [
      '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium
      '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca
      'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
    ];

    const hasDexSwap = instructions.some((ix: any) => 
      dexPrograms.includes(ix.programId)
    );

    // If there's a DEX swap and Pump Fun tokens are involved, it's related
    if (hasDexSwap) {
      const tokens = this._extractRelatedTokens(tx);
      return tokens.length > 0;
    }

    return false;
  }
}

/**
 * Base58 decoder
 */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(encoded: string): Uint8Array {
  if (typeof encoded !== 'string') return new Uint8Array();

  const result: number[] = [];
  for (let i = 0; i < encoded.length; i++) {
    let carry = BASE58_ALPHABET.indexOf(encoded[i]);
    if (carry < 0) return new Uint8Array();

    for (let j = 0; j < result.length; j++) {
      carry += result[j] * 58;
      result[j] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      result.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (let i = 0; i < encoded.length && encoded[i] === '1'; i++) {
    result.push(0);
  }

  return new Uint8Array(result.reverse());
}

/**
 * Export for use in QuickNode Stream custom filter
 * This is the main entry point that QuickNode will call
 * 
 * You can customize the filter behavior by modifying the config object:
 * 
 * Example with custom configuration:
 * ```javascript
 * const config = {
 *   minTradeThresholdSol: 0.05,  // Only trades >= 0.05 SOL
 *   whaleThresholdSol: 50,       // Flag trades >= 50 SOL as whale
 *   enableEnhancedDiscovery: true,
 *   enablePatternDetection: true,
 *   enablePriceCalculation: true,
 *   includeErrors: false
 * };
 * const filter = new PumpFunFilter(config);
 * return filter.processStream(payload);
 * ```
 */
export function main(payload: any, config?: PumpFunFilterConfig): PumpFunFilterResult[] | null {
  if (!payload || typeof payload !== 'object') {
    console.warn('Invalid payload format');
    return null;
  }

  const filter = new PumpFunFilter(config);
  return filter.processStream(payload);
}

