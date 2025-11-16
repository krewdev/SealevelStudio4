# Trust Model Analysis

## Overview

Different privacy-preserving approaches have different trust assumptions. This document clarifies the trust model for each approach.

## Trust Comparison

### ZK Proofs (Trustless) ⭐⭐⭐⭐⭐

**Trust Required:** None

**How it works:**
- User generates proof locally from their own data
- Proof mathematically proves the statement without revealing data
- On-chain verifier checks proof validity (no trusted data needed)

**Trust Model:**
```
User → Generates Proof → On-chain Verifier
         (No trusted party)
```

**Pros:**
- ✅ Fully trustless
- ✅ User controls their own data
- ✅ No central authority needed
- ✅ Decentralized verification

**Cons:**
- ⚠️ Slower (computational cost)
- ⚠️ Requires circuit compilation
- ⚠️ Higher gas costs

---

### Hash Commitments (Trusted Authority) ⭐⭐

**Trust Required:** System operator must be trusted

**How it works:**
- System operator generates commitments for eligible users
- Valid commitments are stored on-chain or in a trusted set
- User presents commitment for verification
- On-chain checks if commitment is in valid set

**Trust Model:**
```
System Operator → Generates Commitments → Valid Set → On-chain Verifier
     (TRUSTED)         (for eligible users)    (trusted)
```

**Trust Assumptions:**
1. ⚠️ System operator only creates commitments for users who actually meet threshold
2. ⚠️ System operator doesn't create commitments for ineligible users
3. ⚠️ Valid commitments set is maintained correctly
4. ⚠️ System operator doesn't leak which commitments correspond to which users

**Pros:**
- ⚡ Very fast
- 💰 Low gas costs
- 🛠️ Simple to implement
- ✅ Privacy-preserving (hides usage data)

**Cons:**
- ⚠️ Requires trusted system operator
- ⚠️ Centralization risk
- ⚠️ System operator can create fake attestations

---

### Merkle Tree Proofs (Semi-Trustless) ⭐⭐⭐⭐

**Trust Required:** Tree root must be trusted (but can be transparent)

**How it works:**
- System builds Merkle tree of eligible users
- Tree root is published (can be on-chain)
- User provides Merkle proof of membership
- On-chain verifier checks proof against trusted root

**Trust Model:**
```
System Operator → Builds Tree → Publishes Root → On-chain Verifier
     (TRUSTED)      (transparent)    (trusted)      (checks proof)
```

**Trust Assumptions:**
1. ⚠️ System operator builds tree correctly (only eligible users)
2. ✅ Tree root is public/transparent (can be audited)
3. ✅ Users can verify their own inclusion
4. ⚠️ System operator doesn't add ineligible users

**Pros:**
- ⚡ Fast verification
- ✅ Transparent (tree root is public)
- ✅ Auditable (can verify tree construction)
- ✅ Privacy-preserving (hides other users)

**Cons:**
- ⚠️ Still requires trusted tree builder
- ⚠️ Tree updates require trust

---

### Signature-Based (Trusted Server) ⭐⭐

**Trust Required:** Server must be trusted

**How it works:**
- Server verifies user eligibility
- Server signs attestation
- User presents signature
- On-chain verifier checks signature

**Trust Model:**
```
Server → Verifies Eligibility → Signs → User → On-chain Verifier
(TRUSTED)    (trusted check)   (trusted)
```

**Trust Assumptions:**
1. ⚠️ Server correctly verifies eligibility
2. ⚠️ Server doesn't sign for ineligible users
3. ⚠️ Server key is secure
4. ⚠️ Server doesn't leak user data

**Pros:**
- ⚡ Very fast
- 💰 Low gas costs
- 🛠️ Simple

**Cons:**
- ⚠️ Fully centralized
- ⚠️ Single point of failure
- ⚠️ Server can create fake attestations

---

## Reducing Trust in Hash Commitments

### Option 1: Transparent Commitment Generation

**How it works:**
- Publish algorithm for generating commitments
- Make commitment generation process transparent
- Allow users to verify their own commitments

