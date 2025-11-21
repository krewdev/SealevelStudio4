# Migration Guide: VeriSol to Custom Attestation Program

This guide explains the changes made to replace VeriSol with your custom attestation program.

## What Changed

### 1. Minting Function (`app/lib/verisol/mint.ts`)
- **Before**: Used VeriSol program (`mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6`)
- **After**: Uses custom attestation program client
- **Changes**:
  - Imports `createAttestationClient` instead of VeriSol program
  - Checks if custom program is deployed before minting
  - Uses `client.mintAttestation()` instead of `program.methods.verifyAndMint()`
  - Falls back to `client.verifyProofOnly()` if minting fails

### 2. Check Endpoints (`app/api/verisol/check/route.ts` & `beta-tester/check/route.ts`)
- **Before**: Looked for VeriSol program ID in transactions
- **After**: Looks for custom attestation program ID
- **Changes**:
  - Uses `NEXT_PUBLIC_ATTESTATION_PROGRAM_ID` environment variable
  - Checks for custom program interactions instead of VeriSol

### 3. Configuration (`app/lib/verisol/config.ts`)
- **Before**: Only had VeriSol program ID
- **After**: Added `getAttestationProgramId()` function
- **Note**: VeriSol program ID kept for backwards compatibility

### 4. Setup Check (`app/lib/verisol/mint.ts` - `checkVeriSolSetup`)
- **Before**: Checked VeriSol program existence
- **After**: Checks custom program and registry
- **New**: Also checks if registry is initialized

## Environment Variables

Add to your `.env.local`:

```bash
# Custom Attestation Program ID (required)
NEXT_PUBLIC_ATTESTATION_PROGRAM_ID=your_program_id_here

# Optional: Custom merkle tree (can use existing VeriSol tree)
NEXT_PUBLIC_ATTESTATION_MERKLE_TREE=your_merkle_tree_address_here
```

## Migration Steps

1. **Build and Deploy Your Program**:
   ```bash
   cd programs/attestation-program
   anchor build
   anchor deploy --provider.cluster devnet
   ```

2. **Get Your Program ID**:
   ```bash
   anchor keys list
   ```

3. **Update Environment Variables**:
   - Add `NEXT_PUBLIC_ATTESTATION_PROGRAM_ID` to `.env.local`
   - Optionally set `NEXT_PUBLIC_ATTESTATION_MERKLE_TREE`

4. **Initialize the Registry**:
   - Call `initialize()` instruction on your program
   - Pass your merkle tree address

5. **Test Minting**:
   - Try minting an attestation
   - Check that it uses your custom program

## Backwards Compatibility

- VeriSol program ID is still available in `config.ts` for reference
- Existing VeriSol attestations will still be detected by check endpoints
- New attestations will use your custom program

## Benefits of Custom Program

1. **Registry System**: Track all attestations in one place
2. **Revocation**: Ability to revoke attestations (authority only)
3. **Custom Logic**: Full control over verification and minting
4. **Events**: Custom events for better tracking
5. **Extensibility**: Easy to add new features

## Troubleshooting

### "Custom attestation program not deployed"
- Make sure you've deployed the program
- Check that `NEXT_PUBLIC_ATTESTATION_PROGRAM_ID` is set correctly

### "Attestation registry not initialized"
- Call the `initialize()` instruction first
- Pass your merkle tree address

### "Program not yet deployed" error
- The client throws this until you implement the actual IDL
- After building, copy the IDL to `app/lib/attestation/attestation_program.json`
- Update the client to load the IDL

## Next Steps

1. Complete the Anchor program implementation
2. Implement ZK proof verification
3. Implement Bubblegum cNFT minting
4. Deploy to devnet for testing
5. Deploy to mainnet when ready

