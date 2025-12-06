/**
 * API: Bundler Test Wallets
 * Manage test wallets created for bundler testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, clusterApiUrl, PublicKey } from '@solana/web3.js';
import { getWalletBalance } from '@/app/lib/bundler/test-utils';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network as any);
const connection = new Connection(rpcUrl, 'confirmed');

/**
 * GET /api/bundler-test/wallets
 * Get all test wallets
 */
export async function GET(request: NextRequest) {
  try {
    const walletsFile = path.join(process.cwd(), 'scripts', 'bundler-test-wallets.json');
    
    if (!fs.existsSync(walletsFile)) {
      return NextResponse.json({
        success: false,
        error: 'No test wallets found. Run the test script first.',
        wallets: [],
      });
    }

    const walletsData = JSON.parse(fs.readFileSync(walletsFile, 'utf-8'));
    
    // Get balances for each wallet
    const walletsWithBalances = await Promise.all(
      walletsData.map(async (wallet: any) => {
        try {
          const balance = await connection.getBalance(new PublicKey(wallet.address));
          return {
            ...wallet,
            balance: balance / 1e9,
            balanceLamports: balance,
          };
        } catch {
          return {
            ...wallet,
            balance: 0,
            balanceLamports: 0,
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      wallets: walletsWithBalances,
      total: walletsWithBalances.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to load wallets',
      },
      { status: 500 }
    );
  }
}



