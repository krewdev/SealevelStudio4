/**
 * API Route: SEAL Token Airdrop
 * Airdrops SEAL tokens to beta testers on attestation mint
 * 
 * POST /api/seal/airdrop
 * Body: { walletAddress: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { airdropSealToBetaTester, checkAirdropEligibility } from '@/app/lib/seal-token/airdrop';
import { validateSolanaAddress } from '@/app/lib/security/validation';

export const dynamic = 'force-dynamic';

/**
 * Process SEAL airdrop for beta tester
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Validate wallet address
    const addressValidation = validateSolanaAddress(walletAddress);
    if (!addressValidation.valid) {
      return NextResponse.json(
        { error: addressValidation.error || 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const walletPubkey = new PublicKey(walletAddress);

    // Get RPC endpoint
    const heliusApiKey = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    const rpcUrl = heliusApiKey
      ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
      : 'https://api.mainnet-beta.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');

    // Check eligibility
    const eligibility = await checkAirdropEligibility(connection, walletPubkey);
    
    if (!eligibility.eligible) {
      return NextResponse.json(
        { 
          error: eligibility.reason || 'Not eligible for airdrop',
          eligible: false,
        },
        { status: 403 }
      );
    }

    // Get treasury wallet (from environment or secure storage)
    // WARNING: In production, treasury keypair should be stored securely (HSM, AWS KMS, etc.)
    const treasurySeed = process.env.SEAL_TREASURY_SEED;
    if (!treasurySeed) {
      return NextResponse.json(
        { error: 'Treasury wallet not configured' },
        { status: 500 }
      );
    }

    // Generate treasury keypair from seed (in production, use secure key management)
    const treasurySeedBuffer = Buffer.from(treasurySeed, 'utf-8').slice(0, 32);
    const treasuryKeypair = Keypair.fromSeed(treasurySeedBuffer);

    // Process airdrop
    const signature = await airdropSealToBetaTester(
      connection,
      treasuryKeypair,
      walletPubkey
    );

    return NextResponse.json({
      success: true,
      signature,
      wallet: walletAddress,
      amount: 10000, // SEAL_TOKEN_ECONOMICS.beta_tester.airdrop_amount
      message: 'SEAL tokens airdropped successfully',
    });
  } catch (error) {
    console.error('Airdrop error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process airdrop',
      },
      { status: 500 }
    );
  }
}

/**
 * Check airdrop eligibility
 * GET /api/seal/airdrop/check?wallet=<address>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required. Use ?wallet=<address>' },
        { status: 400 }
      );
    }

    // Validate wallet address
    const addressValidation = validateSolanaAddress(walletAddress);
    if (!addressValidation.valid) {
      return NextResponse.json(
        { error: addressValidation.error || 'Invalid wallet address' },
        { status: 400 }
      );
    }

    const walletPubkey = new PublicKey(walletAddress);

    // Get RPC endpoint
    const heliusApiKey = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    const rpcUrl = heliusApiKey
      ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
      : 'https://api.mainnet-beta.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');

    // Check eligibility
    const eligibility = await checkAirdropEligibility(connection, walletPubkey);

    return NextResponse.json({
      eligible: eligibility.eligible,
      reason: eligibility.reason,
      wallet: walletAddress,
    });
  } catch (error) {
    console.error('Eligibility check error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check eligibility',
      },
      { status: 500 }
    );
  }
}

