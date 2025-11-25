# Merkle Tree Files - What to Commit

## ✅ DO Commit

These files are safe to commit and should be in your repository:

1. **Setup Scripts**:
   - `scripts/setup-merkle-tree.ts` ✅
   - `scripts/setup-presale-merkle-tree.ts` ✅
   - `scripts/verify-merkle-tree.ts` ✅

2. **Documentation**:
   - `docs/MERKLE_TREE_SETUP.md` ✅
   - `docs/MERKLE_TREE_GIT_GUIDE.md` ✅ (this file)

3. **Configuration Templates**:
   - `env.template` ✅ (contains placeholders, not real values)

## ❌ DO NOT Commit

These files contain sensitive addresses and should **NEVER** be committed:

1. **Generated Environment Files**:
   - `.env.merkle-tree.mainnet` ❌
   - `.env.merkle-tree.devnet` ❌
   - `.env.merkle-tree.testnet` ❌
   - Any `.env.merkle-tree.*` files ❌

2. **Keypair Files** (if generated):
   - `merkle-tree-keypair.json` ❌
   - `merkle-tree-keypair-mainnet.json` ❌
   - Any keypair files used for merkle tree creation ❌

## 🔒 Why Not Commit Generated Files?

The generated `.env.merkle-tree.*` files contain:
- **Merkle Tree Address**: Public but specific to your deployment
- **Tree Authority**: Public but specific to your deployment
- **Network-specific addresses**: Should be different for devnet vs mainnet

While these are public addresses (on-chain), committing them can:
- Expose your deployment structure
- Cause confusion if different environments use different trees
- Make it harder to manage separate dev/staging/prod trees

## 📝 Best Practice

1. **Run the setup script** on each environment (devnet, mainnet):
   ```bash
   npm run setup:merkle-tree -- --network devnet
   npm run setup:merkle-tree -- --network mainnet
   ```

2. **Copy the generated values** to your environment-specific config:
   - Development: `.env.local` (already in .gitignore)
   - Production: Vercel/Railway environment variables

3. **Never commit** the `.env.merkle-tree.*` files

## ✅ Current .gitignore Status

The `.gitignore` file already includes:
```gitignore
.env.merkle-tree.*
```

This means any `.env.merkle-tree.*` files are automatically ignored by git.

## 🔍 Verify What's Ignored

Check if merkle tree files are being tracked:
```bash
git status
```

If you see `.env.merkle-tree.*` files, they're being tracked. Remove them:
```bash
# Remove from git (but keep local file)
git rm --cached .env.merkle-tree.*

# Or remove all merkle tree env files
git rm --cached .env.merkle-tree.*
```

## 📋 Checklist Before Committing

- [ ] Scripts are committed (`setup-merkle-tree.ts`, etc.)
- [ ] Documentation is committed (`MERKLE_TREE_SETUP.md`)
- [ ] `.env.merkle-tree.*` files are NOT in git
- [ ] Keypair files are NOT in git
- [ ] `.gitignore` includes `.env.merkle-tree.*`

## 🚀 Deployment

For production deployment:

1. **Run the setup script** on your production environment
2. **Add the generated values** to your hosting platform's environment variables:
   - Vercel: Project Settings → Environment Variables
   - Railway: Variables tab
   - Other: Platform-specific env var settings

3. **Never commit** the generated files - they're environment-specific

## 💡 Summary

**Commit**: Scripts, documentation, templates  
**Don't Commit**: Generated `.env.merkle-tree.*` files, keypair files  
**Result**: Clean repository with no sensitive deployment-specific files

