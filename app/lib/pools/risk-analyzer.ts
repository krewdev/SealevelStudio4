// Risk analysis and execution probability calculation
// Determines if an opportunity is worth executing

import { ArbitrageOpportunity, PoolData } from './types';

export interface RiskAnalysis {
  opportunity: ArbitrageOpportunity;
  executionProbability: number; // 0-1
  riskScore: number; // 0-1 (0 = no risk, 1 = high risk)
  competitionLevel: 'low' | 'medium' | 'high';
  factors: {
    liquidity: 'sufficient' | 'low' | 'insufficient';
    slippage: 'low' | 'medium' | 'high';
    gasCost: 'low' | 'medium' | 'high';
    competition: 'low' | 'medium' | 'high';
    timeWindow: 'wide' | 'narrow' | 'critical';
  };
  recommendation: 'execute' | 'caution' | 'skip';
  reasoning: string;
  estimatedExecutionTime: number; // seconds
  requiredTip?: number; // lamports for Jito
}

export class RiskAnalyzer {
  /**
   * Analyze risk and execution probability for an opportunity
   */
  analyzeOpportunity(
    opportunity: ArbitrageOpportunity,
    pools: PoolData[],
    marketContext?: {
      averageGasPrice?: number;
      networkCongestion?: number; // 0-1
      competitorActivity?: number; // 0-1
    }
  ): RiskAnalysis {
    const factors = this.analyzeFactors(opportunity, pools);
    const executionProbability = this.calculateExecutionProbability(factors, opportunity);
    const riskScore = this.calculateRiskScore(factors, opportunity);
    const competitionLevel = this.assessCompetition(factors, marketContext);
    const recommendation = this.makeRecommendation(executionProbability, riskScore, opportunity);
    const reasoning = this.generateReasoning(factors, executionProbability, riskScore);

    return {
      opportunity,
      executionProbability,
      riskScore,
      competitionLevel,
      factors,
      recommendation,
      reasoning,
      estimatedExecutionTime: this.estimateExecutionTime(opportunity),
      requiredTip: this.calculateRequiredTip(opportunity, marketContext),
    };
  }

  /**
   * Analyze individual risk factors
   */
  private analyzeFactors(
    opportunity: ArbitrageOpportunity,
    pools: PoolData[]
  ): RiskAnalysis['factors'] {
    // Analyze liquidity
    const minLiquidity = Math.min(
      ...opportunity.steps.map(step => {
        const pool = pools.find(p => p.id === step.pool.id);
        if (!pool) return 0;
        return Number(pool.reserves.tokenA + pool.reserves.tokenB) / 1e9;
      })
    );

    const liquidity: RiskAnalysis['factors']['liquidity'] = 
      minLiquidity > 1000 ? 'sufficient' :
      minLiquidity > 100 ? 'low' :
      'insufficient';

    // Analyze slippage
    const inputAmount = Number(opportunity.inputAmount) / 1e9;
    const slippageRisk = inputAmount / minLiquidity;
    const slippage: RiskAnalysis['factors']['slippage'] =
      slippageRisk < 0.01 ? 'low' :
      slippageRisk < 0.05 ? 'medium' :
      'high';

    // Analyze gas cost
    const gasCost = opportunity.gasEstimate / 1e9; // Convert to SOL
    const gasRatio = gasCost / opportunity.profit;
    const gasCostLevel: RiskAnalysis['factors']['gasCost'] =
      gasRatio < 0.1 ? 'low' :
      gasRatio < 0.3 ? 'medium' :
      'high';

    // Analyze competition (based on opportunity age and profit)
    const opportunityAge = Date.now() - opportunity.timestamp.getTime();
    const competition: RiskAnalysis['factors']['competition'] =
      opportunityAge < 5000 && opportunity.profitPercent > 2 ? 'high' :
      opportunityAge < 10000 ? 'medium' :
      'low';

    // Analyze time window
    const expiresAt = opportunity.expiresAt?.getTime() || Date.now() + 60000;
    const timeRemaining = expiresAt - Date.now();
    const timeWindow: RiskAnalysis['factors']['timeWindow'] =
      timeRemaining > 30000 ? 'wide' :
      timeRemaining > 10000 ? 'narrow' :
      'critical';

    return {
      liquidity,
      slippage,
      gasCost: gasCostLevel,
      competition,
      timeWindow,
    };
  }

  /**
   * Calculate execution probability
   */
  private calculateExecutionProbability(
    factors: RiskAnalysis['factors'],
    opportunity: ArbitrageOpportunity
  ): number {
    let probability = 1.0;

    // Liquidity impact
    if (factors.liquidity === 'insufficient') probability *= 0.2;
    else if (factors.liquidity === 'low') probability *= 0.6;

    // Slippage impact
    if (factors.slippage === 'high') probability *= 0.3;
    else if (factors.slippage === 'medium') probability *= 0.7;

    // Gas cost impact
    if (factors.gasCost === 'high') probability *= 0.4;
    else if (factors.gasCost === 'medium') probability *= 0.8;

    // Competition impact
    if (factors.competition === 'high') probability *= 0.3;
    else if (factors.competition === 'medium') probability *= 0.6;

    // Time window impact
    if (factors.timeWindow === 'critical') probability *= 0.2;
    else if (factors.timeWindow === 'narrow') probability *= 0.5;

    // Confidence from opportunity
    probability *= opportunity.confidence;

    return Math.max(0, Math.min(1, probability));
  }

