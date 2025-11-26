/**
 * API Route: SEAL Token Airdrop
 * Airdrops SEAL tokens to beta testers on attestation mint
 * 
 * POST /api/seal/airdrop
 * Body: { walletAddress: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { airdropSealToBetaTester } from '@/app/lib/seal-token/airdrop';
import { validateSolanaAddress } from '@/app/lib/security/validation';
import { rateLimitByIp, rateLimitByWallet } from '@/app/lib/security/rate-limit';
import { airdropStore } from '@/app/lib/seal-token/server-store';

export const dynamic = 'force-dynamic';

/**
 * Process SEAL airdrop for beta tester
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate Limiting
    if (!rateLimitByIp(request)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    if (!rateLimitByWallet(walletAddress)) {
      return NextResponse.json({ error: 'Wallet rate limit exceeded' }, { status: 429 });
    }

    // 2. Validate wallet address
    const addressValidation = validateSolanaAddress(walletAddress);
    if (!addressValidation.valid) {
      return NextResponse.json(
        { error: addressValidation.error || 'Invalid wallet address' },
        { status: 400 }
      );
    }

    // 3. Check Server-Side Eligibility (Instead of client-side localStorage)
    // Optimistic Lock: Mark as claimed immediately to prevent race conditions
    // We will revert this if subsequent checks fail
    const isClaimed = airdropStore.isClaimed(walletAddress);
    if (isClaimed) {
       return NextResponse.json(
        { error: 'Airdrop already claimed' },
        { status: 403 }
      );
    }
    
    // Apply lock early to prevent race conditions
    const existingRecord = airdropStore.get(walletAddress);
    if (existingRecord) {
      airdropStore.updateStatus(walletAddress, 'claimed');
    } else {
      airdropStore.save({
        id: `claim_${Date.now()}_${walletAddress.slice(0, 8)}`,
        wallet: walletAddress,
        amount: 10000,
        status: 'claimed',
        requiresCNFT: true,
        createdAt: new Date().toISOString(),
        claimedAt: new Date().toISOString()
      });
    }

    const walletPubkey = new PublicKey(walletAddress);

    // Get RPC endpoint
    const heliusApiKey = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    const rpcUrl = heliusApiKey
      ? `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
      : 'https://api.mainnet-beta.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');

    // 4. Verify Beta Tester cNFT On-Chain (Critical Check)
    try {
        // Construct absolute URL for internal fetch
        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const baseUrl = `${protocol}://${host}`;
        
        const checkUrl = new URL('/api/verisol/beta-tester/check', baseUrl);
        checkUrl.searchParams.set('wallet', walletAddress);
        const checkResponse = await fetch(checkUrl.toString());
        
        if (!checkResponse.ok) {
            throw new Error('Failed to verify attestation');
        }
        const checkData = await checkResponse.json();
        if (!checkData.hasAttestation) {
            throw new Error('Beta Tester Attestation not found');
        }
    } catch (error) {
        // Revert lock if verification fails
        if (existingRecord) {
            airdropStore.updateStatus(walletAddress, 'reserved');
        } else {
            // If we created it, set to reserved (or we could delete it, but reserved is safer for tracking)
            airdropStore.save({
                id: `claim_${Date.now()}_${walletAddress.slice(0, 8)}`,
                wallet: walletAddress,
                amount: 10000,
                status: 'reserved',
                requiresCNFT: true,
                createdAt: new Date().toISOString(),
                claimedAt: null
            });
        }
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Verification failed' }, { status: 403 });
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

    // Generate treasury keypair from seed
    // Ensure strict 32-byte seed
    let seedBuffer = Buffer.from(treasurySeed, 'utf-8');
    if (seedBuffer.length < 32) {
       // Pad with zeros if too short (unsafe but prevents crash, better to fail in prod)
       // Ideally, throw error.
        return NextResponse.json({ error: 'Invalid treasury seed configuration' }, { status: 500 });
    }
    seedBuffer = seedBuffer.slice(0, 32);
    const treasuryKeypair = Keypair.fromSeed(seedBuffer);

    // 5. Proceed with Transfer
    // (Lock already applied in step 3)

    // Process airdrop
    let signature;
    try {
      signature = await airdropSealToBetaTester(
        connection,
        treasuryKeypair,
        walletPubkey
      );
    } catch (error) {
      // Revert claim status on failure to allow retry
      if (existingRecord) {
        airdropStore.updateStatus(walletAddress, 'reserved');
      } else {
        // If we created it, set to reserved
        airdropStore.save({
          id: `claim_${Date.now()}_${walletAddress.slice(0, 8)}`, // ID changes but that's fine
          wallet: walletAddress,
          amount: 10000,
          status: 'reserved',
          requiresCNFT: true,
          createdAt: new Date().toISOString(),
          claimedAt: null
        });
      }
      throw error;
    }

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

    const isClaimed = airdropStore.isClaimed(walletAddress);
    
    // Verify cNFT ownership
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const baseUrl = `${protocol}://${host}`;
    
    const checkUrl = new URL('/api/verisol/beta-tester/check', baseUrl);
    checkUrl.searchParams.set('wallet', walletAddress);
    const checkResponse = await fetch(checkUrl.toString());
    
    if (!checkResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to verify attestation status' },
        { status: 500 }
      );
    }
    
    const checkData = await checkResponse.json();

    const eligible = !isClaimed && checkData.hasAttestation;
    let reason;
    if (isClaimed) reason = 'Already claimed';
    else if (!checkData.hasAttestation) reason = 'Beta Tester Attestation required';
    else reason = 'Eligible for airdrop';

    return NextResponse.json({
      eligible,
      reason,
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


