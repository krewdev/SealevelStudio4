// Arbitrage detection algorithms (2-pool and multi-hop pathfinding)

import { Connection, PublicKey } from '@solana/web3.js';
import {
  PoolData,
  ArbitrageOpportunity,
  ArbitragePath,
  ArbitrageStep,
  ArbitragePathType,
  TokenInfo,
  WSOL_MINT,
  SOL_DECIMALS,
  ScannerConfig,
} from './types';

// Gas estimate constants (in lamports)
const BASE_TRANSACTION_FEE = 5000; // Base fee per transaction
const SWAP_INSTRUCTION_FEE = 2000; // Additional fee per swap instruction
const WRAP_UNWRAP_FEE = 10000; // Fee for wrapping/unwrapping SOL
const PRIORITY_FEE_MULTIPLIER = 1.5; // Multiplier for priority fees (MEV protection)

export class ArbitrageDetector {
  private pools: PoolData[];
  private config: ScannerConfig;
  private connection: Connection;
  private birdeyeOptimizer?: any; // BirdeyeOptimizer instance

  constructor(pools: PoolData[], config: ScannerConfig, connection: Connection, birdeyeOptimizer?: any) {
    this.pools = pools;
    this.config = config;
    this.connection = connection;
    this.birdeyeOptimizer = birdeyeOptimizer;
  }