```typescript
// Transparent: Users can verify their commitment matches
const userCommitment = createUsageCommitment(usageCount, wallet, salt);
const systemCommitment = getCommitmentFromSystem(wallet);

// User can verify: userCommitment.commitment === systemCommitment
```

**Trust Reduction:**
- ✅ Users can verify their commitments are correct
- ✅ Algorithm is public and auditable
- ⚠️ Still requires trust that system only creates for eligible users

---

### Option 2: Merkle Tree of Commitments

**How it works:**
- Build Merkle tree of all valid commitments
- Publish tree root on-chain
- Users provide Merkle proof of their commitment

**Trust Reduction:**
- ✅ Tree root is public (can be audited)
- ✅ Users can verify their inclusion
- ✅ Can verify tree doesn't contain ineligible users
- ⚠️ Still requires trust in tree builder

---

### Option 3: Multi-Signature Commitments

**How it works:**
- Multiple parties sign commitments
- Requires threshold signatures (e.g., 3 of 5)
- Reduces single point of failure

**Trust Reduction:**
- ✅ Requires multiple parties to collude
- ✅ More decentralized
- ⚠️ Still requires trust in signers

---

### Option 4: On-Chain Usage Verification

**How it works:**
- Store usage data on-chain (encrypted or hashed)
- On-chain program verifies usage meets threshold
- No trusted party needed for verification

**Trust Reduction:**
- ✅ Fully on-chain verification
- ✅ No trusted party for verification
- ⚠️ Requires on-chain storage (cost)
- ⚠️ May reveal usage patterns

---

## Recommended Approach: Hybrid with Transparency

### Phase 1: Transparent Commitments (Fast Path)
- Use hash commitments for speed
- Make commitment generation transparent
- Publish valid commitments set
- Allow users to verify their commitments

### Phase 2: Merkle Tree (Auditable)
- Build Merkle tree of commitments
- Publish tree root on-chain
- Users provide Merkle proofs
- Enables auditing

### Phase 3: ZK Proofs (Trustless)
- Add ZK proofs for maximum privacy and trustlessness
- Users can choose between speed (commitments) or trustlessness (ZK)

---

## Trust Model Summary

| Approach | Trust Required | Trust Level | Best For |
|----------|---------------|-------------|----------|
| **ZK Proofs** | None | ⭐⭐⭐⭐⭐ | Maximum privacy & trustlessness |
| **Merkle Trees** | Tree builder | ⭐⭐⭐⭐ | Transparent & auditable |
| **Hash Commitments** | System operator | ⭐⭐ | Speed & simplicity |
| **Signatures** | Server | ⭐⭐ | Simple & fast |

---

## When to Use Each

### Use ZK Proofs When:
- ✅ Maximum privacy is required
- ✅ Trustlessness is critical
- ✅ Users don't trust system operator
- ✅ Computational cost is acceptable

### Use Merkle Trees When:
- ✅ Transparency is important
- ✅ Auditing is needed
- ✅ Some trust in tree builder is acceptable
- ✅ Balance of speed and trust

### Use Hash Commitments When:
- ✅ Speed is critical
- ✅ System operator is trusted
- ✅ Simple implementation needed
- ✅ Can add transparency later

### Use Signatures When:
- ✅ Very simple implementation needed
- ✅ Centralized control is acceptable
- ✅ Speed is critical
- ✅ Trust in server is acceptable

---

## Conclusion

**Yes, hash commitments require trust in the system operator.** However, you can:

1. **Add transparency** - Make commitment generation auditable
2. **Use Merkle trees** - Publish tree root for verification
3. **Hybrid approach** - Offer both trusted (fast) and trustless (ZK) options
4. **On-chain verification** - Move verification on-chain to reduce trust

For beta tester attestations, a **hybrid approach** is recommended:
- **Fast path**: Hash commitments (trusted but fast)
- **Trustless path**: ZK proofs (when circuit is ready)
- **Transparency**: Merkle tree of commitments (auditable)

This gives users choice: speed with some trust, or trustlessness with more computation.

