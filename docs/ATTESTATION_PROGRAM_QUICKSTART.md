# Attestation Program Quick Start

This is a quick reference guide for setting up your custom attestation program.

## Quick Setup

1. **Run the initialization script**:
```bash
./scripts/init-attestation-program.sh
```

2. **Update the program ID**:
   - After running the script, it will show your program ID
   - Update `programs/attestation-program/src/lib.rs` - replace `YOUR_PROGRAM_ID_HERE`
   - Update `programs/attestation-program/Anchor.toml` with the program ID

3. **Build the program**:
```bash
cd programs/attestation-program
anchor build
```

4. **Deploy to devnet**:
```bash
anchor deploy --provider.cluster devnet
```

5. **Update environment variables**:
```bash
# Add to your .env.local:
NEXT_PUBLIC_ATTESTATION_PROGRAM_ID=<your_program_id_from_deploy>
```

6. **Generate TypeScript types**:
```bash
# After building, copy the IDL
cp target/idl/attestation_program.json ../../app/lib/attestation/attestation_program.json
```

7. **Use in your frontend**:
```typescript
import { createAttestationClient } from '@/app/lib/attestation/client';

const client = createAttestationClient(connection, wallet);
const tx = await client.mintAttestation(proofBytes, publicInputs, metadata);
```

## Program Instructions

- `initialize` - Initialize the attestation registry
- `mint_attestation` - Mint a cNFT attestation with ZK proof verification
- `verify_proof_only` - Verify ZK proof without minting
- `revoke_attestation` - Revoke an attestation (authority only)

## Next Steps

1. Implement ZK proof verification (see ZK_CIRCUIT_SETUP.md)
2. Integrate Bubblegum for cNFT minting
3. Write tests
4. Deploy to mainnet

