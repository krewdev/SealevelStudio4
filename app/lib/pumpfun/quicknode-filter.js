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
 * Usage: Copy this entire file into QuickNode Stream custom filter
 * 
 * Configuration (modify CONFIG object below):
 * - MIN_TRADE_THRESHOLD_SOL: Minimum SOL amount to include trades (default: 0.01)
 * - WHALE_THRESHOLD_SOL: SOL amount to flag as whale transaction (default: 10)
 * - ENABLE_ENHANCED_DISCOVERY: Enable advanced discovery features (default: true)
 * - ENABLE_PATTERN_DETECTION: Enable pattern detection (default: true)
 * - ENABLE_PRICE_CALCULATION: Enable price calculation (default: true)
 * - INCLUDE_ERRORS: Include failed transactions (default: false)
 */

// Configuration
var CONFIG = {
  MIN_TRADE_THRESHOLD_SOL: 0.01,
  LAMPORTS_PER_SOL: 1000000000,
  TOTAL_SUPPLY: 1000000000,
  DECIMAL_PRECISION: 6,
  TOKEN_DECIMALS: 6,
  WHALE_THRESHOLD_SOL: 10,
  ENABLE_ENHANCED_DISCOVERY: true,
  ENABLE_PATTERN_DETECTION: true,
  ENABLE_PRICE_CALCULATION: true,
  INCLUDE_ERRORS: false
};

// Protocol constants
var PROTOCOL = {
  PROGRAM_ID: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  NATIVE_SOL: 'So11111111111111111111111111111111111111112',
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  MIGRATION_ACCOUNT: '39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg',
  DISCRIMINATOR: {
    BUY: new Uint8Array([102, 6, 61, 18, 1, 218, 235, 234]),
    SELL: new Uint8Array([51, 230, 133, 164, 1, 127, 131, 173]),
    CREATE: new Uint8Array([24, 30, 200, 40, 5, 28, 7, 119]),
    MIGRATE: new Uint8Array([183, 18, 70, 156, 148, 109, 161, 34])
  },
  BONDING_CURVE: {
    K: 32190005730,
    CREATE_ACCOUNT_FEE_SOL: 1231920 / 1000000000,
    INITIAL_RESERVES_SOL: 30
  }
};

// Base58 decoder
var BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Decode(encoded) {
  if (typeof encoded !== 'string') {
    return new Uint8Array();
  }

  var result = [];
  for (var i = 0; i < encoded.length; i++) {
    var carry = BASE58_ALPHABET.indexOf(encoded[i]);
    if (carry < 0) {
      return new Uint8Array();
    }

    for (var j = 0; j < result.length; j++) {
      carry += result[j] * 58;
      result[j] = carry & 0xff;
      carry >>= 8;
    }

    while (carry > 0) {
      result.push(carry & 0xff);
      carry >>= 8;
    }
  }

  for (var k = 0; k < encoded.length && encoded[k] === '1'; k++) {
    result.push(0);
  }

  return new Uint8Array(result.reverse());
}

// PumpFunFilter class
function PumpFunFilter() {
  this.includeErrors = CONFIG.INCLUDE_ERRORS;
  this.minTradeThreshold = CONFIG.MIN_TRADE_THRESHOLD_SOL;
  this.enableEnhancedDiscovery = CONFIG.ENABLE_ENHANCED_DISCOVERY;
  this.whaleThreshold = CONFIG.WHALE_THRESHOLD_SOL;
  this.enablePatternDetection = CONFIG.ENABLE_PATTERN_DETECTION;
  this.enablePriceCalculation = CONFIG.ENABLE_PRICE_CALCULATION;
}

