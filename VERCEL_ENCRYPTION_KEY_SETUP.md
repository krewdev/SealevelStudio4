# Setting Up WALLET_ENCRYPTION_KEY in Vercel

## 🔐 Quick Fix

You're getting the error because `WALLET_ENCRYPTION_KEY` is not set in your Vercel production environment.

### Step 1: Generate Encryption Key

Run this command to generate a secure 64-character hexadecimal key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Or use OpenSSL:**
```bash
openssl rand -hex 32
```

This will output something like:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

### Step 2: Add to Vercel Environment Variables

1. **Go to Vercel Dashboard:**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your project (`krewdev/SealevelStudio4`)

2. **Navigate to Environment Variables:**
   - Go to **Settings** → **Environment Variables**

3. **Add the Key:**
   - Click **Add New**
   - **Key:** `WALLET_ENCRYPTION_KEY`
   - **Value:** Paste your generated 64-character hex key
   - **Environment:** Select **Production** (and optionally **Preview** and **Development**)
   - Click **Save**

4. **Redeploy:**
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Or push a new commit to trigger auto-deployment

### Step 3: Verify

After redeployment, the error should be gone. The encryption key is used to:
- Encrypt wallet private keys before storing them
- Decrypt wallet keys when needed for signing transactions

## 🔒 Security Requirements

- **Length:** Must be exactly 64 hex characters (32 bytes)
- **Format:** Hexadecimal (0-9, a-f)
- **Storage:** Never commit to git - only store in environment variables
- **Rotation:** If you need to rotate the key, you'll need to re-encrypt all existing wallets

## 📋 Using Vercel CLI (Alternative)

If you prefer using the command line:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login
vercel login

# Link project (if not already linked)
cd /Users/krewdev/SealevelStudio4
vercel link

# Add environment variable
vercel env add WALLET_ENCRYPTION_KEY production
# Paste your generated key when prompted

# Redeploy
vercel --prod
```

## ⚠️ Important Notes

1. **Backup the Key:** Store this key securely (password manager, secure vault)
   - If you lose it, you cannot decrypt existing wallets
   - You'll need to generate a new key and users will need to create new wallets

2. **Same Key Across Environments:** 
   - If you use the same database for dev/staging/prod, use the same key
   - If databases are separate, you can use different keys

3. **Key Format Validation:**
   - The key must be exactly 64 hex characters
   - Vercel will validate this when you save
   - Invalid keys will cause the error to persist

## 🐛 Troubleshooting

### Error: "WALLET_ENCRYPTION_KEY must be 64 hex characters"

- Check that your key is exactly 64 characters
- Ensure it's hexadecimal (only 0-9, a-f)
- No spaces or special characters

### Error Still Appears After Adding Key

1. **Check Environment:**
   - Ensure key is set for **Production** environment
   - Check that you redeployed after adding the variable

2. **Verify in Vercel:**
   - Go to **Settings** → **Environment Variables**
   - Confirm `WALLET_ENCRYPTION_KEY` is listed
   - Check it's enabled for Production

3. **Redeploy:**
   - Environment variables are only loaded at build/deploy time
   - You must redeploy after adding new variables

### Existing Wallets Not Working

If you had wallets created before adding the encryption key:
- Those wallets were encrypted with a development key
- They won't work with the new production key
- Users will need to create new wallets

## 📚 Additional Resources

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Wallet Recovery Setup Guide](./docs/WALLET_RECOVERY_SETUP.md)