  async detectOpportunities(): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];

    // Filter out Jupiter pools - Jupiter is an aggregator, not a real pool
    // We only want direct DEX pools with actual reserves for arbitrage detection
    const realPools = this.pools.filter(p => 
      p.dex !== 'jupiter' && 
      p.reserves.tokenA > BigInt(0) && 
      p.reserves.tokenB > BigInt(0) &&
      p.poolAddress // Must have on-chain address
    );

    if (realPools.length === 0) {
      console.warn('No real pools with reserves found for arbitrage detection');
      return [];
    }

    // Use Birdeye optimizer for enhanced detection if available
    if (this.birdeyeOptimizer) {
      try {
        // Find opportunities using Birdeye's optimized price data
        const birdeyeOpportunities = await this.birdeyeOptimizer.findArbitrageOpportunities(
          realPools,
          this.config.minProfitPercent
        );
        
        // Convert Birdeye opportunities to standard format
        for (const opp of birdeyeOpportunities) {
          const opportunity = this.calculateSimpleArbitrage(opp.poolA, opp.poolB);
          if (opportunity) {
            opportunities.push(opportunity);
          }
        }
      } catch (error) {
        console.error('Error using Birdeye optimizer for arbitrage detection:', error);
      }
    }

    // Direct on-chain arbitrage detection methods (better than Jupiter API calls)
    // 1. Simple 2-pool arbitrage (same token pair, different DEXs)
    opportunities.push(...this.detectSimpleArbitrage(realPools));

    // 2. Multi-hop arbitrage (token cycles across pools)
    opportunities.push(...this.detectMultiHopArbitrage(realPools));

    // 3. Wrapping/unwrapping arbitrage (SOL <-> wSOL price differences)
    opportunities.push(...this.detectWrapUnwrapArbitrage(realPools));

    // 4. Cross-DEX arbitrage (same pair on different DEXs with price differences)
    opportunities.push(...this.detectCrossDEXArbitrage(realPools));

    // Remove duplicates and filter by minimum thresholds (unless showUnprofitable is true)
    const uniqueOpportunities = this.deduplicateOpportunities(opportunities);
    
    return uniqueOpportunities
      .filter(opp => {
        if (this.config.showUnprofitable) return true;
        return opp.netProfit >= this.config.minProfitThreshold &&
               opp.profitPercent >= this.config.minProfitPercent;
      })
      .sort((a, b) => b.netProfit - a.netProfit); // Sort by profit descending
  }

  private deduplicateOpportunities(opportunities: ArbitrageOpportunity[]): ArbitrageOpportunity[] {
    const seen = new Set<string>();
    return opportunities.filter(opp => {
      // Validate path.steps exists and has elements
      if (!opp.path?.steps || opp.path.steps.length === 0) {
        return false; // Skip opportunities with invalid paths
      }
      const key = `${opp.path.steps[0]?.pool.id}-${opp.path.steps[opp.path.steps.length - 1]?.pool.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private detectSimpleArbitrage(pools: PoolData[] = this.pools): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // Group pools by token pair (only real pools with reserves)
    const poolsByPair = new Map<string, PoolData[]>();
    
    for (const pool of pools) {
      // Skip pools without valid reserves or addresses
      if (!pool.poolAddress || pool.reserves.tokenA === BigInt(0) || pool.reserves.tokenB === BigInt(0)) {
        continue;
      }
      
      const pairKey = this.getPairKey(pool.tokenA.mint, pool.tokenB.mint);
      if (!poolsByPair.has(pairKey)) {
        poolsByPair.set(pairKey, []);
      }
      poolsByPair.get(pairKey)!.push(pool);
    }

    // Find price differences for same token pairs across different DEXs
    for (const [pairKey, pairPools] of Array.from(poolsByPair.entries())) {
      if (pairPools.length < 2) continue;

      // Compare all pairs of pools (prefer different DEXs for better arbitrage)
      for (let i = 0; i < pairPools.length; i++) {
        for (let j = i + 1; j < pairPools.length; j++) {
          const poolA = pairPools[i];
          const poolB = pairPools[j];

          // Prefer cross-DEX arbitrage (different DEXs = better opportunity)
          if (poolA.dex === poolB.dex && pairPools.length > 2) {
            // Skip same-DEX pairs if we have cross-DEX options
            continue;
          }

          // Calculate actual price from reserves (more accurate than stored price)
          const priceA = this.calculatePriceFromReserves(poolA);
          const priceB = this.calculatePriceFromReserves(poolB);

          // Check if prices differ significantly
          const priceDiff = Math.abs(priceA - priceB);
          const avgPrice = (priceA + priceB) / 2;
          const priceDiffPercent = avgPrice > 0 ? (priceDiff / avgPrice) * 100 : 0;

          if (this.config.showUnprofitable || priceDiffPercent > this.config.minProfitPercent) {
            // Determine which direction is profitable
            const opportunity = this.calculateSimpleArbitrage(poolA, poolB);
            if (opportunity) {
              opportunities.push(opportunity);
            }
          }
        }
      }
    }

    return opportunities;
  }

  /**
   * Calculate price directly from on-chain reserves (more accurate)
   */
  private calculatePriceFromReserves(pool: PoolData): number {
    if (pool.reserves.tokenB === BigInt(0)) return 0;
    
    const adjustedA = Number(pool.reserves.tokenA) / Math.pow(10, pool.tokenA.decimals);
    const adjustedB = Number(pool.reserves.tokenB) / Math.pow(10, pool.tokenB.decimals);
    
    return adjustedB / adjustedA;
  }

  private detectMultiHopArbitrage(pools: PoolData[] = this.pools): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const maxHops = this.config.maxHops;

    // Filter to only real pools with reserves
    const realPools = pools.filter(p => 
      p.poolAddress && 
      p.reserves.tokenA > BigInt(0) && 
      p.reserves.tokenB > BigInt(0)
    );

    // Build graph of token connections (only real pools)
    const graph = this.buildTokenGraph(realPools);

    // Find cycles starting from each token
    // Focus on high-liquidity tokens first for better opportunities
    const tokens = Array.from(graph.keys())
      .slice(0, 30) // Limit to first 30 tokens for performance
    
    for (const startToken of tokens) {
      const cycles = this.findProfitableCycles(startToken, graph, maxHops);
      opportunities.push(...cycles);
    }

    return opportunities;
  }

  private detectWrapUnwrapArbitrage(pools: PoolData[] = this.pools): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // Find pools involving SOL and wSOL (only real pools)
    const solPools = pools.filter(
      p => (p.tokenA.mint === WSOL_MINT || p.tokenB.mint === WSOL_MINT) &&
           p.poolAddress &&
           p.reserves.tokenA > BigInt(0) &&
           p.reserves.tokenB > BigInt(0)
    );

    // Check if wrapping/unwrapping creates arbitrage
    // SOL and wSOL should be 1:1, but sometimes pools have slight price differences
    for (let i = 0; i < solPools.length; i++) {
      for (let j = i + 1; j < solPools.length; j++) {
        const poolA = solPools[i];
        const poolB = solPools[j];

        if (poolA.id === poolB.id) continue;

        // Check SOL -> wSOL -> Token -> wSOL -> SOL path
        const opportunity = this.calculateWrapUnwrapArbitrage(poolA, poolB);
        if (opportunity) {
          opportunities.push(opportunity);
        }
      }
    }

    return opportunities;
  }

  /**
   * Detect cross-DEX arbitrage opportunities (same token pair on different DEXs)
   * This is more efficient than Jupiter API calls
   */
  private detectCrossDEXArbitrage(pools: PoolData[] = this.pools): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];

    // Group by token pair and DEX
    const poolsByPairAndDEX = new Map<string, Map<string, PoolData[]>>();
    
    for (const pool of pools) {
      if (!pool.poolAddress || pool.reserves.tokenA === BigInt(0) || pool.reserves.tokenB === BigInt(0)) {
        continue;
      }

      const pairKey = this.getPairKey(pool.tokenA.mint, pool.tokenB.mint);
      
      if (!poolsByPairAndDEX.has(pairKey)) {
        poolsByPairAndDEX.set(pairKey, new Map());
      }
      
      const dexMap = poolsByPairAndDEX.get(pairKey)!;
      if (!dexMap.has(pool.dex)) {
        dexMap.set(pool.dex, []);
      }
      
      dexMap.get(pool.dex)!.push(pool);
    }

    // Find opportunities across different DEXs
    for (const [pairKey, dexMap] of Array.from(poolsByPairAndDEX.entries())) {
      const dexes = Array.from(dexMap.keys());
      
      // Need at least 2 different DEXs for cross-DEX arbitrage
      if (dexes.length < 2) continue;

      // Compare pools across different DEXs
      for (let i = 0; i < dexes.length; i++) {
        for (let j = i + 1; j < dexes.length; j++) {
          const poolsA = dexMap.get(dexes[i])!;
          const poolsB = dexMap.get(dexes[j])!;

          // Compare best pools from each DEX
          for (const poolA of poolsA) {
            for (const poolB of poolsB) {
              const priceA = this.calculatePriceFromReserves(poolA);
              const priceB = this.calculatePriceFromReserves(poolB);
              
              const priceDiff = Math.abs(priceA - priceB);
              const avgPrice = (priceA + priceB) / 2;
              const priceDiffPercent = avgPrice > 0 ? (priceDiff / avgPrice) * 100 : 0;

              if (this.config.showUnprofitable || priceDiffPercent > this.config.minProfitPercent) {
                const opportunity = this.calculateSimpleArbitrage(poolA, poolB);
                if (opportunity) {
                  opportunity.type = 'cross_protocol';
                  opportunities.push(opportunity);
                }
              }
            }
          }
        }
      }
    }

    return opportunities;
  }

  private calculateSimpleArbitrage(
    poolA: PoolData,
    poolB: PoolData
  ): ArbitrageOpportunity | null {
    const pairA = new Set([poolA.tokenA.mint, poolA.tokenB.mint]);
    const pairB = new Set([poolB.tokenA.mint, poolB.tokenB.mint]);
    if (![...pairA].every((m) => pairB.has(m))) return null;

    const baseMint =
      pairA.has(WSOL_MINT) ? WSOL_MINT : poolA.tokenA.mint;
    const quoteMint =
      poolA.tokenA.mint === baseMint ? poolA.tokenB.mint : poolA.tokenA.mint;

    const priceA = this.priceOf(poolA, baseMint, quoteMint);
    const priceB = this.priceOf(poolB, baseMint, quoteMint);
    if (priceA <= 0 || priceB <= 0) return null;

    const buyPool = priceA < priceB ? poolA : poolB;
    const sellPool = priceA < priceB ? poolB : poolA;

    const quoteInfo = this.tokenOnPool(buyPool, quoteMint);
    const baseInfo = this.tokenOnPool(buyPool, baseMint);
    if (!quoteInfo || !baseInfo) return null;

    const inputAmount = this.optimalQuoteInput(buyPool, sellPool, quoteMint, baseMint);
    const baseOut = this.swapPool(buyPool, quoteMint, baseMint, inputAmount);
    const quoteOut = this.swapPool(sellPool, baseMint, quoteMint, baseOut);
    if (baseOut <= BigInt(0) || quoteOut <= BigInt(0)) return null;

    const profitRaw = quoteOut - inputAmount;
    const scale = Math.pow(10, quoteInfo.decimals);
    const profit = Number(profitRaw) / scale;
    const profitPercent = Number(inputAmount) > 0 ? (Number(profitRaw) / Number(inputAmount)) * 100 : 0;

    const baseGas = 15_000 + 200_000; // 2 swaps + ATAs (lamports-ish CU proxy)
    const priorityFee = 50_000;
    const gasEstimate = baseGas + priorityFee;
    const gasSol = quoteMint === WSOL_MINT ? gasEstimate / 1e9 : 0;
    const netProfit = profit - gasSol;

    if (!this.config.showUnprofitable && netProfit <= 0) {
      return null;
    }

    const warnings: string[] = [];
    let confidence = this.calculateConfidence(profitPercent, 2);
    if (this.isSyntheticClmm(buyPool) || this.isSyntheticClmm(sellPool)) {
      confidence = Math.min(confidence, 0.35);
      warnings.push('Orca Whirlpool reserves are synthetic (TVL/price), not tick liquidity — treat as a lead only.');
    }
    if (buyPool.dex === sellPool.dex) {
      confidence = Math.min(confidence, 0.55);
      warnings.push('Same-DEX pair; cross-venue edge may be an artifact.');
    }
    warnings.push('PnL is a constant-product heuristic on snapshot data, not a simulated fill.');

    const steps: ArbitrageStep[] = [
      {
        pool: buyPool,
        dex: buyPool.dex,
        tokenIn: quoteInfo,
        tokenOut: baseInfo,
        amountIn: inputAmount,
        amountOut: baseOut,
        price: this.priceOf(buyPool, baseMint, quoteMint),
        fee: buyPool.fee,
      },
      {
        pool: sellPool,
        dex: sellPool.dex,
        tokenIn: baseInfo,
        tokenOut: this.tokenOnPool(sellPool, quoteMint) || quoteInfo,
        amountIn: baseOut,
        amountOut: quoteOut,
        price: this.priceOf(sellPool, baseMint, quoteMint),
        fee: sellPool.fee,
      },
    ];

    const path: ArbitragePath = {
      type: 'simple',
      steps,
      startToken: quoteInfo,
      endToken: quoteInfo,
      totalHops: 2,
    };

    return {
      id: `arb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      path,
      type: 'simple',
      profit,
      profitPercent,
      inputAmount,
      outputAmount: quoteOut,
      gasEstimate,
      netProfit,
      confidence,
      steps,
      timestamp: new Date(),
      accuracy: 'heuristic',
      profitTokenSymbol: quoteInfo.symbol,
      warnings,
    };
  }

  private calculateMultiHopArbitrage(
    path: PoolData[],
    startToken: TokenInfo
  ): ArbitrageOpportunity | null {
    if (path.length < 2) return null;

    const inputAmount = BigInt(1_000_000_000); // 1 SOL worth
    let currentAmount = inputAmount;
    const steps: ArbitrageStep[] = [];

    // Execute swaps along the path
    for (let i = 0; i < path.length; i++) {
      const pool = path[i];
      const isFirst = i === 0;
      const prevStep = steps[steps.length - 1];

      const tokenIn = isFirst ? startToken : prevStep.tokenOut;
      const tokenOut = pool.tokenA.mint === tokenIn.mint ? pool.tokenB : pool.tokenA;

      const reservesIn = pool.tokenA.mint === tokenIn.mint 
        ? pool.reserves.tokenA 
        : pool.reserves.tokenB;
      const reservesOut = pool.tokenA.mint === tokenIn.mint 
        ? pool.reserves.tokenB 
        : pool.reserves.tokenA;

      const amountOut = this.calculateSwapOutput(
        currentAmount,
        reservesIn,
        reservesOut,
        tokenIn.decimals,
        tokenOut.decimals,
        pool.fee
      );

      steps.push({
        pool,
        dex: pool.dex,
        tokenIn,
        tokenOut,
        amountIn: currentAmount,
        amountOut,
        price: pool.price,
        fee: pool.fee,
      });

      currentAmount = amountOut;
    }

    // Check if we end up with more than we started
    const profit = Number(currentAmount - inputAmount) / 1e9;
    const profitPercent = (profit / Number(inputAmount) * 1e9) * 100;
    const gasEstimate = BASE_TRANSACTION_FEE + (SWAP_INSTRUCTION_FEE * path.length);
    const netProfit = profit - gasEstimate / 1e9;

    if (!this.config.showUnprofitable && netProfit <= 0) {
      return null;
    }

    const arbitragePath: ArbitragePath = {
      type: path.length > 3 ? 'cross-protocol' : 'multi_hop' as ArbitragePathType,
      steps,
      startToken,
      endToken: startToken,
      totalHops: path.length,
    };

    return {
      id: `arb-mh-${Date.now()}-${Math.random()}`,
      path: arbitragePath,
      type: path.length > 3 ? 'cross_protocol' : 'multi_hop',
      profit,
      profitPercent,
      inputAmount,
      outputAmount: currentAmount,
      gasEstimate,
      netProfit,
      confidence: this.calculateConfidence(profitPercent, path.length),
      steps,
      timestamp: new Date(),
      accuracy: 'heuristic',
      profitTokenSymbol: startToken.symbol,
      warnings: ['Multi-hop PnL is a constant-product heuristic on snapshot reserves.'],
    };
  }

  private calculateWrapUnwrapArbitrage(
    solPool: PoolData,
    wsolPool: PoolData
  ): ArbitrageOpportunity | null {
    // Simplified - would need more complex logic for actual wrap/unwrap arbitrage
    // This is a placeholder for the concept
    return null;
  }

  /**
   * Calculate optimal input amount for maximum profit
   * Uses calculus to find the maximum profit point
   */
  private calculateOptimalInputAmount(poolA: PoolData, poolB: PoolData): bigint {
    // Simplified optimization: try different amounts and find maximum
    // In production, use calculus or binary search for optimal amount
    const testAmounts = [
      BigInt(100_000_000),      // 0.1 SOL
      BigInt(500_000_000),      // 0.5 SOL
      BigInt(1_000_000_000),    // 1 SOL
      BigInt(5_000_000_000),     // 5 SOL
      BigInt(10_000_000_000),   // 10 SOL
    ];

    let maxProfit = BigInt(0);
    let optimalAmount = BigInt(1_000_000_000); // Default to 1 SOL

    for (const amount of testAmounts) {
      const output1 = this.calculateSwapOutput(
        amount,
        poolA.reserves.tokenA,
        poolA.reserves.tokenB,
        poolA.tokenA.decimals,
        poolA.tokenB.decimals,
        poolA.fee
      );
      const output2 = this.calculateSwapOutput(
        output1,
        poolB.reserves.tokenB,
        poolB.reserves.tokenA,
        poolB.tokenB.decimals,
        poolB.tokenA.decimals,
        poolB.fee
      );
      const profit = output2 - amount;

      if (profit > maxProfit) {
        maxProfit = profit;
        optimalAmount = amount;
      }
    }

    return optimalAmount;
  }

  /**
   * Calculate swap output with slippage modeling
   * Accounts for price impact and realistic execution
   */
  private calculateSwapOutputWithSlippage(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    decimalsIn: number,
    decimalsOut: number,
    fee: number
  ): bigint {
    // Base calculation
    const baseOutput = this.calculateSwapOutput(
      amountIn,
      reserveIn,
      reserveOut,
      decimalsIn,
      decimalsOut,
      fee
    );

    // Apply slippage model (price impact increases with trade size)
    const reserveRatio = Number(reserveIn) / Number(reserveOut);
    const tradeSizeRatio = Number(amountIn) / Number(reserveIn);
    
    // Slippage increases quadratically with trade size
    const slippageMultiplier = 1 - (tradeSizeRatio * tradeSizeRatio * 0.1); // Max 10% slippage
    const adjustedOutput = BigInt(Math.floor(Number(baseOutput) * slippageMultiplier));

    return adjustedOutput;
  }

  private calculateSwapOutput(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    decimalsIn: number,
    decimalsOut: number,
    feeBps: number
  ): bigint {
    if (reserveIn === BigInt(0) || reserveOut === BigInt(0)) {
      return BigInt(0);
    }

    // Constant product formula: (x + dx) * (y - dy) = x * y
    // With fee: amountInWithFee = amountIn * (10000 - feeBps) / 10000
    const amountInWithFee = (amountIn * BigInt(10000 - feeBps)) / BigInt(10000);
    
    // Adjust for decimals
    const adjustedReserveIn = reserveIn;
    const adjustedReserveOut = reserveOut;
    
    // Calculate output: dy = (y * dx) / (x + dx)
    const numerator = adjustedReserveOut * amountInWithFee;
    const denominator = adjustedReserveIn + amountInWithFee;
    
    return numerator / denominator;
  }

  private buildTokenGraph(pools: PoolData[] = this.pools): Map<string, Map<string, PoolData[]>> {
    const graph = new Map<string, Map<string, PoolData[]>>();

    // Only include real pools with reserves
    for (const pool of pools) {
      if (!pool.poolAddress || pool.reserves.tokenA === BigInt(0) || pool.reserves.tokenB === BigInt(0)) {
        continue;
      }

      const tokenA = pool.tokenA.mint;
      const tokenB = pool.tokenB.mint;

      if (!graph.has(tokenA)) {
        graph.set(tokenA, new Map());
      }
      if (!graph.has(tokenB)) {
        graph.set(tokenB, new Map());
      }

      const connectionsA = graph.get(tokenA)!;
      if (!connectionsA.has(tokenB)) {
        connectionsA.set(tokenB, []);
      }
      connectionsA.get(tokenB)!.push(pool);

      const connectionsB = graph.get(tokenB)!;
      if (!connectionsB.has(tokenA)) {
        connectionsB.set(tokenA, []);
      }
      connectionsB.get(tokenA)!.push(pool);
    }

    return graph;
  }

  private findProfitableCycles(
    startToken: string,
    graph: Map<string, Map<string, PoolData[]>>,
    maxHops: number
  ): ArbitrageOpportunity[] {
    const opportunities: ArbitrageOpportunity[] = [];
    const visited = new Set<string>();
    const path: PoolData[] = [];

    const dfs = (currentToken: string, targetToken: string, hops: number) => {
      if (hops > maxHops) return;
      if (hops > 0 && currentToken === targetToken) {
        // Found a cycle
        const tokenInfo = this.getTokenInfo(startToken);
        if (tokenInfo) {
          const opportunity = this.calculateMultiHopArbitrage([...path], tokenInfo);
          if (opportunity) {
            opportunities.push(opportunity);
          }
        }
        return;
      }

      if (visited.has(currentToken)) return;
      visited.add(currentToken);

      const connections = graph.get(currentToken);
      if (connections) {
        for (const [nextToken, pools] of Array.from(connections.entries())) {
          for (const pool of pools) {
            path.push(pool);
            dfs(nextToken, targetToken, hops + 1);
            path.pop();
          }
        }
      }

      visited.delete(currentToken);
    };

    dfs(startToken, startToken, 0);
    return opportunities;
  }

  private getPairKey(mintA: string, mintB: string): string {
    return [mintA, mintB].sort().join('-');
  }

  private isSyntheticClmm(pool: PoolData): boolean {
    return (
      pool.dex === 'orca' ||
      pool.programId === 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc'
    );
  }

  private tokenOnPool(pool: PoolData, mint: string): TokenInfo | null {
    if (pool.tokenA.mint === mint) return pool.tokenA;
    if (pool.tokenB.mint === mint) return pool.tokenB;
    return null;
  }

  private priceOf(pool: PoolData, baseMint: string, quoteMint: string): number {
    const base = this.tokenOnPool(pool, baseMint);
    const quote = this.tokenOnPool(pool, quoteMint);
    if (!base || !quote) return 0;
    const baseRes = Number(pool.tokenA.mint === baseMint ? pool.reserves.tokenA : pool.reserves.tokenB);
    const quoteRes = Number(pool.tokenA.mint === quoteMint ? pool.reserves.tokenA : pool.reserves.tokenB);
    const baseUi = baseRes / Math.pow(10, base.decimals);
    const quoteUi = quoteRes / Math.pow(10, quote.decimals);
    if (baseUi <= 0) return 0;
    return quoteUi / baseUi;
  }

  private swapPool(pool: PoolData, tokenInMint: string, tokenOutMint: string, amountIn: bigint): bigint {
    const tokenIn = this.tokenOnPool(pool, tokenInMint);
    const tokenOut = this.tokenOnPool(pool, tokenOutMint);
    if (!tokenIn || !tokenOut || amountIn <= BigInt(0)) return BigInt(0);
    const reserveIn = pool.tokenA.mint === tokenInMint ? pool.reserves.tokenA : pool.reserves.tokenB;
    const reserveOut = pool.tokenA.mint === tokenOutMint ? pool.reserves.tokenA : pool.reserves.tokenB;
    return this.calculateSwapOutputWithSlippage(
      amountIn,
      reserveIn,
      reserveOut,
      tokenIn.decimals,
      tokenOut.decimals,
      pool.fee
    );
  }

  private optimalQuoteInput(
    buyPool: PoolData,
    sellPool: PoolData,
    quoteMint: string,
    baseMint: string
  ): bigint {
    const quoteInfo = this.tokenOnPool(buyPool, quoteMint);
    const decimals = quoteInfo?.decimals ?? 9;
    const unit = BigInt(Math.pow(10, Math.min(decimals, 9)));
    const testAmounts = [
      unit / BigInt(100),
      unit / BigInt(10),
      unit / BigInt(2),
      unit,
      unit * BigInt(2),
      unit * BigInt(5),
    ].filter((a) => a > BigInt(0));

    let best = unit;
    let bestProfit = BigInt(Number.MIN_SAFE_INTEGER);
    for (const amount of testAmounts) {
      const mid = this.swapPool(buyPool, quoteMint, baseMint, amount);
      const out = this.swapPool(sellPool, baseMint, quoteMint, mid);
      const profit = out - amount;
      if (profit > bestProfit) {
        bestProfit = profit;
        best = amount;
      }
    }
    return best;
  }

  private getTokenInfo(mint: string): TokenInfo | null {
    for (const pool of this.pools) {
      if (pool.tokenA.mint === mint) return pool.tokenA;
      if (pool.tokenB.mint === mint) return pool.tokenB;
    }
    return null;
  }

  private calculateConfidence(profitPercent: number, hops: number): number {
    // Returns confidence as a number between 0 and 1
    // Higher profit and fewer hops = higher confidence
    let confidence = 0.5; // Base confidence
    
    // Adjust based on profit percentage
    if (profitPercent > 1) confidence += 0.3;
    else if (profitPercent > 0.5) confidence += 0.2;
    else if (profitPercent > 0.1) confidence += 0.1;
    
    // Adjust based on number of hops (fewer hops = higher confidence)
    if (hops <= 2) confidence += 0.2;
    else if (hops <= 3) confidence += 0.1;
    else confidence -= 0.1;
    
    // Clamp between 0 and 1
    return Math.max(0, Math.min(1, confidence));
  }
}

