// Advanced Pathfinding with Modified Dijkstra Algorithm
// Based on Part 1.2 of the technical analysis document
// Handles dynamic slippage and fee constraints

import { PoolData, TokenInfo, ArbitragePath, ArbitrageStep } from '../pools/types';

export interface PathfindingConfig {
  maxHops: number;
  minProfitPercent: number;
  maxSlippage: number; // Maximum acceptable slippage (0-1)
  considerFees: boolean;
  considerSlippage: boolean;
}

export interface PathfindingResult {
  path: ArbitragePath;
  estimatedProfit: number;
  profitPercent: number;
  confidence: number;
  optimalInputAmount: bigint;
  steps: ArbitrageStep[];
}

/**
 * Modified Dijkstra Algorithm for Arbitrage Pathfinding
 * 
 * Key differences from standard Dijkstra:
 * 1. Edge weights (prices) are dynamic functions of trade size (slippage)
 * 2. Must find cycles (start and end at same token)
 * 3. Must account for protocol fees
 * 4. Optimizes for profit, not just path length
 */
export class ArbitragePathfinder {
  private pools: PoolData[];
  private config: PathfindingConfig;

  constructor(pools: PoolData[], config: PathfindingConfig) {
    this.pools = pools;
    this.config = config;
  }

  /**
   * Find profitable arbitrage cycles using modified Dijkstra
   * Returns paths sorted by estimated profit
   */
  findProfitablePaths(startToken: TokenInfo): PathfindingResult[] {
    const results: PathfindingResult[] = [];
    
    // Build token graph
    const graph = this.buildTokenGraph();
    
    // Find cycles starting from startToken
    const cycles = this.findCycles(startToken.mint, graph, this.config.maxHops);
    
    // Evaluate each cycle for profitability
    for (const cycle of cycles) {
      const result = this.evaluateCycle(cycle, startToken);
      if (result && result.profitPercent >= this.config.minProfitPercent) {
        results.push(result);
      }
    }
    
    // Sort by profit descending
    return results.sort((a, b) => b.estimatedProfit - a.estimatedProfit);
  }

  /**
   * Build token connection graph
   * Nodes = tokens, Edges = pools
   */
  private buildTokenGraph(): Map<string, Map<string, PoolData[]>> {
    const graph = new Map<string, Map<string, PoolData[]>>();

    for (const pool of this.pools) {
      if (pool.reserves.tokenA === BigInt(0) || pool.reserves.tokenB === BigInt(0)) {
        continue;
      }

      const tokenA = pool.tokenA.mint;
      const tokenB = pool.tokenB.mint;

      // Add edge A -> B
      if (!graph.has(tokenA)) {
        graph.set(tokenA, new Map());
      }
      const connectionsA = graph.get(tokenA)!;
      if (!connectionsA.has(tokenB)) {
        connectionsA.set(tokenB, []);
      }
      connectionsA.get(tokenB)!.push(pool);

      // Add edge B -> A (bidirectional)
      if (!graph.has(tokenB)) {
        graph.set(tokenB, new Map());
      }
      const connectionsB = graph.get(tokenB)!;
      if (!connectionsB.has(tokenA)) {
        connectionsB.set(tokenA, []);
      }
      connectionsB.get(tokenA)!.push(pool);
    }

    return graph;
  }

