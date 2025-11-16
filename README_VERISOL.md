# VeriSol Beta Tester Attestation System

## Overview

This system allows users to mint compressed NFT (cNFT) attestations proving they were beta testers of Sealevel Studio. The system uses zero-knowledge proofs for decentralization and verifies that users actually tested the app before allowing attestation minting.

## Architecture

### 1. ZK Circuit (`zk-circuit/beta-tester-circuit.circom`)
- Verifies wallet address ownership
- Checks that usage meets minimum threshold (10 features)
- Validates usage proof authenticity
- **Note**: This circuit needs to be compiled using Circom before use

### 2. Usage Verification
- Tracks all feature usage via `useUsageTracking` hook
- Requires minimum 10 feature uses to qualify
- Generates cryptographic proof of usage data
- Prevents minting if usage requirements not met

### 3. Beta Tester Merkle Tree
- All beta tester cNFTs minted to dedicated merkle tree
- Configured via `NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE` environment variable
- Can also use collection ID for filtering: `NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID`

### 4. API Endpoints

#### Check Beta Tester Attestation
```
GET /api/verisol/beta-tester/check?wallet=<address>
```

**Response:**
```json
{
  "wallet": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "hasAttestation": true,
  "attestationTxSignature": "5j7s8...",
  "attestationTimestamp": 1234567890000,
  "cNFTAddress": "cNFT_id_here",
  "metadata": {
    "name": "Sealevel Studio Beta Tester",
    "symbol": "BETA",
    "uri": "https://sealevel.studio/metadata/beta-tester.json"
  },
  "merkleTree": "tree_address",
  "checkedAt": "2024-01-01T00:00:00.000Z"
}
```

**How it works:**
1. **With Helius DAS API** (recommended):
   - Queries `getAssetsByOwner` filtered by tree/collection
   - Directly checks for cNFTs in beta tester tree
   - Returns metadata and compression info

2. **Without API key** (fallback):
   - Scans transaction history for VeriSol + Bubblegum interactions
   - Checks if transactions involved beta tester merkle tree
   - Less accurate but still functional

### 5. Direct Tree Querying

The API attempts to query the merkle tree directly using:
- Helius DAS API `getAssetsByOwner` with tree filter
- Transaction scanning for VeriSol program interactions
- Metadata pattern matching (name includes "beta tester", "sealevel", etc.)

## Setup

### Environment Variables

```bash
# Beta Tester Merkle Tree (required for minting)
NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE=<merkle_tree_address>

# Optional: Collection ID for filtering
NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID=<collection_id>

# Helius API (optional but recommended for accurate checking)
HELIUS_API_KEY=<your_helius_key>
NEXT_PUBLIC_HELIUS_API_KEY=<your_helius_key>  # For client-side if needed

# Network
NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta  # or devnet
```

### Compiling the Circuit

1. Install Circom:
```bash
npm install -g circom
```

2. Compile the circuit:
```bash
cd zk-circuit
circom beta-tester-circuit.circom --r1cs --wasm --sym
```

3. Generate proving key (requires trusted setup):
```bash
snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v
# ... continue with trusted setup
snarkjs groth16 setup beta-tester-circuit.r1cs pot12_final.ptau beta-tester-circuit_0000.zkey
snarkjs zkey contribute beta-tester-circuit_0000.zkey beta-tester-circuit_0001.zkey --name="Second contribution" -v
snarkjs zkey export verificationkey beta-tester-circuit_0001.zkey verification_key.json
snarkjs zkey export bellman beta-tester-circuit_0001.zkey beta-tester-circuit_final.zkey
```

4. Copy artifacts to public directory:
```bash
cp beta-tester-circuit_js/beta-tester-circuit.wasm ../public/zk/beta-tester-circuit.wasm
cp beta-tester-circuit_final.zkey ../public/zk/beta-tester-circuit_final.zkey
```

## Usage Verification

The system verifies users actually tested the app by:

1. **Tracking Feature Usage**: Every feature use is tracked via `trackFeatureUsage()`
2. **Minimum Requirement**: Users must use at least 10 features total
3. **Usage Proof**: Cryptographic hash of usage data is included in ZK proof
4. **On-Chain Verification**: The ZK proof verifies usage meets threshold without revealing exact usage

### Features Tracked:
- Scanner scans
- Scanner auto-refresh
- Simulations
- AI queries
- Code exports
- Advanced transactions

## Minting Flow

1. User connects wallet
2. System checks usage stats
3. If usage < 10: Shows error, button disabled
4. If usage >= 10: Allows minting
5. Generates usage proof hash
6. Creates ZK proof with usage verification
7. Mints cNFT to beta tester merkle tree
8. Returns transaction signature

## Verification Flow

1. Query `/api/verisol/beta-tester/check?wallet=<address>`
2. API queries beta tester merkle tree directly
3. Returns whether wallet has attestation cNFT
4. Includes metadata and transaction info

## Decentralization

- **ZK Proofs**: Usage data is verified without revealing exact numbers
- **On-Chain Verification**: VeriSol program verifies proofs on-chain
- **No Central Authority**: Anyone can verify attestations independently
- **Tree-Based**: All attestations in same merkle tree for efficient querying

## Next Steps

1. Compile the beta tester circuit
2. Set up beta tester merkle tree
3. Deploy to mainnet
4. Update verifier in Solana program to use new circuit verification key

