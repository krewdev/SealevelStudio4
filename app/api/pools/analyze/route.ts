import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PoolScanner } from '@/app/lib/pools/scanner';
import { ArbitrageDetector } from '@/app/lib/pools/arbitrage';
import { RiskAnalyzer } from '@/app/lib/pools/risk-analyzer';
import { DEFAULT_SCANNER_CONFIG } from '@/app/lib/pools/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const opportunityId = searchParams.get('opportunityId');
  const minProfit = parseFloat(searchParams.get('minProfit') || '0.01');
  
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const scanner = new PoolScanner();
    const state = await scanner.scan(connection);
    
    const detector = new ArbitrageDetector(state.pools, state.config, connection);
    const opportunities = await detector.detectOpportunities();
    
    // Filter by minimum profit
    const filteredOpps = opportunities.filter(opp => opp.profit >= minProfit);
    
    // Analyze all opportunities
    const riskAnalyzer = new RiskAnalyzer();
    const analyses = riskAnalyzer.batchAnalyze(filteredOpps, state.pools, {
      networkCongestion: 0.5, // Would fetch actual congestion
      competitorActivity: 0.3, // Would estimate from recent activity
    });

    // If specific opportunity requested
    if (opportunityId) {
      const analysis = analyses.find(a => a.opportunity.id === opportunityId);
      if (!analysis) {
        return NextResponse.json(
          { error: 'Opportunity not found', success: false },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        analysis,
      });
    }

    // Return all analyses, sorted by score
    return NextResponse.json({
      success: true,
      analyses: analyses.slice(0, 20), // Top 20
      total: analyses.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Risk analysis error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to analyze opportunities',
        success: false,
      },
      { status: 500 }
    );
  }
}

