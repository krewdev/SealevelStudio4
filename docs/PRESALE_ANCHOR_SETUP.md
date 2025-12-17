# SEAL Presale Anchor Setup

## Workspace Structure

The SEAL Presale program is set up as a standalone Anchor workspace:

```
programs/seal-presale/
├── Anchor.toml          # Anchor configuration
├── Cargo.toml           # Rust dependencies
├── package.json         # Node.js dependencies
├── tsconfig.json        # TypeScript configuration
├── src/
│   └── lib.rs          # Main program code
├── tests/
│   └── seal-presale.ts # Test file
└── target/
    └── deploy/
        └── seal_presale-keypair.json  # Program keypair
```

## Program ID

- **Program ID**: `2g4two95hsPRbdQYoiyasp6cVYho8SF4puab4RyFHHnY`
- **Keypair**: `programs/seal-presale/target/deploy/seal_presale-keypair.json`

## Commands

All commands should be run from the `programs/seal-presale/` directory:

### Build
```bash
cd programs/seal-presale
anchor build
```

### Deploy to Devnet
```bash
cd programs/seal-presale
anchor deploy --provider.cluster devnet
```

### Run Tests
```bash
cd programs/seal-presale
anchor test
```

### List Program IDs
```bash
cd programs/seal-presale
anchor keys list
```

## Configuration Files

### Anchor.toml
Located at `programs/seal-presale/Anchor.toml`, contains:
- Program ID configuration
- Network settings (devnet/localnet)
- Test validator configuration
- Script definitions

### Cargo.toml
Located at `programs/seal-presale/Cargo.toml`, contains:
- Rust package metadata
- Anchor dependencies (anchor-lang, anchor-spl)
- Build configuration

## Next Steps

1. **Install Dependencies**
   ```bash
   cd programs/seal-presale
   yarn install
   ```

2. **Build the Program**
   ```bash
   anchor build
   ```

3. **Deploy to Devnet**
   ```bash
   anchor deploy --provider.cluster devnet
   ```

4. **Write Tests**
   - Add tests in `tests/seal-presale.ts`
   - Test all instructions
   - Test edge cases and error conditions

5. **Security Audit**
   - Professional audit recommended
   - Test all attack vectors
   - Verify all edge cases

## Troubleshooting

### "package section not provided"
- Make sure you're in the `programs/seal-presale/` directory
- Ensure `package.json` exists
- Run `yarn install` if needed

### "Invalid Base58 string"
- Program ID must be valid Base58
- Current ID: `2g4two95hsPRbdQYoiyasp6cVYho8SF4puab4RyFHHnY`
- If regenerating, update both `Anchor.toml` and `src/lib.rs`

### Build Errors
- Check Rust version: `rustc --version`
- Check Anchor version: `anchor --version`
- Ensure all dependencies are installed

---

**Status**: Setup complete, ready for building and testing

