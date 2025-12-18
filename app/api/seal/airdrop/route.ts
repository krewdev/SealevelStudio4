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
    // Note: We do a preliminary check here, but the atomic claim happens later
    // This early check is just for fast rejection of obviously ineligible requests
    const isClaimed = airdropStore.isClaimed(walletAddress);
    if (isClaimed) {
       return NextResponse.json(
        { error: 'Airdrop already claimed' },
        { status: 403 }
      );
    }

    // Note: Ideally we check for reservation here too, but since reservation logic
    // might currently happen client-side in this MVP, we might skip strict reservation check
    // IF the user proves they have the Beta Tester cNFT (which acts as the "reservation").
    // However, strictly following the "reservation" model:
    // if (!airdropStore.hasReservation(walletAddress)) { ... }
    // For now, let's assume owning the cNFT is sufficient proof of eligibility if not already claimed.

    const walletPubkey = new PublicKey(walletAddress);

    // Get RPC endpoint - use devnet for demo
    const heliusApiKey = process.env.HELIUS_API_KEY || process.env.NEXT_PUBLIC_HELIUS_API_KEY;
    const rpcUrl = heliusApiKey
      ? `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`
      : process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 'https://api.devnet.solana.com';

    const connection = new Connection(rpcUrl, 'confirmed');

    // 4. Verify Beta Tester cNFT On-Chain (Critical Check)
    // We reuse the logic or call the check endpoint internally if needed, 
    // but ideally we verify directly here to avoid internal API call loops.
    // Since checkAirdropEligibility was client-side, we need a server-side verification.
    // For MVP, we will trust `airdropSealToBetaTester` to perform necessary checks OR
    // we should implement `checkBetaTesterCNFT` logic here server-side.
    // Given `airdropSealToBetaTester` just does the transfer, we MUST verify cNFT ownership here.
    // Accessing `checkBetaTesterCNFT` logic which fetches from DAS API:
    
    // ... (We would call DAS API here to verify cNFT ownership) ...
    // For safety, let's assume we call the check endpoint internally or import a helper.
    // Since we can't easily import the client-side helper, let's mock the check 
    // or rely on the previous design where the client proves it. 
    // BUT trusting the client is bad.
    // Let's verify via an internal fetch to our own API which handles the DAS lookup.
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const checkUrl = new URL('/api/verisol/beta-tester/check', baseUrl);
    checkUrl.searchParams.set('wallet', walletAddress);
    const checkResponse = await fetch(checkUrl.toString());
    
    if (!checkResponse.ok) {
        return NextResponse.json({ error: 'Failed to verify attestation' }, { status: 500 });
    }
    const checkData = await checkResponse.json();
    if (!checkData.hasAttestation) {
        return NextResponse.json({ error: 'Beta Tester Attestation not found' }, { status: 403 });
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

    // 5. Atomic Eligibility Check & Lock (Prevent TOCTOU Race Condition)
    // Use atomic tryClaim to prevent concurrent requests from both claiming
    const existingRecord = airdropStore.get(walletAddress);
    const reservationData: Omit<Parameters<typeof airdropStore.tryClaim>[1], 'status' | 'claimedAt'> = {
      id: existingRecord?.id || `claim_${Date.now()}_${walletAddress.slice(0, 8)}`,
      wallet: walletAddress,
      amount: 10000,
      requiresCNFT: true,
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
    };

    const claimed = await airdropStore.tryClaim(walletAddress, reservationData);
    if (!claimed) {
      return NextResponse.json({ error: 'Airdrop already claimed' }, { status: 403 });
    }

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
      // Note: In production with proper database transactions, this would be handled by rollback
      const record = airdropStore.get(walletAddress);
      if (record) {
        airdropStore.updateStatus(walletAddress, 'reserved');
        // Clear claimedAt timestamp
        record.claimedAt = null;
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
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


