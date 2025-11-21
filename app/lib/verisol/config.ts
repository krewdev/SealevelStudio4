// Custom Attestation Program Configuration
// Replaces VeriSol with custom Anchor program
import { PublicKey } from '@solana/web3.js';

// Legacy VeriSol Program ID (deprecated, kept for backwards compatibility)
export const VERISOL_PROGRAM_ID = new PublicKey('mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6');

// Custom Attestation Program ID (use this instead)
export function getAttestationProgramId(): PublicKey | null {
  const envProgramId = process.env.NEXT_PUBLIC_ATTESTATION_PROGRAM_ID;
  if (envProgramId) {
    try {
      return new PublicKey(envProgramId);
    } catch {
      return null;
    }
  }
  return null;
}

// Bubblegum Program IDs (Metaplex)
export const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCbk68f37Gc5o4tBzLb');
export const COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');
export const LOG_WRAPPER = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');

// Merkle Tree and Tree Authority (will be set from environment or created)
// These should be set via environment variables or created via setup scripts
export function getMerkleTree(): PublicKey | null {
  const envTree = process.env.NEXT_PUBLIC_VERISOL_MERKLE_TREE;
  if (envTree) {
    try {
      return new PublicKey(envTree);
    } catch {
      return null;
    }
  }
  return null;
}

export function getTreeAuthority(): PublicKey | null {
  const envAuth = process.env.NEXT_PUBLIC_VERISOL_TREE_AUTHORITY;
  if (envAuth) {
    try {
      return new PublicKey(envAuth);
    } catch {
      return null;
    }
  }
  return null;
}

// Derive Tree Authority PDA from merkle tree
export function deriveTreeAuthority(merkleTree: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );
  return pda;
}

// Beta Tester specific configuration
export function getBetaTesterMerkleTree(): PublicKey | null {
  const envTree = process.env.NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE;
  if (envTree) {
    try {
      return new PublicKey(envTree);
    } catch {
      return null;
    }
  }
  // Fallback to general merkle tree if beta tester tree not set
  return getMerkleTree();
}

export function getBetaTesterCollectionId(): string | null {
  return process.env.NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID || null;
}

