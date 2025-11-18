// Graph-based arbitrage opportunity detection
// Models entire DeFi ecosystem as a graph to find multi-hop opportunities

import { Connection } from '@solana/web3.js';
import { PoolData, ArbitragePath, ArbitrageStep, TokenInfo, ArbitrageOpportunity } from './types';

interface GraphNode {
  token: TokenInfo;
  pools: PoolData[];
}

interface GraphEdge {
  pool: PoolData;
  tokenIn: TokenInfo;
  tokenOut: TokenInfo;
  price: number;
  fee: number;
}

interface GraphOpportunity {
  path: ArbitragePath;
  profit: number;
  profitPercent: number;
  confidence: number;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedExecutionTime: number; // seconds
}

export class GraphArbitrageDetector {
  private pools: PoolData[];
  private connection: Connection;
  private graph: Map<string, GraphNode>; // token mint -> node
  private edges: Map<string, GraphEdge[]>; // token mint -> outgoing edges

  constructor(pools: PoolData[], connection: Connection) {
    this.pools = pools;
    this.connection = connection;
    this.graph = new Map();
    this.edges = new Map();
    this.buildGraph();
  }

  /**
   * Build graph representation of DeFi ecosystem
   */
  private buildGraph(): void {
    // Clear existing graph
    this.graph.clear();
    this.edges.clear();

    // Build nodes (tokens) and edges (pools)
    for (const pool of this.pools) {
      // Add token A node
      if (!this.graph.has(pool.tokenA.mint)) {
        this.graph.set(pool.tokenA.mint, {
          token: pool.tokenA,
          pools: [],
        });
      }
      this.graph.get(pool.tokenA.mint)!.pools.push(pool);

      // Add token B node
      if (!this.graph.has(pool.tokenB.mint)) {
        this.graph.set(pool.tokenB.mint, {
          token: pool.tokenB,
          pools: [],
        });
      }
      this.graph.get(pool.tokenB.mint)!.pools.push(pool);

      // Add edges (bidirectional)
      const edgeAtoB: GraphEdge = {
        pool,
        tokenIn: pool.tokenA,
        tokenOut: pool.tokenB,
        price: pool.price,
        fee: pool.fee,
      };

      const edgeBtoA: GraphEdge = {
        pool,
        tokenIn: pool.tokenB,
        tokenOut: pool.tokenA,
        price: 1 / pool.price,
        fee: pool.fee,
      };

      if (!this.edges.has(pool.tokenA.mint)) {
        this.edges.set(pool.tokenA.mint, []);
      }
      this.edges.get(pool.tokenA.mint)!.push(edgeAtoB);

      if (!this.edges.has(pool.tokenB.mint)) {
        this.edges.set(pool.tokenB.mint, []);
      }
      this.edges.get(pool.tokenB.mint)!.push(edgeBtoA);
    }
  }

  /**
   * Find arbitrage opportunities using graph algorithms
   * Uses modified Bellman-Ford to find negative cycles (profitable loops)
   */
  async findGraphOpportunities(
    startToken: string,
    maxHops: number = 5,
    minProfitPercent: number = 0.1
  ): Promise<GraphOpportunity[]> {
    const opportunities: GraphOpportunity[] = [];

    // Find cycles starting from startToken
    const cycles = this.findCycles(startToken, maxHops);

    for (const cycle of cycles) {
      const opportunity = this.evaluateCycle(cycle, startToken);
      if (opportunity && opportunity.profitPercent >= minProfitPercent) {
        opportunities.push(opportunity);
      }
    }

    // Sort by profit
    return opportunities.sort((a, b) => b.profit - a.profit);
  }

  /**
   * Find cycles in the graph using DFS
   */
  private findCycles(startToken: string, maxHops: number): Array<GraphEdge[]> {
    const cycles: Array<GraphEdge[]> = [];
    const visited = new Set<string>();
    const path: GraphEdge[] = [];

    const dfs = (currentToken: string, targetToken: string, hops: number) => {
      if (hops > maxHops) return;
      if (hops > 0 && currentToken === targetToken) {
        // Found a cycle
        cycles.push([...path]);
        return;
      }

      if (visited.has(currentToken)) return;
      visited.add(currentToken);

      const outgoingEdges = this.edges.get(currentToken) || [];
      for (const edge of outgoingEdges) {
        path.push(edge);
        dfs(edge.tokenOut.mint, targetToken, hops + 1);
        path.pop();
      }

      visited.delete(currentToken);
    };

    dfs(startToken, startToken, 0);
    return cycles;
  }

