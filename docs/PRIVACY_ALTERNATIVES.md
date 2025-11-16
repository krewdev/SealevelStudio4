# Privacy-Preserving Alternatives to ZK Proofs

## Overview

While ZK proofs provide strong privacy guarantees, they can be computationally expensive and complex to set up. This document explores faster alternatives that still maintain privacy for beta tester attestations.

## Use Case Requirements

For beta tester attestations, we need to:
1. **Prove** that a user has sufficient usage (≥ 10 features)
2. **Keep private** the actual usage count and which features were used
3. **Verify on-chain** without revealing private data
4. **Be fast** for good user experience

## Alternative Approaches

### 1. Hash-Based Commitments (Recommended for Speed)

**How it works:**
- User commits to their usage data with a cryptographic hash
- On-chain verification checks if the commitment matches expected values
- Fast verification (single hash check)

**Privacy:**
- ✅ Hides actual usage count
- ✅ Hides which features were used
- ⚠️ Requires pre-computation of valid commitments

**Implementation:**
```typescript
// Client-side: Create commitment
const commitment = hash(usageCount + salt + walletAddress);

// On-chain: Verify commitment matches threshold
function verifyCommitment(commitment: bytes, threshold: number): bool {
  // Check if commitment is in valid set (pre-computed)
  return validCommitments.contains(commitment);
}
```

**Pros:**
- ⚡ Very fast verification (O(1))
- 🔒 Privacy-preserving (hash is one-way)
- 💰 Low gas costs
- 🛠️ Simple to implement

**Cons:**
- ⚠️ Requires maintaining a set of valid commitments
- ⚠️ Less flexible than ZK proofs

---

### 2. Merkle Tree with Private Leaves

**How it works:**
- Store hashed usage data in a Merkle tree
- User provides Merkle proof of membership
- Verify proof without revealing other leaves

**Privacy:**
- ✅ Hides other users' data
- ✅ Hides exact usage count (if hashed)
- ✅ Proves membership without revealing position

**Implementation:**
```typescript
// Server: Build Merkle tree of valid users
const tree = new MerkleTree(validUserHashes);

// Client: Get Merkle proof
const proof = tree.getProof(userHash);

// On-chain: Verify Merkle proof
function verifyMerkleProof(
  leaf: bytes,
  proof: bytes[],
  root: bytes
): bool {
  return verifyMerklePath(leaf, proof, root);
}
```

**Pros:**
- ⚡ Fast verification (O(log n))
- 🔒 Privacy-preserving
- 📊 Efficient for large sets
- ✅ Standard cryptographic primitive

**Cons:**
- ⚠️ Requires maintaining Merkle tree
- ⚠️ Tree updates can be complex

---

### 3. Signature-Based Attestations

**How it works:**
- Trusted server signs a message attesting to user's eligibility
- User presents signature for on-chain verification
- Fast signature verification

**Privacy:**
- ✅ Hides usage data (not included in signed message)
- ✅ Server doesn't need to store full usage data
- ⚠️ Requires trusted server

**Implementation:**
```typescript
// Server: Sign attestation
const message = hash(walletAddress + "beta-tester" + timestamp);
const signature = sign(message, serverPrivateKey);

// On-chain: Verify signature
function verifyAttestation(
  message: bytes,
  signature: bytes,
  serverPublicKey: PublicKey
): bool {
  return verifySignature(message, signature, serverPublicKey);
}
```

**Pros:**
- ⚡ Very fast verification
- 🔒 Privacy-preserving (no data in message)
- 💰 Low gas costs
- 🛠️ Simple to implement

**Cons:**
- ⚠️ Requires trusted server
- ⚠️ Centralization concern
- ⚠️ Server must verify usage before signing

---

### 4. Range Proofs (Simpler Cryptography)

**How it works:**
- Use simpler cryptographic primitives (e.g., Pedersen commitments)
- Prove value is in range without revealing exact value
- Faster than full ZK but still provides privacy

**Privacy:**
- ✅ Hides exact usage count
- ✅ Proves it's ≥ threshold
- ✅ No trusted setup needed (for some schemes)

**Implementation:**
```typescript
// Client: Create range proof
const commitment = pedersenCommit(usageCount, randomness);
const proof = proveRange(commitment, minThreshold, maxThreshold);

// On-chain: Verify range proof
function verifyRangeProof(
  commitment: bytes,
  proof: bytes,
  min: number
): bool {
  return verifyRange(commitment, proof, min);
}
```

**Pros:**
- ⚡ Faster than full ZK proofs
- 🔒 Privacy-preserving
- ✅ No trusted setup (for some schemes)
- 📊 More flexible than commitments

**Cons:**
- ⚠️ Still more complex than simple hashes
- ⚠️ Larger proof size than commitments

---

### 5. Blind Signatures

