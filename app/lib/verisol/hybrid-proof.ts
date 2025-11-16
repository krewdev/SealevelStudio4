/**
 * Hybrid proof system: Supports both ZK proofs and hash commitments
 * Allows users to choose between maximum privacy (ZK) or speed (commitments)
 * 
 * TRUST MODEL:
 * - ZK Proofs: Trustless (user generates proof, no trusted party)
 * - Commitments: Requires trust in system operator (generates valid commitments)
 * 
 * The hybrid system automatically selects the best available method:
 * - Prefers ZK proofs for trustlessness
 * - Falls back to commitments for speed (when ZK unavailable)
 */

import { generateBetaTesterAttestationProof } from './beta-tester-proof';
import { createCommitmentFromUsage, CommitmentProof } from './commitment-proof';

export type ProofType = 'zk' | 'commitment' | 'auto';

export interface HybridProofResult {
  type: 'zk' | 'commitment';
  proof: any; // ZK proof or commitment proof
  publicSignals?: any[]; // For ZK proofs
  commitment?: CommitmentProof; // For commitment proofs
}

/**
 * Generate proof using best available method
 * - Tries ZK proof first (if circuit available)
 * - Falls back to commitment if ZK fails
 */
export async function generateHybridProof(
  usageStats: {
    totalUsage: number;
    features: Record<string, number>;
  },
  walletAddress: string,
  preferredType: ProofType = 'auto'
): Promise<HybridProofResult> {
  // If user prefers commitment or ZK is not available, use commitment
  if (preferredType === 'commitment') {
    const commitment = createCommitmentFromUsage(usageStats, walletAddress);
    return {
      type: 'commitment',
      proof: commitment,
      commitment,
    };
  }

  // Try ZK proof first (if preferred or auto)
  if (preferredType === 'zk' || preferredType === 'auto') {
    try {
      const zkProof = await generateBetaTesterAttestationProof({
        walletAddress,
        actualUsage: usageStats.totalUsage,
        minUsageThreshold: 10,
        usageProof: 1, // Placeholder
      });

      // Check if we got a real ZK proof or fallback
      if (zkProof.proof && zkProof.proof.pi_a && zkProof.proof.pi_a.length > 0) {
        return {
          type: 'zk',
          proof: zkProof.proof,
          publicSignals: zkProof.publicSignals,
        };
      }
    } catch (error) {
      console.warn('ZK proof generation failed, falling back to commitment:', error);
    }
  }

  // Fallback to commitment
  const commitment = createCommitmentFromUsage(usageStats, walletAddress);
  return {
    type: 'commitment',
    proof: commitment,
    commitment,
  };
}

/**
 * Serialize hybrid proof for Solana transaction
 */
export function serializeHybridProof(result: HybridProofResult): {
  proofType: Buffer; // 1 byte: 0 = ZK, 1 = commitment
  proofData: Buffer;
  publicInputs?: Buffer;
} {
  if (result.type === 'zk') {
    // ZK proof format
    const proofType = Buffer.from([0]);
    // Serialize ZK proof (would need actual serialization logic)
    const proofData = Buffer.from(JSON.stringify(result.proof));
    const publicInputs = result.publicSignals
      ? Buffer.from(JSON.stringify(result.publicSignals))
      : undefined;

    return {
      proofType,
      proofData,
      publicInputs,
    };
  } else {
    // Commitment format
    const proofType = Buffer.from([1]);
    const proofData = Buffer.from(JSON.stringify(result.commitment));

    return {
      proofType,
      proofData,
    };
  }
}