  /**
   * Evaluate a cycle to calculate profit
   */
  private evaluateCycle(cycle: GraphEdge[], startToken: string): GraphOpportunity | null {
    if (cycle.length === 0) return null;

    // Simulate trading through the cycle
    let amount = BigInt(1000000000); // Start with 1 token (assuming 9 decimals)
    const steps: ArbitrageStep[] = [];

    for (const edge of cycle) {
      // Calculate output after fee
      const feeMultiplier = 1 - edge.fee / 10000; // Fee in basis points
      const outputAmount = (Number(amount) * edge.price * feeMultiplier);
      amount = BigInt(Math.floor(outputAmount));

      steps.push({
        pool: edge.pool,
        dex: edge.pool.dex,
        tokenIn: edge.tokenIn,
        tokenOut: edge.tokenOut,
        amountIn: amount,
        amountOut: BigInt(Math.floor(outputAmount)),
        price: edge.price,
        fee: edge.fee,
      });
    }

    // Calculate profit
    const startAmount = BigInt(1000000000);
    const profit = Number(amount - startAmount) / 1e9;
    const profitPercent = (profit / 1) * 100;

    if (profit <= 0) return null;

    // Build arbitrage path
    const path: ArbitragePath = {
      type: cycle.length === 2 ? 'simple' : 'multi_hop',
      steps,
      startToken: cycle[0].tokenIn,
      endToken: cycle[cycle.length - 1].tokenOut,
      totalHops: cycle.length,
    };

    // Calculate confidence based on liquidity and complexity
    const minLiquidity = Math.min(...cycle.map(e => Number(e.pool.reserves.tokenA + e.pool.reserves.tokenB)));
    const liquidityScore = Math.min(1, minLiquidity / 1e9 / 1000); // Normalize
    const complexityPenalty = cycle.length > 3 ? 0.1 : 0;
    const confidence = liquidityScore * (1 - complexityPenalty);

    return {
      path,
      profit,
      profitPercent,
      confidence,
      complexity: cycle.length <= 2 ? 'simple' : cycle.length <= 4 ? 'moderate' : 'complex',
      estimatedExecutionTime: cycle.length * 0.3, // ~0.3s per hop
    };
  }

  /**
   * Find triangular arbitrage opportunities
   */
  async findTriangularArbitrage(
    tokenA: string,
    tokenB: string,
    tokenC: string
  ): Promise<GraphOpportunity[]> {
    const opportunities: GraphOpportunity[] = [];

    // Find paths: A -> B -> C -> A
    const pathAB = this.findPath(tokenA, tokenB);
    const pathBC = this.findPath(tokenB, tokenC);
    const pathCA = this.findPath(tokenC, tokenA);

    if (pathAB && pathBC && pathCA) {
      const cycle = [...pathAB, ...pathBC, ...pathCA];
      const opportunity = this.evaluateCycle(cycle, tokenA);
      if (opportunity) {
        opportunities.push(opportunity);
      }
    }

    return opportunities;
  }

  /**
   * Find shortest path between two tokens
   */
  private findPath(fromToken: string, toToken: string): GraphEdge[] | null {
    const queue: Array<{ token: string; path: GraphEdge[] }> = [{ token: fromToken, path: [] }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { token, path } = queue.shift()!;

      if (token === toToken) {
        return path;
      }

      if (visited.has(token)) continue;
      visited.add(token);

      const outgoingEdges = this.edges.get(token) || [];
      for (const edge of outgoingEdges) {
        if (!visited.has(edge.tokenOut.mint)) {
          queue.push({ token: edge.tokenOut.mint, path: [...path, edge] });
        }
      }
    }

    return null;
  }

  /**
   * Find LSD (Liquid Staking Derivative) de-peg opportunities
   */
  async findLSDOpportunities(): Promise<GraphOpportunity[]> {
    const lsdTokens = ['mSOL', 'stSOL', 'jitoSOL', 'bSOL'];
    const opportunities: GraphOpportunity[] = [];

    for (const lsdSymbol of lsdTokens) {
      const lsdNode = Array.from(this.graph.values()).find(
        n => n.token.symbol === lsdSymbol
      );

      if (!lsdNode) continue;

      // Find SOL pools
      const solNode = Array.from(this.graph.values()).find(
        n => n.token.symbol === 'SOL' || n.token.mint === 'So11111111111111111111111111111111111111112'
      );

      if (!solNode) continue;

      // Check for price deviation (de-peg)
      const lsdPools = lsdNode.pools.filter(p => 
        p.tokenA.symbol === 'SOL' || p.tokenB.symbol === 'SOL'
      );

      for (const pool of lsdPools) {
        const expectedPrice = 1.0; // LSD should trade at ~1 SOL
        const actualPrice = pool.tokenA.symbol === 'SOL' 
          ? pool.price 
          : 1 / pool.price;

        const deviation = Math.abs(actualPrice - expectedPrice) / expectedPrice;

        if (deviation > 0.01) { // 1% de-peg
          const path: ArbitragePath = {
            type: 'wrap',
            steps: [{
              pool,
              dex: pool.dex,
              tokenIn: pool.tokenA,
              tokenOut: pool.tokenB,
              amountIn: BigInt(1000000000),
              amountOut: BigInt(Math.floor(1000000000 * actualPrice)),
              price: actualPrice,
              fee: pool.fee,
            }],
            startToken: pool.tokenA,
            endToken: pool.tokenB,
            totalHops: 1,
          };

          opportunities.push({
            path,
            profit: deviation * 1, // Estimate
            profitPercent: deviation * 100,
            confidence: 0.8,
            complexity: 'simple',
            estimatedExecutionTime: 0.5,
          });
        }
      }
    }

    return opportunities;
  }

  /**
   * Get graph statistics
   */
  getGraphStats(): {
    nodes: number;
    edges: number;
    pools: number;
    avgPoolsPerToken: number;
  } {
    const totalEdges = Array.from(this.edges.values()).reduce((sum, edges) => sum + edges.length, 0);
    const avgPoolsPerToken = this.graph.size > 0 
      ? this.pools.length / this.graph.size 
      : 0;

    return {
      nodes: this.graph.size,
      edges: totalEdges,
      pools: this.pools.length,
      avgPoolsPerToken,
    };
  }
}

