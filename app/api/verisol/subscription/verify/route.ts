// VeriSol Subscription Verifier API
// Verifies if a user's platform wallet has paid their subscription and mints a cNFT with tier information

import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { validateSolanaAddress } from '@/app/lib/security/validation';
import { getSealMintAddress, SEAL_TOKEN_ECONOMICS, SEAL_TOKEN_CONFIG } from '@/app/lib/seal-token/config';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createAttestationClient, checkAttestationProgramDeployed, getTierInfo } from '@/app/lib/attestation/client';

export const dynamic = 'force-dynamic';

// Subscription tier thresholds (in SEAL tokens)
const SUBSCRIPTION_TIERS = {
  free: { name: 'Free', price: 0, minPayment: 0 },
  basic: { name: 'Basic', price: 1000, minPayment: 1000 },
  pro: { name: 'Pro', price: 5000, minPayment: 5000 },
};

// Subscription period (30 days in milliseconds)
const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

interface SubscriptionPayment {
  signature: string;
  amount: bigint; // Amount in lamports (SEAL tokens with decimals)
  timestamp: number;
  from: string;
  to: string;
}

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  tier: 'free' | 'basic' | 'pro' | null;
  lastPaymentDate: number | null;
  nextPaymentDue: number | null;
  totalPaid: bigint;
  payments: SubscriptionPayment[];
}

/**
 * Get platform/treasury wallet address from environment
 */
function getPlatformWallet(): PublicKey | null {
  const platformAddress = 
    process.env.NEXT_PUBLIC_PLATFORM_FEE_ADDRESS ||
    process.env.NEXT_PUBLIC_TREASURY_ADDRESS ||
    process.env.PLATFORM_WALLET_ADDRESS;
  
  if (!platformAddress) {
    return null;
  }
  
  try {
    return new PublicKey(platformAddress);
  } catch {
    return null;
  }
}

/**
 * Check subscription payment history by scanning token transfers
 * Uses parsed transactions for more reliable detection
 */