**How it works:**
- User blinds their credential
- Server blindly signs it (can't see content)
- User unblinds signature and presents for verification

**Privacy:**
- ✅ Server never sees actual usage data
- ✅ User can prove they have valid signature
- ✅ Strong privacy guarantees

**Implementation:**
```typescript
// Client: Blind credential
const blindedCredential = blind(usageData, blindingFactor);

// Server: Blind sign (doesn't see content)
const blindSignature = blindSign(blindedCredential, serverKey);

// Client: Unblind signature
const signature = unblind(blindSignature, blindingFactor);

// On-chain: Verify signature
function verifyBlindSignature(
  credential: bytes,
  signature: bytes,
  serverPublicKey: PublicKey
): bool {
  return verifySignature(credential, signature, serverPublicKey);
}
```

**Pros:**
- 🔒 Strong privacy (server never sees data)
- ⚡ Fast verification
- ✅ Decentralized (after initial signing)

**Cons:**
- ⚠️ Requires trusted server for signing
- ⚠️ More complex than simple signatures

---

## Comparison Matrix

| Approach | Speed | Privacy | Complexity | Trust Required | Gas Cost |
|----------|-------|---------|------------|----------------|----------|
| **ZK Proofs** | Slow | ⭐⭐⭐⭐⭐ | High | None | High |
| **Hash Commitments** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Low | None | Low |
| **Merkle Proofs** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Medium | None | Medium |
| **Signatures** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Low | Server | Low |
| **Range Proofs** | ⭐⭐⭐ | ⭐⭐⭐⭐ | Medium | None | Medium |
| **Blind Signatures** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Medium | Server | Low |

## Recommended Approach: Hybrid Solution

For beta tester attestations, we recommend a **hybrid approach**:

### Phase 1: Hash-Based Commitments (Fast Path)
- For users with verified usage, create hash commitments
- Fast on-chain verification
- No trusted setup needed

### Phase 2: Merkle Tree (Scalable)
- Build Merkle tree of eligible users
- Users provide Merkle proofs
- Efficient for large-scale verification

### Phase 3: Optional ZK Proofs (Maximum Privacy)
- For users who want maximum privacy
- Slower but strongest privacy guarantees
- Can be added later when Circom issue is resolved

## Implementation Example: Hash Commitments

```typescript
// app/lib/verisol/commitment-proof.ts

import { createHash } from 'crypto';

export interface UsageCommitment {
  commitment: string; // Hash of usage data
  salt: string; // Random salt for privacy
  threshold: number; // Minimum usage required
}

/**
 * Create a privacy-preserving commitment to usage data
 */
export function createUsageCommitment(
  usageCount: number,
  walletAddress: string,
  salt?: string
): UsageCommitment {
  const randomSalt = salt || generateRandomSalt();
  const data = `${usageCount}:${walletAddress}:${randomSalt}`;
  const commitment = createHash('sha256').update(data).digest('hex');
  
  return {
    commitment,
    salt: randomSalt,
    threshold: 10, // Minimum usage
  };
}

/**
 * Verify commitment matches threshold (on-chain)
 * This would be implemented in the Solana program
 */
export function verifyCommitment(
  commitment: string,
  threshold: number,
  validCommitments: Set<string>
): boolean {
  // Check if commitment is in valid set
  // Valid commitments are pre-computed for users meeting threshold
  return validCommitments.has(commitment);
}

/**
 * Generate valid commitments for users meeting threshold
 * This runs server-side or during attestation creation
 */
export function generateValidCommitments(
  eligibleUsers: Array<{ wallet: string; usage: number }>
): Set<string> {
  const validCommitments = new Set<string>();
  
  for (const user of eligibleUsers) {
    if (user.usage >= 10) {
      // Generate commitment (salt can be deterministic or random)
      const commitment = createUsageCommitment(
        user.usage,
        user.wallet
      );
      validCommitments.add(commitment.commitment);
    }
  }
  
  return validCommitments;
}
```

## Migration Path

1. **Immediate**: Implement hash-based commitments
   - Fast to implement
   - Provides privacy
   - No ZK circuit needed

2. **Short-term**: Add Merkle tree support
   - More scalable
   - Better for large user bases
   - Standard approach

3. **Long-term**: Add ZK proofs (when ready)
   - Maximum privacy
   - No trusted setup
   - Can coexist with other methods

## Security Considerations

### Hash Commitments
- ✅ One-way function (can't reverse hash)
- ⚠️ Need to protect salt (store securely)
- ⚠️ Pre-computed commitments must be kept secret

### Merkle Proofs
- ✅ Standard cryptographic primitive
- ✅ Well-tested and secure
- ⚠️ Tree root must be trusted

### Signatures
- ✅ Standard cryptographic signatures
- ⚠️ Server key must be secure
- ⚠️ Centralization risk

## Conclusion

For beta tester attestations, **hash-based commitments** or **Merkle proofs** provide an excellent balance of:
- ⚡ Speed (much faster than ZK)
- 🔒 Privacy (hides usage data)
- 🛠️ Simplicity (easier to implement)
- 💰 Cost (lower gas fees)

ZK proofs can be added later for users who want maximum privacy guarantees, but aren't necessary for the core functionality.

