// Client-side function to check if a wallet has a VeriSol attestation
import { PublicKey } from '@solana/web3.js';

export interface VeriSolAttestationCheck {
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
  } | null;
  checkedAt: string;
}

/**
 * Check if a wallet address has a VeriSol attestation cNFT
 * @param walletAddress - The wallet address to check
 * @returns Promise with attestation check results
 */
export async function checkVeriSolAttestation(
  walletAddress: string
): Promise<VeriSolAttestationCheck> {
  try {
    // Validate address
    const pubkey = new PublicKey(walletAddress);

    const response = await fetch(
      `/api/verisol/check?wallet=${encodeURIComponent(pubkey.toString())}`
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
 * Check multiple wallet addresses for VeriSol attestations
 * @param walletAddresses - Array of wallet addresses to check
 * @returns Promise with array of attestation check results
 */
export async function checkMultipleVeriSolAttestations(
  walletAddresses: string[]
): Promise<VeriSolAttestationCheck[]> {
  const checks = await Promise.allSettled(
    walletAddresses.map((addr) => checkVeriSolAttestation(addr))
  );

  return checks.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      // Return error result
      return {
        wallet: walletAddresses[index],
        hasAttestation: false,
        attestationTxSignature: null,
        attestationTimestamp: null,
        cNFTAddress: null,
        metadata: null,
        checkedAt: new Date().toISOString(),
      };
    }
  });
}

