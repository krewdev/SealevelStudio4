# ZK Circuit Setup Guide

## Beta Tester Circuit Compilation

This guide explains how to compile the beta tester ZK circuit for VeriSol attestations.

## Prerequisites

1. **Circom** (v2.0.0+)
   ```bash
   npm install -g circom
   ```

2. **snarkjs** (v0.7.5+)
   ```bash
   npm install snarkjs
   ```

## Circuit File

The beta tester circuit is located at: `zk-circuit/beta-tester-circuit.circom`

### Circuit Description

The circuit verifies:
1. **Wallet Address**: Hash of wallet address matches (public input)
2. **Usage Threshold**: Actual usage meets minimum threshold (private input)
3. **Usage Proof**: Proof that usage data is valid (private input)

### Circuit Inputs

**Public Inputs:**
- `walletAddressHash`: Hash of wallet address (for verification)
- `minUsageThreshold`: Minimum usage required (e.g., 10)

**Private Inputs:**
- `actualUsage`: Actual feature usage count
- `walletAddress`: Wallet address (for hash verification)
- `usageProof`: Proof that usage data is valid

## Compilation Steps

### Step 1: Compile Circuit

```bash
cd zk-circuit
circom beta-tester-circuit.circom --r1cs --wasm --sym
```

This generates:
- `beta-tester-circuit.r1cs` - R1CS constraint system
- `beta-tester-circuit.wasm` - WebAssembly file for witness generation
- `beta-tester-circuit.sym` - Symbol file for debugging

### Step 2: Generate Proving Key (zkey)

**Option A: Using snarkjs (for testing)**

```bash
# Generate zkey (requires trusted setup in production)
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau --name="First contribution" -v
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v
snarkjs groth16 setup beta-tester-circuit.r1cs pot14_final.ptau beta-tester-circuit_0000.zkey
snarkjs zkey contribute beta-tester-circuit_0000.zkey beta-tester-circuit_0001.zkey --name="Second contribution" -v
snarkjs zkey export verificationkey beta-tester-circuit_0001.zkey verification_key.json
snarkjs zkey beacon beta-tester-circuit_0001.zkey beta-tester-circuit_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"
```

**Option B: Using Ceremony (for production)**

For production use, participate in a trusted setup ceremony or use a pre-generated proving key.

### Step 3: Copy Artifacts to Public Directory

```bash
# Copy WASM and zkey to public directory
cp zk-circuit/beta-tester-circuit.wasm public/zk/
cp zk-circuit/beta-tester-circuit_final.zkey public/zk/
```

## Current Status

⚠️ **Note**: The circuit compilation is currently blocked by a parser issue with Circom 0.5.46. The error suggests the parser is incorrectly reading line breaks, treating multiple lines as a single line.

### Known Issue

When running `circom beta-tester-circuit.circom --r1cs --wasm --sym`, the parser reports:
```
Parse error on line 1:
pragma circom 2.0.0;// Beta Teste
```

This indicates the parser is concatenating lines incorrectly, even though the file has proper line breaks.

### Workaround

For now, the system uses a fallback proof structure that works with the demo verifier. To enable full ZK proof generation:

1. **Fix the Circom parser issue** - This may require:
   - Updating to a newer version of Circom (if available)
   - Using a different Circom installation method
   - Checking for file encoding issues (should be UTF-8, no BOM)
   - Ensuring proper line endings (LF, not CRLF)

2. **Complete the compilation steps** above once the parser issue is resolved

3. **Update the Solana program's verifier** to use the new circuit's verification key

### Alternative Approach

If the parser issue persists, consider:
- Using Circom 2.1.x (if available)
- Compiling the circuit in a different environment (Docker, different OS)
- Using a pre-compiled circuit from a trusted source
- Using a different ZK proof system (zk-STARKs, Bulletproofs)

## Testing

Once compiled, test the circuit:

```bash
# Generate witness
node generate_witness.js beta-tester-circuit.wasm input.json witness.wtns

# Generate proof
snarkjs groth16 prove beta-tester-circuit_final.zkey witness.wtns proof.json public.json

# Verify proof
snarkjs groth16 verify verification_key.json public.json proof.json
```

## Integration

The circuit is integrated in:
- `app/lib/verisol/beta-tester-proof.ts` - Proof generation
- `app/lib/verisol/mint.ts` - On-chain verification
- `app/components/VeriSolAttestation.tsx` - UI integration

## Next Steps

1. ✅ Circuit file created (`zk-circuit/beta-tester-circuit.circom`)
2. ⏳ Compile circuit (blocked by parser issue)
3. ⏳ Generate proving key
4. ⏳ Update Solana program verifier
5. ⏳ Test end-to-end flow

## Troubleshooting

### Parser Error

If you see: `Parse error on line 1: pragma circom 2.0.0;// Beta Teste`

**Possible causes:**
- Circom version incompatibility (0.5.46 has known parser issues)
- File encoding issues (BOM, wrong encoding)
- Line ending issues (CRLF vs LF)
- Hidden characters in file

**Solutions to try:**
1. Check file encoding: `file zk-circuit/beta-tester-circuit.circom`
2. Ensure UTF-8 encoding without BOM
3. Convert line endings: `dos2unix zk-circuit/beta-tester-circuit.circom`
4. Try a different Circom version
5. Recreate the file from scratch

### Missing Dependencies

If `circom` or `snarkjs` commands are not found:
```bash
npm install -g circom
npm install snarkjs
```

## References

- [Circom Documentation](https://docs.circom.io/)
- [snarkjs Documentation](https://github.com/iden3/snarkjs)
- [VeriSol Protocol README](../README_VERISOL.md)
