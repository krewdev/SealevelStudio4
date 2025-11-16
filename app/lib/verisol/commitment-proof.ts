/**
 * Hash-based commitment system for privacy-preserving usage verification
 * Alternative to ZK proofs that is faster and simpler while maintaining privacy
 * 
 * ⚠️ TRUST MODEL: This approach requires trust in the system operator who generates
 * valid commitments. For trustless verification, use ZK proofs instead.
 * 
 * To reduce trust:
 * 1. Make commitment generation transparent (publish algorithm)
 * 2. Use Merkle tree of commitments (publish root on-chain)
 * 3. Allow users to verify their own commitments
 * 4. Consider on-chain usage verification
 */

import { createHash } from 'crypto';

export interface UsageCommitment {
  commitment: string; // Hash of usage data (SHA-256)
  salt: string; // Random salt for privacy (hex)
  threshold: number; // Minimum usage required
  walletAddress: string; // Wallet address (for verification)
}

export interface CommitmentProof {
  commitment: string;
  salt: string;
  walletAddress: string;
  timestamp: number;
}

/**
 * Generate a random salt for commitment
 */
function generateRandomSalt(): string {
  return createHash('sha256')
    .update(Math.random().toString() + Date.now().toString())
    .digest('hex')
    .slice(0, 32); // 32 hex chars = 16 bytes
}

/**
 * Create a privacy-preserving commitment to usage data
 * The commitment hides the actual usage count while allowing verification
 */
export function createUsageCommitment(
  usageCount: number,
  walletAddress: string,
  salt?: string
): UsageCommitment {
  const randomSalt = salt || generateRandomSalt();
  
  // Create commitment: hash(usageCount:walletAddress:salt)
  // This hides the actual usage count while allowing verification
  const data = `${usageCount}:${walletAddress}:${randomSalt}`;
  const commitment = createHash('sha256')
    .update(data)
    .digest('hex');
  
  return {
    commitment,
    salt: randomSalt,
    threshold: 10, // Minimum usage required for beta tester
    walletAddress,
  };
}

/**
 * Verify that a commitment is valid (matches expected format)
 * Note: This doesn't verify the usage count, just the commitment format
 * Actual verification happens on-chain by checking against valid commitments set
 */
export function validateCommitmentFormat(
  commitment: UsageCommitment
): { valid: boolean; error?: string } {
  if (!commitment.commitment || commitment.commitment.length !== 64) {
    return { valid: false, error: 'Invalid commitment format' };
  }
  
  if (!commitment.salt || commitment.salt.length < 16) {
    return { valid: false, error: 'Invalid salt format' };
  }
  
  if (!commitment.walletAddress) {
    return { valid: false, error: 'Wallet address required' };
  }
  
  return { valid: true };
}

/**
 * Create a commitment proof for on-chain verification
 * This is what gets sent to the Solana program
 */
export function createCommitmentProof(
  usageCount: number,
  walletAddress: string,
  salt?: string
): CommitmentProof {
  const commitment = createUsageCommitment(usageCount, walletAddress, salt);
  
  return {
    commitment: commitment.commitment,
    salt: commitment.salt,
    walletAddress: commitment.walletAddress,
    timestamp: Date.now(),
  };
}

/**
 * Verify commitment matches a known valid commitment
 * This would be called on-chain or by a verification service
 */
export function verifyCommitment(
  proof: CommitmentProof,
  validCommitments: Set<string>
): { valid: boolean; error?: string } {
  // Validate format
  const formatCheck = validateCommitmentFormat({
    commitment: proof.commitment,
    salt: proof.salt,
    threshold: 10,
    walletAddress: proof.walletAddress,
  });
  
  if (!formatCheck.valid) {
    return formatCheck;
  }
  
  // Check if commitment is in valid set
  // Valid commitments are pre-computed for users meeting threshold
  if (!validCommitments.has(proof.commitment)) {
    return {
      valid: false,
      error: 'Commitment not found in valid set',
    };
  }
  
  return { valid: true };
}

/**
 * Generate valid commitments for users meeting threshold
 * This runs server-side or during attestation creation
 * 
 * @param eligibleUsers - Array of users with their usage counts
 * @param threshold - Minimum usage required (default: 10)
 * @returns Set of valid commitment hashes
 */
export function generateValidCommitments(
  eligibleUsers: Array<{ wallet: string; usage: number }>,
  threshold: number = 10
): Map<string, UsageCommitment> {
  const validCommitments = new Map<string, UsageCommitment>();
  
  for (const user of eligibleUsers) {
    if (user.usage >= threshold) {
      const commitment = createUsageCommitment(
        user.usage,
        user.wallet
      );
      // Store by commitment hash for fast lookup
      validCommitments.set(commitment.commitment, commitment);
    }
  }
  
  return validCommitments;
}

/**
 * Serialize commitment proof for Solana transaction
 */
export function serializeCommitmentProof(proof: CommitmentProof): {
  commitmentBytes: Buffer;
  saltBytes: Buffer;
  walletBytes: Buffer;
  timestampBytes: Buffer;
} {
  return {
    commitmentBytes: Buffer.from(proof.commitment, 'hex'),
    saltBytes: Buffer.from(proof.salt, 'hex'),
    walletBytes: Buffer.from(proof.walletAddress),
    timestampBytes: Buffer.allocUnsafe(8),
  };
}

/**
 * Deserialize commitment proof from Solana transaction
 */
export function deserializeCommitmentProof(data: Buffer): CommitmentProof {
  // This would parse the buffer based on the on-chain format
  // For now, return a placeholder structure
  return {
    commitment: data.slice(0, 32).toString('hex'),
    salt: data.slice(32, 48).toString('hex'),
    walletAddress: data.slice(48, 80).toString('utf-8'),
    timestamp: data.readUInt32BE(80),
  };
}

/**
 * Create commitment from usage statistics
 * This is the main function used in the attestation flow
 */
export function createCommitmentFromUsage(
  usageStats: {
    totalUsage: number;
    features: Record<string, number>;
  },
  walletAddress: string
): CommitmentProof {
  // Use total usage count for commitment
  // The actual breakdown of features is hidden
  return createCommitmentProof(
    usageStats.totalUsage,
    walletAddress
  );
}

