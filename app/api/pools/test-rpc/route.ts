/**
 * Test RPC URL passing
 * GET /api/pools/test-rpc
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { PoolScanner } from '@/app/lib/pools/scanner';
import { OrcaFetcher } from '@/app/lib/pools/fetchers/orca';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const network = 'mainnet';
    
    // Get RPC endpoint - prefer Helius if API key is available
    let rpcUrl: string;
    if (process.env.NEXT_PUBLIC_HELIUS_API_KEY) {
      const apiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
      let heliusKey = apiKey;
      if (apiKey.includes('helius-rpc.com')) {
        const match = apiKey.match(/[?&]api-key=([^&]+)/);
        heliusKey = match ? match[1] : apiKey.split('api-key=')[1]?.split('&')[0] || apiKey;
      }
      rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`;
    } else {
      rpcUrl = 'https://api.mainnet-beta.solana.com';
    }

    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Test 1: Check if scanner receives RPC URL
    const scanner = new PoolScanner({ rpcUrl } as any);
    const scannerRpcUrl = (scanner as any).rpcUrl;
    
    // Test 2: Check if fetcher receives RPC URL
    const fetcher = new OrcaFetcher();
    if (typeof fetcher.setRpcUrl === 'function') {
      fetcher.setRpcUrl(rpcUrl);
    }
    const fetcherRpcUrl = (fetcher as any).rpcUrl;
    
    // Test 3: Check connection RPC endpoint
    const connectionRpc = connection.rpcEndpoint;
    
    // Test 4: Try to fetch a slot to verify RPC works
    let slotTest = 'not tested';
    try {
      const slot = await connection.getSlot();
      slotTest = `success: slot ${slot}`;
    } catch (error) {
      slotTest = `failed: ${error instanceof Error ? error.message : String(error)}`;
    }

    return NextResponse.json({
      success: true,
      tests: {
        rpcUrlConstructed: rpcUrl.replace(/api-key=[^&]+/, 'api-key=***'),
        scannerReceivedRpcUrl: scannerRpcUrl ? scannerRpcUrl.replace(/api-key=[^&]+/, 'api-key=***') : 'NOT SET',
        fetcherReceivedRpcUrl: fetcherRpcUrl ? fetcherRpcUrl.replace(/api-key=[^&]+/, 'api-key=***') : 'NOT SET',
        connectionRpcEndpoint: connectionRpc,
        slotTest,
        hasHeliusKey: !!process.env.NEXT_PUBLIC_HELIUS_API_KEY,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

