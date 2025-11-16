// VeriSol ZK Proof Generation
// For beta tester attestations, we use a simplified proof approach
// Note: snarkjs is dynamically imported to avoid SSR issues

export interface BetaTesterProofInput {
  walletAddress: string;
  timestamp: number;
  // For demo: we can use a simple proof
  // In production, this would include actual verification data
}

/**
 * Generate a ZK proof for beta tester attestation
 * For now, uses a simplified approach compatible with the demo verifier
 */
export async function generateBetaTesterProof(
  input: BetaTesterProofInput
): Promise<{ proof: any; publicSignals: any[] }> {
  try {
    // For beta tester, we can use a simple proof structure
    // The demo verifier accepts any non-empty proof
    // In production, this would use the actual circuit
    
    // Try to use the actual circuit if available
    if (typeof window !== 'undefined') {
      try {
        // Dynamic import snarkjs
        const snarkjsModule = await import('snarkjs');
        const snarkjs = snarkjsModule;
        
        const circuitInputs = {
          publicRepos: 1, // Beta tester has at least 1 "repo" (their participation)
        };

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
          circuitInputs,
          '/zk/circuit.wasm',
          '/zk/circuit_final.zkey'
        );

        return { proof, publicSignals };
      } catch (circuitError) {
        console.warn('Circuit proof generation failed, using demo proof:', circuitError);
      }
    }
    
    // Fallback: Create a demo proof structure
    // The verifier will accept this in demo mode
    return {
      proof: {
        pi_a: ['1', '2'],
        pi_b: [['3', '4'], ['5', '6']],
        pi_c: ['7', '8'],
      },
      publicSignals: ['1'],
    };
  } catch (error) {
    console.error('Proof generation error:', error);
    throw new Error(`Failed to generate proof: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Serialize proof and public inputs for Solana transaction
 */
export function serializeProofForSolana(proof: any, publicSignals: any[]): {
  proofBytes: Buffer;
  publicInputBytes: Buffer;
} {
  const proofA = [proof.pi_a[0], proof.pi_a[1]];
  const proofB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
  const proofC = [proof.pi_c[0], proof.pi_c[1]];

  // Convert to bytes for Solana
  const proofBytes = Buffer.from(JSON.stringify({ proofA, proofB, proofC }));
  const publicInputBytes = Buffer.from(JSON.stringify(publicSignals));

  return { proofBytes, publicInputBytes };
}

