import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { EnhancedPerpetualMonitor } from '@/app/lib/perpetuals/enhanced-monitor';
import { PoolScanner } from '@/app/lib/pools/scanner';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const protocol = searchParams.get('protocol') as 'drift' | 'mango' | 'zetamarkets' | '01' | null;
  const market = searchParams.get('market');
  
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 
                   'https://api.devnet.solana.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const monitor = new EnhancedPerpetualMonitor(connection);
    const scanner = new PoolScanner();
    const state = await scanner.scan(connection);
    
    // If specific contract requested
    if (protocol && market) {
      const contract = await monitor.monitorContract(protocol, market);
      if (!contract) {
        return NextResponse.json(
          { error: 'Contract not found', success: false },
          { status: 404 }
        );
      }

      // Get spot price (from pools)
      const solPools = state.pools.filter(p => 
        p.tokenA.symbol === 'SOL' || p.tokenB.symbol === 'SOL'
      );
      const spotPrice = solPools.length > 0 ? solPools[0].price : 0;

      // Detect arbitrage
      const arbitrage = monitor.detectArbitrage(contract, spotPrice);
      const fundingArbitrage = monitor.detectFundingArbitrage(contract);

      return NextResponse.json({
        success: true,
        contract,
        spotPrice,
        arbitrage,
        fundingArbitrage,
      });
    }

    // Monitor all major perpetual markets
    const markets = [
      { protocol: 'drift' as const, market: 'SOL-PERP' },
      { protocol: 'mango' as const, market: 'SOL-PERP' },
    ];

    const contracts = await Promise.all(
      markets.map(m => monitor.monitorContract(m.protocol, m.market))
    );

    const allArbitrages = [];
    const solPools = state.pools.filter(p => 
      p.tokenA.symbol === 'SOL' || p.tokenB.symbol === 'SOL'
    );
    const spotPrice = solPools.length > 0 ? solPools[0].price : 0;

    for (const contract of contracts) {
      if (contract) {
        const arb = monitor.detectArbitrage(contract, spotPrice);
        if (arb) allArbitrages.push(arb);
        
        const funding = monitor.detectFundingArbitrage(contract);
        if (funding) allArbitrages.push(funding);
      }
    }

    // Compare across protocols
    const crossProtocol = monitor.compareProtocols('SOL-PERP', contracts.filter(Boolean) as any);

    return NextResponse.json({
      success: true,
      contracts: contracts.filter(Boolean),
      arbitrages: allArbitrages,
      crossProtocol,
      spotPrice,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Perpetual monitoring error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to monitor perpetuals',
        success: false,
      },
      { status: 500 }
    );
  }
}

