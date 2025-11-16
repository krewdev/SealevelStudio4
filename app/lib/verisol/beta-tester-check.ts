// Client-side function to check if a wallet has a beta tester attestation
import { PublicKey } from '@solana/web3.js';

export interface BetaTesterAttestationCheck {
  wallet: string;
  hasAttestation: boolean;
  attestationTxSignature: string | null;
  attestationTimestamp: number | null;
  cNFTAddress: string | null;
  metadata: {
    name?: string;
    symbol?: string;
    uri?: string;
    description?: string;
    compression?: {
      tree?: string;
      leaf_id?: string;
    };
  } | null;
  merkleTree: string;
  checkedAt: string;
}

/**
 * Check if a wallet address has a beta tester attestation cNFT in the beta tester tree
 * @param walletAddress - The wallet address to check
 * @returns Promise with attestation check results
 */
export async function checkBetaTesterAttestation(
  walletAddress: string
): Promise<BetaTesterAttestationCheck> {
  try {
    // Validate address
    const pubkey = new PublicKey(walletAddress);

    const response = await fetch(
      `/api/verisol/beta-tester/check?wallet=${encodeURIComponent(pubkey.toString())}`
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