async function checkSubscriptionPayments(
  connection: Connection,
  userWallet: PublicKey,
  platformWallet: PublicKey,
  sealMint: PublicKey
): Promise<SubscriptionPayment[]> {
  const payments: SubscriptionPayment[] = [];
  
  try {
    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(
      sealMint,
      userWallet,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    // Get platform's token account
    const platformTokenAccount = await getAssociatedTokenAddress(
      sealMint,
      platformWallet,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );
    
    const userTokenAccountStr = userTokenAccount.toString();
    const platformTokenAccountStr = platformTokenAccount.toString();
    const sealMintStr = sealMint.toString();
    
    // Get transaction signatures for the user's wallet
    const signatures = await connection.getSignaturesForAddress(userWallet, {
      limit: 100,
    });
    
    // Check each transaction for SEAL token transfers to platform wallet
    for (const sigInfo of signatures) {
      try {
        // Use parsed transaction for better token transfer detection
        const tx = await connection.getParsedTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (!tx || !tx.transaction) continue;
        
        // Check all instructions in the transaction
        const instructions = tx.transaction.message.instructions;
        
        for (const ix of instructions) {
          // Check if this is a parsed SPL token transfer
          if ('parsed' in ix && ix.program === 'spl-token' && ix.parsed.type === 'transfer') {
            const info = ix.parsed.info;
            
            // Check if source is user's token account and destination is platform's token account
            if (
              info.source === userTokenAccountStr &&
              info.destination === platformTokenAccountStr
            ) {
              // Parse amount (comes as string from parsed transaction)
              const amountStr = info.amount || info.tokenAmount?.amount || '0';
              const amount = BigInt(amountStr);
              
              // Only consider payments that match subscription amounts (Basic or Pro)
              const amountInSeal = Number(amount) / Math.pow(10, SEAL_TOKEN_CONFIG.decimals);
              
              if (amountInSeal >= SUBSCRIPTION_TIERS.basic.minPayment) {
                payments.push({
                  signature: sigInfo.signature,
                  amount,
                  timestamp: sigInfo.blockTime ? sigInfo.blockTime * 1000 : Date.now(),
                  from: userWallet.toString(),
                  to: platformWallet.toString(),
                });
              }
            }
          }
        }
      } catch (txError) {
        // Skip transactions that can't be parsed
        continue;
      }
    }
  } catch (error) {
    console.error('Error checking subscription payments:', error);
  }
  
  return payments.sort((a, b) => b.timestamp - a.timestamp); // Sort by most recent first
}

/**
 * Determine subscription tier and status from payment history
 */
function determineSubscriptionStatus(
  payments: SubscriptionPayment[]
): SubscriptionStatus {
  if (payments.length === 0) {
    return {
      hasActiveSubscription: false,
      tier: null,
      lastPaymentDate: null,
      nextPaymentDue: null,
      totalPaid: BigInt(0),
      payments: [],
    };
  }
  
  // Get most recent payment
  const mostRecentPayment = payments[0];
  const paymentTimestamp = mostRecentPayment.timestamp;
  const now = Date.now();
  
  // Check if subscription is still active (within 30 days of last payment)
  const timeSinceLastPayment = now - paymentTimestamp;
  const isActive = timeSinceLastPayment < SUBSCRIPTION_PERIOD_MS;
  
  // Determine tier based on payment amount
  const amountInSeal = Number(mostRecentPayment.amount) / Math.pow(10, SEAL_TOKEN_CONFIG.decimals);
  let tier: 'free' | 'basic' | 'pro' | null = null;
  
  if (amountInSeal >= SUBSCRIPTION_TIERS.pro.minPayment) {
    tier = 'pro';
  } else if (amountInSeal >= SUBSCRIPTION_TIERS.basic.minPayment) {
    tier = 'basic';
  } else {
    tier = 'free';
  }
  
  // Calculate total paid
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, BigInt(0));
  
  // Calculate next payment due date
  const nextPaymentDue = isActive 
    ? paymentTimestamp + SUBSCRIPTION_PERIOD_MS 
    : null;
  
  return {
    hasActiveSubscription: isActive && tier !== 'free',
    tier: isActive ? tier : null,
    lastPaymentDate: paymentTimestamp,
    nextPaymentDue,
    totalPaid,
    payments,
  };
}

/**
 * GET /api/verisol/subscription/verify?wallet=<address>
 * Check subscription status for a wallet
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
        { error: addressValidation.error || 'Invalid wallet address format' },
        { status: 400 }
      );
    }
    
    const userWallet = new PublicKey(walletAddress);
    const platformWallet = getPlatformWallet();
    
    if (!platformWallet) {
      return NextResponse.json(
        { error: 'Platform wallet not configured. Please set NEXT_PUBLIC_PLATFORM_FEE_ADDRESS or NEXT_PUBLIC_TREASURY_ADDRESS' },
        { status: 500 }
      );
    }
    
    // Get SEAL mint address
    const sealMint = getSealMintAddress();
    if (!sealMint) {
      return NextResponse.json(
        { error: 'SEAL token not initialized' },
        { status: 500 }
      );
    }
    
    // Get RPC endpoint
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_RPC_URL || 
                   (process.env.NEXT_PUBLIC_HELIUS_API_KEY 
                     ? `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
                     : 'https://api.devnet.solana.com');
    
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Check subscription payments
    const payments = await checkSubscriptionPayments(
      connection,
      userWallet,
      platformWallet,
      sealMint
    );
    
    // Determine subscription status
    const status = determineSubscriptionStatus(payments);
    
    return NextResponse.json({
      wallet: walletAddress,
      platformWallet: platformWallet.toString(),
      subscription: status,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error verifying subscription:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        wallet: request.nextUrl.searchParams.get('wallet') || null,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/verisol/subscription/verify
 * Verify subscription and mint cNFT if eligible
 * Body: { wallet: string }
 */
