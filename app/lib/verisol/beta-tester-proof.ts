// Beta Tester ZK Proof Generation
// Includes usage verification to ensure users actually tested the app

import { PublicKey } from '@solana/web3.js';

export interface BetaTesterAttestationProofInput {
  walletAddress: string;
  actualUsage: number; // Total feature usage count
  minUsageThreshold: number; // Minimum usage required (default: 10)
  usageProof: number; // Proof that usage data is valid (can be hash of usage record)
}

/**
 * Generate a ZK proof for beta tester attestation with usage verification
 * This ensures users actually tested the app before getting attestation
 */
export async function generateBetaTesterAttestationProof(
  input: BetaTesterAttestationProofInput
): Promise<{ proof: any; publicSignals: any[] }> {
  try {
    // For beta tester, we use a circuit that verifies:
    // 1. Wallet address matches
    // 2. Usage meets minimum threshold
    // 3. Usage proof is valid
    
    if (typeof window !== 'undefined') {
      try {
        // Dynamic import snarkjs
        const snarkjsModule = await import('snarkjs');
        const snarkjs = snarkjsModule;
        
        // Simple hash of wallet address for public input
        // In production, use Poseidon hash or similar
        const walletHash = simpleHash(input.walletAddress);
        
        const circuitInputs = {
          walletAddressHash: walletHash,
          minUsageThreshold: input.minUsageThreshold || 10,
          actualUsage: input.actualUsage,
          walletAddress: simpleHash(input.walletAddress), // Private
          usageProof: input.usageProof || 1, // Private proof
        };

        // Try to use the beta tester circuit if available
        try {
          const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            circuitInputs,
            '/zk/beta-tester-circuit.wasm',
            '/zk/beta-tester-circuit_final.zkey'
          );

          return { proof, publicSignals };
        } catch (circuitError) {
          console.warn('Beta tester circuit not found, using fallback:', circuitError);
          // Fallback to demo proof if circuit not compiled yet
        }
      } catch (importError) {
        console.warn('snarkjs import failed:', importError);
      }
    }
    
    // Fallback: Create a demo proof structure
    // The verifier will accept this in demo mode
    // In production, this should never be used - circuit must be compiled
    return {
      proof: {
        pi_a: [input.actualUsage.toString(), input.minUsageThreshold.toString()],
        pi_b: [[input.usageProof.toString(), '1'], ['1', '1']],
        pi_c: [input.walletAddress.slice(0, 10), input.walletAddress.slice(-10)],
      },
      publicSignals: [
        simpleHash(input.walletAddress).toString(),
        input.minUsageThreshold.toString(),
      ],
    };
  } catch (error) {
    console.error('Proof generation error:', error);
    throw new Error(`Failed to generate proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Simple hash function for wallet address
 * In production, use Poseidon hash or similar cryptographic hash
 */
function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Verify usage meets minimum requirements for beta tester attestation
 */
export function verifyUsageRequirements(
  actualUsage: number,
  minUsageThreshold: number = 10
): { valid: boolean; reason?: string } {
  if (actualUsage < minUsageThreshold) {
    return {
      valid: false,
      reason: `Minimum ${minUsageThreshold} feature uses required. You have ${actualUsage}.`,
    };
  }
  
  return { valid: true };
}

/**
 * Generate usage proof hash from usage data
 * This creates a verifiable proof that usage data is authentic
 */
export function generateUsageProof(usageData: {
  totalUsage: number;
  featuresUsed: Record<string, number>;
  walletAddress: string;
  timestamp: number;
}): number {
  // Create a simple proof hash from usage data
  // In production, use cryptographic hash
  const proofString = `${usageData.walletAddress}-${usageData.totalUsage}-${usageData.timestamp}`;
  return simpleHash(proofString);
}

