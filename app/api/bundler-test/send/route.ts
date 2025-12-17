/**
 * API: Send SOL/Token from Test Wallet
 * Send SOL or tokens from a test wallet
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';
import { sendSolFromWallet, sendTokenFromWallet } from '@/app/lib/bundler/test-utils';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(network as any);
const connection = new Connection(rpcUrl, 'confirmed');

/**
 * POST /api/bundler-test/send
 * Send SOL or tokens from a test wallet
 * Body: { walletIndex: number, toAddress: string, amount: number, tokenMint?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletIndex, toAddress, amount, tokenMint, priorityFee } = body;

    if (!walletIndex || !toAddress || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: walletIndex, toAddress, amount',
        },
        { status: 400 }
      );
    }

    // Load wallets
    const walletsFile = path.join(process.cwd(), 'scripts', 'bundler-test-wallets.json');
    
    if (!fs.existsSync(walletsFile)) {
      return NextResponse.json(
        {
          success: false,
          error: 'No test wallets found. Run the test script first.',
        },
        { status: 404 }
      );
    }

    const walletsData = JSON.parse(fs.readFileSync(walletsFile, 'utf-8'));
    const walletData = walletsData[walletIndex - 1];

    if (!walletData) {
      return NextResponse.json(
        {
          success: false,
          error: `Wallet ${walletIndex} not found`,
        },
        { status: 404 }
      );
    }

    // Reconstruct keypair
    const secretKey = Buffer.from(walletData.privateKey, 'hex');
    const keypair = Keypair.fromSecretKey(secretKey);

    // Create test wallet object
    const testWallet = {
      index: walletData.index,
      keypair,
      address: walletData.address,
      label: walletData.label,
      group: walletData.group as 'dcaBuy' | 'scheduledSell' | 'manual',
    };

    // Send transaction
    let signature: string;
    
    if (tokenMint) {
      signature = await sendTokenFromWallet(connection, {
        fromWallet: testWallet,
        toAddress,
        amount,
        tokenMint,
        priorityFee,
      });
    } else {
      signature = await sendSolFromWallet(connection, {
        fromWallet: testWallet,
        toAddress,
        amount,
        priorityFee,
      });
    }

    return NextResponse.json({
      success: true,
      signature,
      wallet: {
        index: walletData.index,
        label: walletData.label,
        address: walletData.address,
      },
      amount,
      tokenMint: tokenMint || 'SOL',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send transaction',
      },
      { status: 500 }
    );
  }
}