PumpFunFilter.prototype.processStream = function(stream) {
  try {
    if (!stream || typeof stream !== 'object') {
      console.warn('Invalid stream format');
      return null;
    }

    var blockData = this._extractBlockData(stream);
    if (!blockData || blockData.length === 0) {
      console.warn('No valid block data found');
      return null;
    }

    var results = [];

    for (var i = 0; i < blockData.length; i++) {
      var block = blockData[i];
      if (!this._isValidBlock(block)) {
        continue;
      }

      var blockTransactions = this._processBlock(block);
      if (blockTransactions.length > 0) {
        results.push({
          slot: block.parentSlot + 1,
          blockTime: block.blockTime,
          transactions: blockTransactions
        });
      }
    }

    return results.length > 0 ? results : null;
  } catch (error) {
    console.error('Stream processing error:', error);
    return null;
  }
};

PumpFunFilter.prototype._isValidBlock = function(block) {
  return (
    block &&
    typeof block === 'object' &&
    Array.isArray(block.transactions) &&
    typeof block.blockTime === 'number' &&
    typeof block.parentSlot === 'number'
  );
};

PumpFunFilter.prototype._extractBlockData = function(stream) {
  if (stream.data === null || stream.data === undefined) {
    return [];
  }

  if (Array.isArray(stream.data)) {
    return stream.data.filter(function(block) {
      return block && typeof block === 'object';
    });
  }

  if (typeof stream.data === 'object') {
    return [stream.data];
  }

  return [];
};

PumpFunFilter.prototype._processBlock = function(block) {
  var transactions = [];

  if (!Array.isArray(block.transactions)) {
    return transactions;
  }

  for (var i = 0; i < block.transactions.length; i++) {
    var tx = block.transactions[i];
    if (!this._isValidTransaction(tx)) {
      continue;
    }

    try {
      var txInfo = this._processTransaction(tx, block);
      if (txInfo) {
        transactions.push(txInfo);
      }
    } catch (error) {
      console.warn('Error processing transaction:', error.message);
      continue;
    }
  }

  return transactions;
};

PumpFunFilter.prototype._isValidTransaction = function(tx) {
  if (!tx || !tx.transaction || !tx.meta) {
    return false;
  }

  if (tx.meta.err && !this.includeErrors) {
    return false;
  }

  if (
    !Array.isArray(tx.transaction.message.instructions) ||
    !Array.isArray(tx.transaction.signatures) ||
    !Array.isArray(tx.transaction.message.accountKeys)
  ) {
    return false;
  }

  var hasPumpFunProgram = tx.transaction.message.instructions.some(function(ix) {
    return ix.programId === PROTOCOL.PROGRAM_ID;
  });

  if (hasPumpFunProgram) {
    return true;
  }

  if (this.enableEnhancedDiscovery) {
    return this._enhanceTransactionDiscovery(tx);
  }

  return false;
};

PumpFunFilter.prototype._processTransaction = function(tx, block) {
  var operation = this._determineOperation(tx);
  if (!operation) {
    return null;
  }

  var signature = tx.transaction.signatures[0];
  if (!signature) {
    return null;
  }

  var baseInfo = {
    signature: signature,
    operation: operation.type,
    timestamp: block.blockTime,
    accounts: {
      owner: this._extractOwnerAccount(tx)
    }
  };

  try {
    switch (operation.type) {
      case 'buy':
      case 'sell':
        return this._processTradeOperation(tx, baseInfo);
      case 'tokenCreation':
        return this._processTokenCreation(tx, baseInfo);
      case 'migration':
        return this._processMigration(tx, baseInfo);
      case 'addLiquidity':
      case 'removeLiquidity':
        return this._processLiquidityOperation(tx, baseInfo);
      default:
        return null;
    }
  } catch (error) {
    console.warn('Error processing', operation.type, 'operation');
    return null;
  }
};