  /**
   * Find cycles using DFS with cycle detection
   */
  private findCycles(
    startToken: string,
    graph: Map<string, Map<string, PoolData[]>>,
    maxHops: number
  ): PoolData[][] {
    const cycles: PoolData[][] = [];
    const visited = new Set<string>();
    const path: PoolData[] = [];

    const dfs = (currentToken: string, targetToken: string, hops: number) => {
      if (hops > maxHops) return;
      
      // Found a cycle
      if (hops > 0 && currentToken === targetToken) {
        cycles.push([...path]);
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
    return cycles;
  }

  /**
   * Evaluate a cycle for profitability
   * Uses dynamic slippage modeling and optimal input calculation
   */
  private evaluateCycle(
    cycle: PoolData[],
    startToken: TokenInfo
  ): PathfindingResult | null {
    if (cycle.length < 2) return null;

    // Find optimal input amount that maximizes profit
    const optimalInput = this.findOptimalInputAmount(cycle, startToken);
    
    // Simulate the cycle with optimal input
    let currentAmount = optimalInput;
    const steps: ArbitrageStep[] = [];
    let previousToken = startToken;

    for (let i = 0; i < cycle.length; i++) {
      const pool = cycle[i];
      
      // Determine input/output tokens
      const tokenIn = previousToken;
      const tokenOut = pool.tokenA.mint === tokenIn.mint 
        ? pool.tokenB 
        : pool.tokenA;

      // Calculate swap output with dynamic slippage
      const reservesIn = pool.tokenA.mint === tokenIn.mint
        ? pool.reserves.tokenA
        : pool.reserves.tokenB;
      const reservesOut = pool.tokenA.mint === tokenIn.mint
        ? pool.reserves.tokenB
        : pool.reserves.tokenA;

      const amountOut = this.calculateSwapWithSlippage(
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
      previousToken = tokenOut;
    }

    // Calculate profit
    const profit = Number(currentAmount - optimalInput) / Math.pow(10, startToken.decimals);
    const profitPercent = (profit / (Number(optimalInput) / Math.pow(10, startToken.decimals))) * 100;

    if (profit <= 0) return null;

    // Build path
    const path: ArbitragePath = {
      type: cycle.length > 3 ? 'cross-protocol' : 'multi_hop',
      steps,
      startToken,
      endToken: startToken,
      totalHops: cycle.length,
    };

    return {
      path,
      estimatedProfit: profit,
      profitPercent,
      confidence: this.calculateConfidence(profitPercent, cycle.length),
      optimalInputAmount: optimalInput,
      steps,
    };
  }

  /**
   * Find optimal input amount that maximizes profit
   * Uses binary search or calculus-based optimization
   */
  private findOptimalInputAmount(
    cycle: PoolData[],
    startToken: TokenInfo
  ): bigint {
    // Test different input amounts
    const testAmounts = [
      BigInt(100_000_000),      // 0.1 SOL
      BigInt(500_000_000),      // 0.5 SOL
      BigInt(1_000_000_000),    // 1 SOL
      BigInt(5_000_000_000),    // 5 SOL
      BigInt(10_000_000_000),   // 10 SOL
      BigInt(50_000_000_000),   // 50 SOL
    ].map(amount => amount * BigInt(Math.pow(10, startToken.decimals - 9))); // Adjust for token decimals

    let maxProfit = BigInt(0);
    let optimalAmount = testAmounts[2]; // Default to 1 SOL equivalent

    for (const inputAmount of testAmounts) {
      const profit = this.simulateCycle(cycle, startToken, inputAmount);
      if (profit > maxProfit) {
        maxProfit = profit;
        optimalAmount = inputAmount;
      }
    }

    return optimalAmount;
  }

  /**
   * Simulate a cycle with given input amount
   * Returns final amount (profit = final - input)
   */
  private simulateCycle(
    cycle: PoolData[],
    startToken: TokenInfo,
    inputAmount: bigint
  ): bigint {
    let currentAmount = inputAmount;
    let previousToken = startToken;

    for (const pool of cycle) {
      const tokenIn = previousToken;
      const tokenOut = pool.tokenA.mint === tokenIn.mint 
        ? pool.tokenB 
        : pool.tokenA;

      const reservesIn = pool.tokenA.mint === tokenIn.mint
        ? pool.reserves.tokenA
        : pool.reserves.tokenB;
      const reservesOut = pool.tokenA.mint === tokenIn.mint
        ? pool.reserves.tokenB
        : pool.reserves.tokenA;

      currentAmount = this.calculateSwapWithSlippage(
        currentAmount,
        reservesIn,
        reservesOut,
        tokenIn.decimals,
        tokenOut.decimals,
        pool.fee
      );

      previousToken = tokenOut;
    }

    return currentAmount;
  }

  /**
   * Calculate swap output with dynamic slippage modeling
   * Accounts for price impact based on trade size
   */
  private calculateSwapWithSlippage(
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

    // Constant product formula with fee
    const amountInWithFee = (amountIn * BigInt(10000 - feeBps)) / BigInt(10000);
    const numerator = reserveOut * amountInWithFee;
    const denominator = reserveIn + amountInWithFee;
    const baseOutput = numerator / denominator;

    // Apply slippage model if enabled
    if (this.config.considerSlippage) {
      const tradeSizeRatio = Number(amountIn) / Number(reserveIn);
      // Slippage increases quadratically with trade size
      const slippageMultiplier = 1 - (tradeSizeRatio * tradeSizeRatio * 0.1);
      return BigInt(Math.floor(Number(baseOutput) * slippageMultiplier));
    }

    return baseOutput;
  }

  /**
   * Calculate confidence score for a path
   */
  private calculateConfidence(profitPercent: number, hops: number): number {
    let confidence = 0.5; // Base confidence

    // Higher profit = higher confidence
    if (profitPercent > 1) confidence += 0.3;
    else if (profitPercent > 0.5) confidence += 0.2;
    else if (profitPercent > 0.1) confidence += 0.1;

    // Fewer hops = higher confidence
    if (hops <= 2) confidence += 0.2;
    else if (hops <= 3) confidence += 0.1;
    else confidence -= 0.1;

    return Math.max(0, Math.min(1, confidence));
  }
}

