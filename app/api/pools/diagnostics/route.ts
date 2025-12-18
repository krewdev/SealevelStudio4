/**
 * Pool Scanning Diagnostics API
 * Helps debug why pool scanning might return 0 pools
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';

export const dynamic = 'force-dynamic';

/**
 * Get diagnostics for pool scanning
 * GET /api/pools/diagnostics?network=mainnet
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const network = searchParams.get('network') || 'devnet';

    // Get RPC endpoint
    const rpcUrl = network === 'mainnet'
      ? (process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'https://api.mainnet-beta.solana.com')
      : (process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com');

    const diagnostics: any = {
      network,
      rpcUrl,
      timestamp: new Date().toISOString(),
      checks: {},
    };

    // Check 1: RPC Connection
    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const slot = await connection.getSlot();
      diagnostics.checks.rpcConnection = {
        status: 'success',
        slot,
        message: 'RPC endpoint is accessible',
      };
    } catch (error) {
      diagnostics.checks.rpcConnection = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        message: 'RPC endpoint is not accessible',
      };
    }

    // Check 2: Environment Variables
    diagnostics.checks.environment = {
      hasHeliusKey: !!process.env.NEXT_PUBLIC_HELIUS_API_KEY,
      hasBirdeyeKey: !!process.env.NEXT_PUBLIC_BIRDEYE_API_KEY,
      hasJupiterKey: !!process.env.JUPITER_API_KEY,
      rpcMainnet: process.env.NEXT_PUBLIC_SOLANA_RPC_MAINNET || 'not set',
      rpcDevnet: process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'not set',
    };

    // Check 3: Test fetching a known program
    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      // Try fetching Raydium AMM program accounts
      const raydiumProgramId = '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8';
      const accounts = await connection.getProgramAccounts(
        new (await import('@solana/web3.js')).PublicKey(raydiumProgramId),
        { dataSlice: { offset: 0, length: 0 } }
      );
      diagnostics.checks.programFetch = {
        status: 'success',
        accountsFound: accounts.length,
        message: 'Can fetch program accounts',
      };
    } catch (error) {
      diagnostics.checks.programFetch = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        message: 'Cannot fetch program accounts',
      };
    }

    // Check 4: Network Info
    try {
      const connection = new Connection(rpcUrl, 'confirmed');
      const version = await connection.getVersion();
      const blockHeight = await connection.getBlockHeight();
      diagnostics.checks.networkInfo = {
        status: 'success',
        version: version['solana-core'],
        blockHeight,
        message: 'Network info retrieved',
      };
    } catch (error) {
      diagnostics.checks.networkInfo = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        message: 'Cannot get network info',
      };
    }

    // Recommendations
    const recommendations: string[] = [];
    
    if (diagnostics.checks.programFetch?.status === 'failed') {
      if (diagnostics.checks.environment.hasHeliusKey) {
        recommendations.push('✅ You have a Helius API key - the pool scanner will automatically use it to avoid rate limits');
        recommendations.push('💡 The pool scanning API now automatically uses Helius RPC when available');
      } else {
        recommendations.push('⚠️  Consider using Helius RPC to avoid rate limits (set NEXT_PUBLIC_HELIUS_API_KEY)');
      }
      
      if (diagnostics.checks.programFetch.error?.includes('429')) {
        recommendations.push('🚨 Rate limit detected on public RPC - using Helius will solve this');
      }
    }

    // Summary
    const allChecksPassed = Object.values(diagnostics.checks).every(
      (check: any) => check.status === 'success'
    );

    diagnostics.summary = {
      allChecksPassed,
      totalChecks: Object.keys(diagnostics.checks).length,
      passedChecks: Object.values(diagnostics.checks).filter(
        (check: any) => check.status === 'success'
      ).length,
      recommendations,
    };

    return NextResponse.json({
      success: true,
      diagnostics,
    });
  } catch (error) {
    console.error('Diagnostics error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

