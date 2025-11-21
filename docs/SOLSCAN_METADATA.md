# Making "Sealevel Studios" Appear on Solscan

To ensure your program shows "Sealevel Studios" on Solscan, you need to configure several things:

## 1. Anchor.toml Configuration

The program name in `Anchor.toml` should be descriptive:

```toml
[programs.mainnet]
sealevel_attestation = "YOUR_PROGRAM_ID"
```

## 2. Cargo.toml Package Metadata

Update `programs/attestation-program/programs/attestation-program/Cargo.toml`:

```toml
[package]
name = "sealevel-attestation"
description = "Sealevel Studios - Attestation Program for ZK proof verification and compressed NFT minting"
authors = ["Sealevel Studios"]
homepage = "https://sealevel.studio"
repository = "https://github.com/sealevelstudio/sealevel-studio"
```

## 3. Program Module Name

In your Rust code, use a descriptive module name:

```rust
#[program]
pub mod sealevel_attestation {
    // ...
}
```

## 4. IDL Metadata

When Anchor generates the IDL, it will include:
- Program name from Cargo.toml
- Description from Cargo.toml
- Module name from Rust code

## 5. Solscan Program Registry (Optional)

Solscan has a program registry where you can submit your program:

1. Go to https://solscan.io
2. Navigate to your program page
3. Look for "Claim" or "Register" option
4. Submit program details including:
   - Program Name: "Sealevel Studios Attestation"
   - Description: "ZK proof verification and compressed NFT attestation minting"
   - Website: https://sealevel.studio
   - Logo: Your logo image

## 6. Transaction Logs

Add descriptive log messages in your program:

```rust
msg!("Sealevel Studios: Attestation minted");
msg!("Sealevel Studios: Proof verified");
```

These will appear in transaction logs on Solscan.

## 7. Instruction Names

Use clear, descriptive instruction names:

```rust
pub fn mint_attestation(...)  // Good
pub fn verify_proof_only(...) // Good
pub fn revoke_attestation(...) // Good
```

## 8. After Deployment

1. **Rebuild** to update IDL:
   ```bash
   anchor build
   ```

2. **Check the generated IDL**:
   ```bash
   cat target/idl/sealevel_attestation.json
   ```
   
   The IDL should have:
   ```json
   {
     "name": "sealevel_attestation",
     "metadata": {
       "description": "Sealevel Studios - Attestation Program..."
     }
   }
   ```

3. **Submit to Solscan** (if they have a registry):
   - Use the program IDL
   - Include company name: "Sealevel Studios"
   - Include website and logo

## Current Status

✅ Updated Anchor.toml with descriptive program name
✅ Updated Cargo.toml with Sealevel Studios metadata
✅ Updated Rust module name to `sealevel_attestation`
✅ Added descriptive log messages

## Next Steps

1. Rebuild the program: `anchor build`
2. Deploy to devnet/mainnet
3. Check the generated IDL for proper metadata
4. Submit to Solscan program registry (if available)
5. Verify on Solscan that it shows "Sealevel Studios"