PumpFunFilter.prototype._determineOperation = function(tx) {
  var instructions = tx.transaction.message.instructions;
  var logs = tx.meta.logMessages || [];

  if (logs.some(function(log) {
    return log.includes('Instruction: MintTo');
  })) {
    return { type: 'addLiquidity' };
  }

  if (logs.some(function(log) {
    return log.includes('Instruction: Withdraw');
  })) {
    return { type: 'removeLiquidity' };
  }

  for (var i = 0; i < instructions.length; i++) {
    var ix = instructions[i];
    if (ix.programId !== PROTOCOL.PROGRAM_ID) {
      continue;
    }

    var data = this._decodeInstructionData(ix.data);
    if (!data || data.length < 8) {
      continue;
    }

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
};

PumpFunFilter.prototype._processTradeOperation = function(tx, baseInfo) {
  var changes = this._calculateBalanceChanges(tx);
  if (!this._meetsTradeThreshold(changes)) {
    return null;
  }

  var tokenAddress = this._extractTokenAddress(tx);
  var info = {
    tokenAddress: tokenAddress,
    changes: changes,
    accounts: {
      owner: baseInfo.accounts.owner,
      source: this._extractSourceAccount(tx),
      destination: this._extractDestinationAccount(tx),
      bondingCurve: this._extractBondingCurveAccount(tx),
      associatedTokenAccount: this._extractAssociatedTokenAccount(tx),
      mint: tokenAddress
    }
  };

  if (this.enableEnhancedDiscovery) {
    if (this.enablePriceCalculation && changes.token !== 0) {
      info.price = this._calculatePrice(changes);
    }

    info.volume = Math.abs(changes.sol);
    info.isWhale = Math.abs(changes.sol) >= this.whaleThreshold;

    if (this.enablePatternDetection) {
      info.patterns = this._detectPatterns(tx, changes);
    }

    info.fee = this._extractTransactionFee(tx);
    info.priorityFee = this._extractPriorityFee(tx);
    info.computeUnits = this._extractComputeUnits(tx);
    info.accountChanges = this._extractAccountChanges(tx);
    info.relatedTokens = this._extractRelatedTokens(tx);
  }

  return {
    signature: baseInfo.signature,
    operation: baseInfo.operation,
    timestamp: baseInfo.timestamp,
    accounts: info.accounts,
    info: info
  };
};

PumpFunFilter.prototype._processTokenCreation = function(tx, baseInfo) {
  var creationInfo = this._extractTokenCreationInfo(tx);
  if (!creationInfo) {
    return null;
  }

  var info = {
    tokenMint: creationInfo.tokenMint,
    initialSupply: creationInfo.initialSupply,
    decimals: creationInfo.decimals,
    bondingCurve: {
      k: PROTOCOL.BONDING_CURVE.K,
      initialReserves: PROTOCOL.BONDING_CURVE.INITIAL_RESERVES_SOL,
      createFee: PROTOCOL.BONDING_CURVE.CREATE_ACCOUNT_FEE_SOL
    }
  };

  if (this.enableEnhancedDiscovery) {
    info.accounts = {
      owner: baseInfo.accounts.owner,
      mint: creationInfo.tokenMint,
      bondingCurve: this._extractBondingCurveAccount(tx)
    };

    info.fee = this._extractTransactionFee(tx);
    info.computeUnits = this._extractComputeUnits(tx);
    info.accountChanges = this._extractAccountChanges(tx);

    var metadata = this._extractTokenMetadata(tx);
    if (metadata) {
      info.metadata = metadata;
    }
  }

  return {
    signature: baseInfo.signature,
    operation: baseInfo.operation,
    timestamp: baseInfo.timestamp,
    accounts: info.accounts || baseInfo.accounts,
    info: info
  };
};

PumpFunFilter.prototype._processMigration = function(tx, baseInfo) {
  var tokenAddress = this._extractTokenAddress(tx);
  var migrationInfo = {
    stage: this._determineMigrationStage(tx),
    tokenAddress: tokenAddress
  };

  if (this.enableEnhancedDiscovery) {
    migrationInfo.accounts = {
      owner: baseInfo.accounts.owner,
      mint: tokenAddress,
      migrationAccount: PROTOCOL.MIGRATION_ACCOUNT
    };

    migrationInfo.fee = this._extractTransactionFee(tx);
    migrationInfo.computeUnits = this._extractComputeUnits(tx);
    migrationInfo.accountChanges = this._extractAccountChanges(tx);

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
    signature: baseInfo.signature,
    operation: baseInfo.operation,
    timestamp: baseInfo.timestamp,
    accounts: migrationInfo.accounts || baseInfo.accounts,
    info: migrationInfo
  };
};

PumpFunFilter.prototype._processLiquidityOperation = function(tx, baseInfo) {
  var changes = this._calculateBalanceChanges(tx);
  var tokenAddress = this._extractTokenAddress(tx);
  var info = {
    tokenAddress: tokenAddress,
    changes: changes,
    liquidityAmount: Math.abs(changes.token)
  };

  if (this.enableEnhancedDiscovery) {
    info.accounts = {
      owner: baseInfo.accounts.owner,
      mint: tokenAddress,
      bondingCurve: this._extractBondingCurveAccount(tx)
    };

    info.volume = Math.abs(changes.sol);
    info.fee = this._extractTransactionFee(tx);
    info.computeUnits = this._extractComputeUnits(tx);
    info.accountChanges = this._extractAccountChanges(tx);

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
    signature: baseInfo.signature,
    operation: baseInfo.operation,
    timestamp: baseInfo.timestamp,
    accounts: info.accounts || baseInfo.accounts,
    info: info
  };
};

PumpFunFilter.prototype._calculateBalanceChanges = function(tx) {
  var changes = {
    sol: this._calculateSolChange(tx),
    token: this._calculateTokenChange(tx)
  };

  return {
    sol: this._formatAmount(changes.sol),
    token: this._formatAmount(changes.token)
  };
};

PumpFunFilter.prototype._calculateSolChange = function(tx) {
  var ownerIndex = this._getOwnerIndex(tx);
  if (ownerIndex === -1) {
    return 0;
  }

  var preSol = tx.meta.preBalances[ownerIndex] / CONFIG.LAMPORTS_PER_SOL;
  var postSol = tx.meta.postBalances[ownerIndex] / CONFIG.LAMPORTS_PER_SOL;
  return postSol - preSol;
};

PumpFunFilter.prototype._calculateTokenChange = function(tx) {
  var preTokens = tx.meta.preTokenBalances || [];
  var postTokens = tx.meta.postTokenBalances || [];
  var tokenAddress = this._extractTokenAddress(tx);

  if (!tokenAddress) {
    return 0;
  }

  var preAmount = this._findTokenBalance(preTokens, tokenAddress);
  var postAmount = this._findTokenBalance(postTokens, tokenAddress);
  return postAmount - preAmount;
};

PumpFunFilter.prototype._extractTokenCreationInfo = function(tx) {
  var postTokens = tx.meta.postTokenBalances || [];
  var totalSupply = CONFIG.TOTAL_SUPPLY * Math.pow(10, CONFIG.TOKEN_DECIMALS);

  for (var i = 0; i < postTokens.length; i++) {
    var balance = postTokens[i];
    if (balance.uiTokenAmount && balance.uiTokenAmount.amount === totalSupply.toString()) {
      return {
        tokenMint: balance.mint,
        initialSupply: CONFIG.TOTAL_SUPPLY,
        decimals: CONFIG.TOKEN_DECIMALS
      };
    }
  }

  return null;
};

PumpFunFilter.prototype._determineMigrationStage = function(tx) {
  var logs = tx.meta.logMessages || [];
  for (var i = 0; i < logs.length; i++) {
    if (logs[i].includes('Initialize')) {
      return 'pre';
    }
  }
  return 'post';
};

PumpFunFilter.prototype._decodeInstructionData = function(encoded) {
  try {
    return base58Decode(encoded);
  } catch (error) {
    console.error('Instruction decode error:', error);
    return null;
  }
};

PumpFunFilter.prototype._matchesDiscriminator = function(data, discriminator) {
  for (var i = 0; i < discriminator.length; i++) {
    if (data[i] !== discriminator[i]) {
      return false;
    }
  }
  return true;
};

PumpFunFilter.prototype._findTokenBalance = function(balances, mint) {
  for (var i = 0; i < balances.length; i++) {
    if (balances[i].mint === mint) {
      return balances[i].uiTokenAmount ? (balances[i].uiTokenAmount.uiAmount || 0) : 0;
    }
  }
  return 0;
};

PumpFunFilter.prototype._meetsTradeThreshold = function(changes) {
  return Math.abs(changes.sol) >= this.minTradeThreshold;
};

PumpFunFilter.prototype._formatAmount = function(amount) {
  return parseFloat(amount.toFixed(CONFIG.DECIMAL_PRECISION));
};

PumpFunFilter.prototype._extractTokenAddress = function(tx) {
  var postTokens = tx.meta.postTokenBalances || [];
  return postTokens.length > 0 ? postTokens[0].mint : null;
};

PumpFunFilter.prototype._extractOwnerAccount = function(tx) {
  var accountKeys = tx.transaction.message.accountKeys;
  for (var i = 0; i < accountKeys.length; i++) {
    if (accountKeys[i].signer) {
      return accountKeys[i].pubkey;
    }
  }
  return undefined;
};

PumpFunFilter.prototype._extractSourceAccount = function(tx) {
  var instructions = tx.transaction.message.instructions;
  for (var i = 0; i < instructions.length; i++) {
    var ix = instructions[i];
    if (ix.programId === PROTOCOL.TOKEN_PROGRAM && ix.accounts && ix.accounts.length > 0) {
      var acc = ix.accounts[0];
      return typeof acc === 'string' ? acc : (acc.pubkey || acc.toBase58 ? acc.toBase58() : null);
    }
  }
  return null;
};

PumpFunFilter.prototype._extractDestinationAccount = function(tx) {
  var instructions = tx.transaction.message.instructions;
  for (var i = 0; i < instructions.length; i++) {
    var ix = instructions[i];
    if (ix.programId === PROTOCOL.TOKEN_PROGRAM && ix.accounts && ix.accounts.length > 1) {
      var acc = ix.accounts[1];
      return typeof acc === 'string' ? acc : (acc.pubkey || acc.toBase58 ? acc.toBase58() : null);
    }
  }
  return null;
};

PumpFunFilter.prototype._getOwnerIndex = function(tx) {
  var accountKeys = tx.transaction.message.accountKeys;
  for (var i = 0; i < accountKeys.length; i++) {
    if (accountKeys[i].signer) {
      return i;
    }
  }
  return -1;
};

// Enhanced discovery methods
PumpFunFilter.prototype._calculatePrice = function(changes) {
  if (changes.token === 0) {
    return 0;
  }
  return Math.abs(changes.sol / changes.token);
};

PumpFunFilter.prototype._detectPatterns = function(tx, changes) {
  var patterns = [];
  var logs = tx.meta.logMessages || [];
  var instructions = tx.transaction.message.instructions || [];

  if (Math.abs(changes.sol) >= this.whaleThreshold) {
    patterns.push('whale_trade');
  }

  if (instructions.length > 5) {
    patterns.push('complex_transaction');
  }

  if (this._hasBotPattern(tx)) {
    patterns.push('potential_bot');
  }

  if (this._detectSandwichAttack(tx)) {
    patterns.push('potential_sandwich');
  }

  for (var i = 0; i < logs.length; i++) {
    if (logs[i].includes('FlashLoan') || logs[i].includes('flash')) {
      patterns.push('flash_loan');
      break;
    }
  }

  var computeUnits = this._extractComputeUnits(tx);
  if (computeUnits && computeUnits > 200000) {
    patterns.push('high_compute');
  }

  return patterns;
};

PumpFunFilter.prototype._hasBotPattern = function(tx) {
  var instructions = tx.transaction.message.instructions || [];
  var programIds = [];
  var uniquePrograms = {};

  for (var i = 0; i < instructions.length; i++) {
    programIds.push(instructions[i].programId);
    uniquePrograms[instructions[i].programId] = true;
  }

  var uniqueCount = Object.keys(uniquePrograms).length;
  if (instructions.length > 3 && uniqueCount === 1) {
    return true;
  }

  var logs = tx.meta.logMessages || [];
  var botKeywords = ['bot', 'automated', 'script', 'mev'];
  for (var j = 0; j < logs.length; j++) {
    var logLower = logs[j].toLowerCase();
    for (var k = 0; k < botKeywords.length; k++) {
      if (logLower.includes(botKeywords[k])) {
        return true;
      }
    }
  }

  return false;
};

PumpFunFilter.prototype._detectSandwichAttack = function(tx) {
  var instructions = tx.transaction.message.instructions || [];
  var swapCount = 0;

  for (var i = 0; i < instructions.length; i++) {
    if (instructions[i].programId === PROTOCOL.PROGRAM_ID) {
      swapCount++;
    }
  }

  if (swapCount >= 2) {
    var priorityFee = this._extractPriorityFee(tx);
    if (priorityFee && priorityFee > 0.001) {
      return true;
    }
  }

  return false;
};

PumpFunFilter.prototype._extractTransactionFee = function(tx) {
  if (!tx.meta || !tx.meta.fee) {
    return 0;
  }
  return tx.meta.fee / CONFIG.LAMPORTS_PER_SOL;
};

PumpFunFilter.prototype._extractPriorityFee = function(tx) {
  var logs = tx.meta.logMessages || [];

  for (var i = 0; i < logs.length; i++) {
    if (typeof logs[i] === 'string') {
      var match = logs[i].match(/priority.*?(\d+)/i);
      if (match) {
        return parseInt(match[1], 10) / CONFIG.LAMPORTS_PER_SOL;
      }
    }
  }

  return null;
};

PumpFunFilter.prototype._extractComputeUnits = function(tx) {
  if (tx.meta && tx.meta.computeUnitsConsumed) {
    return tx.meta.computeUnitsConsumed;
  }

  var logs = tx.meta.logMessages || [];
  for (var i = 0; i < logs.length; i++) {
    if (typeof logs[i] === 'string') {
      var match = logs[i].match(/compute.*?(\d+)/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }

  return null;
};

PumpFunFilter.prototype._extractAccountChanges = function(tx) {
  var changes = [];
  var accountKeys = tx.transaction.message.accountKeys || [];
  var preBalances = tx.meta.preBalances || [];
  var postBalances = tx.meta.postBalances || [];

  for (var i = 0; i < accountKeys.length; i++) {
    var preBalance = (preBalances[i] || 0) / CONFIG.LAMPORTS_PER_SOL;
    var postBalance = (postBalances[i] || 0) / CONFIG.LAMPORTS_PER_SOL;
    var change = postBalance - preBalance;

    if (Math.abs(change) > 0.0001) {
      var account = accountKeys[i];
      var accountStr = typeof account === 'string' 
        ? account 
        : (account.pubkey || (account.toBase58 ? account.toBase58() : 'unknown'));

      changes.push({
        account: accountStr,
        preBalance: this._formatAmount(preBalance),
        postBalance: this._formatAmount(postBalance),
        change: this._formatAmount(change)
      });
    }
  }

  return changes;
};

PumpFunFilter.prototype._extractRelatedTokens = function(tx) {
  var tokens = {};
  var preTokens = tx.meta.preTokenBalances || [];
  var postTokens = tx.meta.postTokenBalances || [];

  for (var i = 0; i < preTokens.length; i++) {
    if (preTokens[i].mint) {
      tokens[preTokens[i].mint] = true;
    }
  }

  for (var j = 0; j < postTokens.length; j++) {
    if (postTokens[j].mint) {
      tokens[postTokens[j].mint] = true;
    }
  }

  return Object.keys(tokens);
};

PumpFunFilter.prototype._extractBondingCurveAccount = function(tx) {
  var instructions = tx.transaction.message.instructions || [];

  for (var i = 0; i < instructions.length; i++) {
    var ix = instructions[i];
    if (ix.programId === PROTOCOL.PROGRAM_ID && ix.accounts && ix.accounts.length > 2) {
      var acc = ix.accounts[1];
      return typeof acc === 'string' ? acc : (acc.pubkey || (acc.toBase58 ? acc.toBase58() : null));
    }
  }

  return null;
};

PumpFunFilter.prototype._extractAssociatedTokenAccount = function(tx) {
  var postTokens = tx.meta.postTokenBalances || [];

  if (postTokens.length > 0 && postTokens[0].owner) {
    return postTokens[0].owner;
  }

  var instructions = tx.transaction.message.instructions || [];
  for (var i = 0; i < instructions.length; i++) {
    var ix = instructions[i];
    if (ix.programId === PROTOCOL.TOKEN_PROGRAM && ix.accounts && ix.accounts.length > 0) {
      var acc = ix.accounts[0];
      return typeof acc === 'string' ? acc : (acc.pubkey || (acc.toBase58 ? acc.toBase58() : null));
    }
  }

  return null;
};

PumpFunFilter.prototype._extractTokenMetadata = function(tx) {
  var logs = tx.meta.logMessages || [];
  var metadata = {};

  for (var i = 0; i < logs.length; i++) {
    if (typeof logs[i] === 'string') {
      if (logs[i].includes('name:') || logs[i].includes('symbol:')) {
        var nameMatch = logs[i].match(/name:\s*([^\s,]+)/i);
        var symbolMatch = logs[i].match(/symbol:\s*([^\s,]+)/i);

        if (nameMatch) {
          metadata.name = nameMatch[1];
        }
        if (symbolMatch) {
          metadata.symbol = symbolMatch[1];
        }
      }

      if (logs[i].includes('uri:') || logs[i].includes('metadata')) {
        var uriMatch = logs[i].match(/uri:\s*([^\s,]+)/i);
        if (uriMatch) {
          metadata.uri = uriMatch[1];
        }
      }
    }
  }

  return Object.keys(metadata).length > 0 ? metadata : null;
};

PumpFunFilter.prototype._enhanceTransactionDiscovery = function(tx) {
  return this._hasPumpFunToken(tx) || this._hasRelatedActivity(tx);
};

PumpFunFilter.prototype._hasPumpFunToken = function(tx) {
  // Simplified check - in production, maintain a registry
  return false;
};

PumpFunFilter.prototype._hasRelatedActivity = function(tx) {
  var instructions = tx.transaction.message.instructions || [];
  var dexPrograms = [
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
    '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP',
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
  ];

  var hasDexSwap = false;
  for (var i = 0; i < instructions.length; i++) {
    for (var j = 0; j < dexPrograms.length; j++) {
      if (instructions[i].programId === dexPrograms[j]) {
        hasDexSwap = true;
        break;
      }
    }
    if (hasDexSwap) {
      break;
    }
  }

  if (hasDexSwap) {
    var tokens = this._extractRelatedTokens(tx);
    return tokens.length > 0;
  }

  return false;
};

// Main entry point for QuickNode
function main(payload) {
  if (!payload || typeof payload !== 'object') {
    console.warn('Invalid payload format');
    return null;
  }

  var filter = new PumpFunFilter();
  return filter.processStream(payload);
}

