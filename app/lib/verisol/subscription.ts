// VeriSol Subscription Verification
// Client-side functions for checking subscription status and minting subscription attestations

import { Connection, PublicKey } from '@solana/web3.js';
import { mintSubscriptionAttestation, MintSubscriptionAttestationParams } from './mint';
import type { WalletContextState } from '@solana/wallet-adapter-react';

export interface SubscriptionVerificationResult {
  wallet: string;
  platformWallet: string;
  subscription: {
    hasActiveSubscription: boolean;
    tier: 'free' | 'basic' | 'pro' | null;
    lastPaymentDate: number | null;
    nextPaymentDue: number | null;
    totalPaid: bigint;
    payments: Array<{
      signature: string;
      amount: bigint;
      timestamp: number;
      from: string;
      to: string;
    }>;
  };
  checkedAt: string;
}

export interface SubscriptionMintResult {
  wallet: string;
  subscription: SubscriptionVerificationResult['subscription'];
  minted: boolean;
  eligible: boolean;
  tier?: {
    tier: number;
    name: string;
    rarity: string;
    color: string;
  };
  metadata?: {
    name: string;
    symbol: string;
    uri: string;
    attributes: Array<{ trait_type: string; value: string }>;
  };
  checkedAt: string;
}

/**
 * Check subscription status for a wallet
 * @param walletAddress - The wallet address to check
 * @returns Promise with subscription verification results
 */
export async function checkSubscriptionStatus(
  walletAddress: string
): Promise<SubscriptionVerificationResult> {
  try {
    const response = await fetch(
      `/api/verisol/subscription/verify?wallet=${encodeURIComponent(walletAddress)}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid')) {
      throw new Error(`Invalid wallet address: ${walletAddress}`);
    }
    throw error;
  }
}

/**
 * Verify subscription and get mint eligibility
 * @param walletAddress - The wallet address to verify
 * @returns Promise with subscription status and mint eligibility
 */
export async function verifySubscriptionForMint(
  walletAddress: string
): Promise<SubscriptionMintResult> {
  try {
    const response = await fetch('/api/verisol/subscription/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ wallet: walletAddress }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid')) {
      throw new Error(`Invalid wallet address: ${walletAddress}`);
    }
    throw error;
  }
}

/**
 * Mint subscription attestation cNFT
 * @param params - Minting parameters
 * @returns Promise with transaction signature
 */
export async function mintSubscriptionAttestationCNFT(
  connection: Connection,
  wallet: WalletContextState,
  subscriptionTier: 'basic' | 'pro'
): Promise<string> {
  if (!wallet.publicKey) {
    throw new Error('Wallet not connected');
  }

  // First verify subscription status
  const verification = await verifySubscriptionForMint(wallet.publicKey.toString());
  
  if (!verification.eligible || !verification.subscription.hasActiveSubscription) {
    throw new Error('Wallet does not have an active subscription');
  }

  // Verify tier matches
  if (verification.subscription.tier !== subscriptionTier) {
    throw new Error(
      `Subscription tier mismatch. Expected ${subscriptionTier}, but wallet has ${verification.subscription.tier || 'no subscription'}`
    );
  }

  // Mint the attestation
  return await mintSubscriptionAttestation({
    connection,
    wallet,
    subscriptionTier,
  });
}

