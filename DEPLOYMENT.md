# Deployment Guide - Vercel

This guide will help you deploy Sealevel Studio to Vercel.

## Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Git repository (GitHub, GitLab, or Bitbucket)
3. Your project pushed to the repository

## Step 1: Prepare Your Repository

Make sure your code is committed and pushed to your Git repository:

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

## Step 2: Deploy via Vercel Dashboard

### Option A: Import from Git (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click "Import Git Repository"
3. Select your repository (GitHub/GitLab/Bitbucket)
4. Vercel will auto-detect Next.js settings
5. Configure environment variables (see Step 3)
6. Click "Deploy"

### Option B: Use Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

Follow the prompts. For production deployment:
```bash
vercel --prod
```

## Step 3: Configure Environment Variables

In your Vercel project settings, add these environment variables:

### Required Environment Variables

Go to: **Project Settings → Environment Variables**

Add the following:

1. **NEXT_PUBLIC_SOLANA_RPC_MAINNET** (Optional)
   - Your mainnet RPC endpoint
   - Example: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`
   - If not set, defaults to Helius public endpoint

2. **NEXT_PUBLIC_SOLANA_RPC_DEVNET** (Optional)
   - Your devnet RPC endpoint
   - Example: `https://devnet.helius-rpc.com/?api-key=YOUR_KEY`
   - If not set, defaults to Helius public endpoint

3. **NEXT_PUBLIC_SOLANA_NETWORK** (Optional)
   - Default network: `mainnet` or `devnet`
   - Defaults to `mainnet` if not set

### Setting Environment Variables

1. Go to your project on Vercel
2. Click **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: `NEXT_PUBLIC_SOLANA_RPC_MAINNET`
   - **Value**: Your RPC URL
   - **Environment**: Production, Preview, Development (select all)
4. Click **Save**
5. Repeat for other variables

## Step 4: Build Configuration

The `vercel.json` file is already configured with:
- Build command: `npm run build`
- Framework: Next.js
- Region: US East (iad1)

No additional configuration needed unless you want to customize.

## Step 5: Verify Deployment

After deployment:

1. Visit your deployment URL (e.g., `your-project.vercel.app`)
2. Test the following:
   - ✅ Account Inspector loads
   - ✅ Transaction Builder works
   - ✅ Wallet connection works
   - ✅ Network switching works

## Step 6: Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Vercel will automatically provision SSL certificates

## Troubleshooting

### Build Fails

**Error: Module not found**
- Check that all dependencies are in `package.json`
- Run `npm install` locally to verify

**Error: Environment variable not found**
- Ensure all `NEXT_PUBLIC_*` variables are set in Vercel
- Redeploy after adding variables

### Runtime Errors

**Wallet connection issues**
- Check browser console for errors
- Ensure RPC endpoints are accessible
- Verify network configuration

**Transaction building fails**
- Check RPC endpoint connectivity
- Verify environment variables are set correctly
- Check Vercel function logs

### Viewing Logs

1. Go to your project on Vercel
2. Click **Deployments**
3. Click on a deployment
4. Click **Functions** tab to see serverless function logs
5. Click **Runtime Logs** for real-time logs

## Continuous Deployment

Vercel automatically deploys on every push to your main branch:

- **Production**: Deploys from `main` branch
- **Preview**: Deploys from pull requests and other branches

## Performance Optimization

### Recommended Settings

1. **Edge Functions**: Already configured for optimal performance
2. **Caching**: Vercel automatically caches static assets
3. **CDN**: Global CDN is enabled by default

### Monitoring

- Use Vercel Analytics (optional add-on)
- Monitor function execution times
- Check error rates in dashboard

## Security Notes

⚠️ **Important**: Never commit API keys or secrets to your repository.

- Use Vercel Environment Variables for all secrets
- `.env` files are gitignored (already configured)
- RPC endpoints with API keys should be in environment variables

## Support

If you encounter issues:

1. Check [Vercel Documentation](https://vercel.com/docs)
2. Check [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
3. Review build logs in Vercel dashboard
4. Check GitHub issues for known problems

## Quick Deploy Checklist

- [ ] Code pushed to Git repository
- [ ] Vercel account created
- [ ] Project imported/connected
- [ ] Environment variables configured
- [ ] Build successful
- [ ] Site accessible and functional
- [ ] Custom domain configured (optional)

---

**Ready to deploy?** Start at [vercel.com/new](https://vercel.com/new) 🚀