  /**
   * Calculate risk score
   */
  private calculateRiskScore(
    factors: RiskAnalysis['factors'],
    opportunity: ArbitrageOpportunity
  ): number {
    let risk = 0;

    // Liquidity risk
    if (factors.liquidity === 'insufficient') risk += 0.4;
    else if (factors.liquidity === 'low') risk += 0.2;

    // Slippage risk
    if (factors.slippage === 'high') risk += 0.3;
    else if (factors.slippage === 'medium') risk += 0.15;

    // Gas risk
    if (factors.gasCost === 'high') risk += 0.2;
    else if (factors.gasCost === 'medium') risk += 0.1;

    // Competition risk
    if (factors.competition === 'high') risk += 0.3;
    else if (factors.competition === 'medium') risk += 0.15;

    // Time risk
    if (factors.timeWindow === 'critical') risk += 0.3;
    else if (factors.timeWindow === 'narrow') risk += 0.15;

    // Inverse confidence adds risk
    risk += (1 - opportunity.confidence) * 0.2;

    return Math.max(0, Math.min(1, risk));
  }

  /**
   * Assess competition level
   */
  private assessCompetition(
    factors: RiskAnalysis['factors'],
    marketContext?: {
      competitorActivity?: number;
    }
  ): 'low' | 'medium' | 'high' {
    if (factors.competition === 'high') return 'high';
    if (factors.competition === 'medium') return 'medium';
    if (marketContext?.competitorActivity && marketContext.competitorActivity > 0.7) return 'high';
    if (marketContext?.competitorActivity && marketContext.competitorActivity > 0.4) return 'medium';
    return 'low';
  }

  /**
   * Make recommendation
   */
  private makeRecommendation(
    executionProbability: number,
    riskScore: number,
    opportunity: ArbitrageOpportunity
  ): 'execute' | 'caution' | 'skip' {
    // High probability, low risk = execute
    if (executionProbability > 0.7 && riskScore < 0.3) return 'execute';
    
    // Low probability or high risk = skip
    if (executionProbability < 0.3 || riskScore > 0.7) return 'skip';
    
    // Medium = caution
    return 'caution';
  }

  /**
   * Generate reasoning
   */
  private generateReasoning(
    factors: RiskAnalysis['factors'],
    executionProbability: number,
    riskScore: number
  ): string {
    const reasons: string[] = [];

    if (factors.liquidity === 'insufficient') {
      reasons.push('Insufficient liquidity may prevent execution');
    } else if (factors.liquidity === 'low') {
      reasons.push('Low liquidity may cause slippage');
    }

    if (factors.slippage === 'high') {
      reasons.push('High slippage risk may reduce profit');
    }

    if (factors.competition === 'high') {
      reasons.push('High competition - opportunity may be taken quickly');
    }

    if (factors.timeWindow === 'critical') {
      reasons.push('Very narrow time window - must act immediately');
    }

    if (executionProbability > 0.7) {
      reasons.push('High execution probability');
    } else if (executionProbability < 0.3) {
      reasons.push('Low execution probability');
    }

    if (riskScore < 0.3) {
      reasons.push('Low risk profile');
    } else if (riskScore > 0.7) {
      reasons.push('High risk profile');
    }

    return reasons.join('. ') || 'Moderate opportunity with balanced risk/reward';
  }

  /**
   * Estimate execution time
   */
  private estimateExecutionTime(opportunity: ArbitrageOpportunity): number {
    // Base time per hop
    const baseTimePerHop = 0.3; // seconds
    const totalHops = opportunity.path.totalHops;
    
    // Add overhead for complex paths
    const complexityMultiplier = opportunity.type === 'multi_hop' ? 1.5 : 1.0;
    
    return totalHops * baseTimePerHop * complexityMultiplier;
  }

  /**
   * Calculate required Jito tip
   */
  private calculateRequiredTip(
    opportunity: ArbitrageOpportunity,
    marketContext?: {
      networkCongestion?: number;
    }
  ): number {
    const baseTip = 10000; // 0.00001 SOL base
    const profitBasedTip = Math.floor(opportunity.profit * 1e9 * 0.1); // 10% of profit
    const congestionMultiplier = marketContext?.networkCongestion 
      ? 1 + marketContext.networkCongestion 
      : 1;

    return Math.floor((baseTip + profitBasedTip) * congestionMultiplier);
  }

  /**
   * Batch analyze multiple opportunities
   */
  batchAnalyze(
    opportunities: ArbitrageOpportunity[],
    pools: PoolData[],
    marketContext?: {
      averageGasPrice?: number;
      networkCongestion?: number;
      competitorActivity?: number;
    }
  ): RiskAnalysis[] {
    return opportunities.map(opp => 
      this.analyzeOpportunity(opp, pools, marketContext)
    ).sort((a, b) => {
      // Sort by score: execution probability * (1 - risk) * profit
      const scoreA = a.executionProbability * (1 - a.riskScore) * a.opportunity.profit;
      const scoreB = b.executionProbability * (1 - b.riskScore) * b.opportunity.profit;
      return scoreB - scoreA;
    });
  }
}

