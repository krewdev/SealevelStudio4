# Railway Deployment Guide for sealevelstudio.xyz

Complete guide for deploying Sealevel Studio to Railway with custom domain.

## 🚀 Quick Start

### Step 1: Connect Repository

1. **Via Railway Dashboard** (Recommended):
   - Go to [railway.app](https://railway.app)
   - Click **New Project**
   - Select **Deploy from GitHub repo**
   - Choose your Sealevel Studio repository
   - Railway will auto-detect Next.js

2. **Via Railway CLI**:
   ```bash
   npm i -g @railway/cli
   railway login
   railway init
   railway up
   ```

### Step 2: Add Custom Domain

1. In Railway Dashboard → Your Project → **Settings** → **Networking**
2. Click **Custom Domain**
3. Enter: `sealevelstudio.xyz`
4. Railway will provide DNS configuration

### Step 3: Configure DNS

Add the CNAME record Railway provides at your domain registrar:

```
Type: CNAME
Name: @ (or leave blank for root domain)
Value: [Railway-provided CNAME]
```

**Example from Railway:**
```
sealevelstudio.xyz → [your-project].up.railway.app
```

**For WWW subdomain (optional):**
```
Type: CNAME
Name: www
Value: [Railway-provided CNAME]
```

### Step 4: Set Environment Variables

In Railway Dashboard → **Variables**, add all required environment variables:

#### Required Variables

```env
# App URL (CRITICAL - must match your domain)
NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz
NEXT_PUBLIC_BASE_URL=https://sealevelstudio.xyz

# Solana RPC Endpoints
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_NETWORK=mainnet

# Helius API
HELIUS_API_KEY=your_helius_api_key
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
```

#### Optional but Recommended

```env
# AI Providers
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key

# Token Data APIs
BIRDEYE_API_KEY=your_birdeye_key
JUPITER_API_KEY=your_jupiter_key

# Social Media
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
TELEGRAM_BOT_TOKEN=your_telegram_token

# QuickNode (if using)
QUICKNODE_API_KEY=your_quicknode_key
QUICKNODE_ENDPOINT=your-endpoint.solana-mainnet.quiknode.pro
QUICKNODE_STREAM_FILTER=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Step 5: Update External Services

#### Twitter OAuth
1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Your App → **Settings** → **User authentication settings**
3. Update **Callback URI**:
   ```
   https://sealevelstudio.xyz/api/auth/twitter/callback
   ```

#### Helius Webhooks
1. Go to [Helius Dashboard](https://dashboard.helius.dev)
2. **Webhooks** → Edit your webhook
3. Update URL:
   ```
   https://sealevelstudio.xyz/api/webhooks/helius
   ```

### Step 6: Deploy

Railway automatically deploys on:
- Git push to connected branch
- Manual deploy via dashboard
- CLI command: `railway up`

## 🔧 Railway Configuration

### Build Settings

Railway auto-detects Next.js, but you can customize in `railway.toml`:

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm run build"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Port Configuration

Railway automatically sets `PORT` environment variable. Next.js will use it automatically.

### Environment Variables

- **Add via Dashboard**: Project → Variables → Add Variable
- **Add via CLI**:
  ```bash
  railway variables set VARIABLE_NAME=value
  ```
- **Bulk import**: Use Railway dashboard to import from `.env` file

## ✅ Verification Checklist

- [ ] Repository connected to Railway
- [ ] Custom domain added: `sealevelstudio.xyz`
- [ ] DNS CNAME record configured at registrar
- [ ] DNS propagation complete (check with [dnschecker.org](https://dnschecker.org))
- [ ] `NEXT_PUBLIC_APP_URL` set to `https://sealevelstudio.xyz`
- [ ] `NEXT_PUBLIC_BASE_URL` set to `https://sealevelstudio.xyz`
- [ ] All required environment variables set
- [ ] Twitter callback URL updated
- [ ] Helius webhook URL updated (if using)
- [ ] SSL certificate active (Railway auto-configures)
- [ ] Site accessible at https://sealevelstudio.xyz

## 🐛 Troubleshooting

### Domain Not Resolving

1. **Check DNS Records**:
   - Verify CNAME points to Railway-provided value
   - Wait 24-48 hours for propagation
   - Use [dnschecker.org](https://dnschecker.org) to check globally

2. **Check Railway Domain Status**:
   - Railway Dashboard → Settings → Networking
   - Should show "Active" status

### Build Fails

1. **Check Build Logs**:
   - Railway Dashboard → Deployments → View Logs
   - Look for error messages

2. **Common Issues**:
   - Missing environment variables
   - Node version mismatch (Railway uses Node 18+ by default)
   - Build timeout (increase in Railway settings if needed)

### Environment Variables Not Working

1. **Verify Variable Names**:
   - Must match exactly (case-sensitive)
   - `NEXT_PUBLIC_` prefix required for client-side variables

2. **Redeploy After Adding Variables**:
   - Variables are injected at build time
   - Must redeploy for changes to take effect

### SSL Certificate Issues

- Railway automatically provisions SSL via Let's Encrypt
- If issues persist, check domain configuration in Railway
- Ensure DNS is properly configured before SSL provisioning

## 📊 Railway Features

### Automatic Deployments
- Deploys on every push to connected branch
- Preview deployments for pull requests (if configured)

### Metrics & Logs
- Real-time logs in Railway dashboard
- Resource usage metrics
- Request/response monitoring

### Scaling
- Auto-scaling based on traffic
- Manual scaling in Railway dashboard
- Resource limits configurable

## 💰 Railway Pricing

- **Hobby Plan**: Free tier available
- **Pro Plan**: $5/month for production workloads
- **Team Plan**: For collaborative projects

Check [railway.app/pricing](https://railway.app/pricing) for current pricing.

## 🔗 Useful Links

- [Railway Documentation](https://docs.railway.app)
- [Railway Dashboard](https://railway.app)
- [Next.js on Railway](https://docs.railway.app/guides/nextjs)

## 🎉 Success!

Once DNS propagates and Railway deploys, your site will be live at:
**https://sealevelstudio.xyz**



