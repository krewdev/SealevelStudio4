/**
 * Transparent commitment system to reduce trust assumptions
 * Makes commitment generation auditable and verifiable
 */

import { createUsageCommitment, UsageCommitment, CommitmentProof } from './commitment-proof';

/**
 * Commitment generation parameters (public/transparent)
 */
export interface CommitmentParams {
  algorithm: 'sha256'; // Hash algorithm used
  format: string; // Format: 'usageCount:walletAddress:salt'
  threshold: number; // Minimum usage required
}

/**
 * Public commitment parameters (should be published on-chain or in metadata)
 */
export const COMMITMENT_PARAMS: CommitmentParams = {
  algorithm: 'sha256',
  format: 'usageCount:walletAddress:salt',
  threshold: 10,
};

/**
 * Verify that a commitment was generated correctly
 * Users can call this to verify their commitment matches the system's
 */
export function verifyCommitmentGeneration(
  usageCount: number,
  walletAddress: string,
  salt: string,
  expectedCommitment: string
): { valid: boolean; error?: string } {
  // Generate commitment using public parameters
  const commitment = createUsageCommitment(usageCount, walletAddress, salt);
  
  // Verify it matches expected
  if (commitment.commitment !== expectedCommitment) {
    return {
      valid: false,
      error: 'Commitment does not match expected value. Generation may be incorrect.',
    };
  }
  
  // Verify usage meets threshold
  if (usageCount < COMMITMENT_PARAMS.threshold) {
    return {
      valid: false,
      error: `Usage count (${usageCount}) does not meet threshold (${COMMITMENT_PARAMS.threshold})`,
    };
  }
  
  return { valid: true };
}

/**
 * Generate commitment with verification
 * This allows users to verify their commitment is correct
 */
export function generateVerifiableCommitment(
  usageCount: number,
  walletAddress: string,
  salt?: string
): {
  commitment: CommitmentProof;
  verification: {
    algorithm: string;
    format: string;
    threshold: number;
    usageMeetsThreshold: boolean;
  };
} {
  const commitment = createUsageCommitment(usageCount, walletAddress, salt);
  
  return {
    commitment: {
      commitment: commitment.commitment,
      salt: commitment.salt,
      walletAddress: commitment.walletAddress,
      timestamp: Date.now(),
    },
    verification: {
      algorithm: COMMITMENT_PARAMS.algorithm,
      format: COMMITMENT_PARAMS.format,
      threshold: COMMITMENT_PARAMS.threshold,
      usageMeetsThreshold: usageCount >= COMMITMENT_PARAMS.threshold,
    },
  };
}

/**
 * Audit commitment generation
 * Can be used to verify system is generating commitments correctly
 */
export function auditCommitmentGeneration(
  testCases: Array<{
    usageCount: number;
    walletAddress: string;
    salt: string;
    expectedCommitment: string;
  }>
): {
  allValid: boolean;
  results: Array<{
    valid: boolean;
    error?: string;
  }>;
} {
  const results = testCases.map(testCase =>
    verifyCommitmentGeneration(
      testCase.usageCount,
      testCase.walletAddress,
      testCase.salt,
      testCase.expectedCommitment
    )
  );
  
  const allValid = results.every(r => r.valid);
  
  return {
    allValid,
    results,
  };
}

/**
 * Get commitment parameters for transparency
 * Should be published on-chain or in metadata
 */
export function getCommitmentParameters(): CommitmentParams {
  return COMMITMENT_PARAMS;
}