export async function POST(request: NextRequest) {
  try {
    let body;
    let walletAddress: string | null = null;
    
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    const { wallet } = body;
    walletAddress = wallet || null;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required in request body' },
        { status: 400 }
      );
    }
    
    // Validate wallet address
    const addressValidation = validateSolanaAddress(walletAddress);
    if (!addressValidation.valid) {
      return NextResponse.json(
        { error: addressValidation.error || 'Invalid wallet address format' },
        { status: 400 }
      );
    }
    
    const userWallet = new PublicKey(walletAddress);
    const platformWallet = getPlatformWallet();
    
    if (!platformWallet) {
      return NextResponse.json(
        { error: 'Platform wallet not configured' },
        { status: 500 }
      );
    }
    
    // Get SEAL mint address
    const sealMint = getSealMintAddress();
    if (!sealMint) {
      return NextResponse.json(
        { error: 'SEAL token not initialized' },
        { status: 500 }
      );
    }
    
    // Get RPC endpoint
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_DEVNET || 
                   process.env.NEXT_PUBLIC_RPC_URL || 
                   (process.env.NEXT_PUBLIC_HELIUS_API_KEY 
                     ? `https://devnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
                     : 'https://api.devnet.solana.com');
    
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Check subscription payments
    const payments = await checkSubscriptionPayments(
      connection,
      userWallet,
      platformWallet,
      sealMint
    );
    
    // Determine subscription status
    const status = determineSubscriptionStatus(payments);
    
    // If no active subscription, return status without minting
    if (!status.hasActiveSubscription || !status.tier || status.tier === 'free') {
      return NextResponse.json({
        wallet: walletAddress,
        subscription: status,
        minted: false,
        reason: 'No active subscription found',
        checkedAt: new Date().toISOString(),
      });
    }
    
    // Check if attestation program is deployed
    const isDeployed = await checkAttestationProgramDeployed(connection);
    if (!isDeployed) {
      return NextResponse.json({
        wallet: walletAddress,
        subscription: status,
        minted: false,
        reason: 'Attestation program not deployed',
        checkedAt: new Date().toISOString(),
      });
    }
    
    // Map subscription tier to attestation tier
    // For subscription-based attestations, we'll use a different tier system
    const tierInfo = {
      basic: { tier: 1, name: 'Basic Subscriber', rarity: 'Common', color: '#3B82F6' },
      pro: { tier: 2, name: 'Pro Subscriber', rarity: 'Rare', color: '#8B5CF6' },
    };
    
    const subscriptionTierInfo = tierInfo[status.tier];
    
    // Create metadata for subscription attestation
    const metadata = {
      name: `Sealevel Studio ${subscriptionTierInfo.name}`,
      symbol: `SUB-${status.tier.toUpperCase().slice(0, 1)}`,
      uri: `https://sealevel.studio/metadata/subscription-${status.tier}.json`,
      attributes: [
        { trait_type: 'Type', value: 'Subscription' },
        { trait_type: 'Tier', value: subscriptionTierInfo.name },
        { trait_type: 'Rarity', value: subscriptionTierInfo.rarity },
        { trait_type: 'Platform', value: 'Sealevel Studio' },
        { trait_type: 'Subscription Tier', value: status.tier },
        { trait_type: 'Last Payment', value: status.lastPaymentDate ? new Date(status.lastPaymentDate).toISOString() : 'N/A' },
      ],
    };
    
    // Note: Actual minting requires wallet signature, so this endpoint returns
    // the verification status and metadata. The client should call the mint endpoint
    // with the wallet connected.
    return NextResponse.json({
      wallet: walletAddress,
      subscription: status,
      minted: false, // Client must call mint endpoint with wallet
      eligible: true,
      tier: subscriptionTierInfo,
      metadata,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error verifying subscription for minting:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
        wallet: walletAddress || null,
      },
      { status: 500 }
    );
  }
}

