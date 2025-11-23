# Domain Setup: sealevelstudio.xyz

Quick setup guide for configuring `sealevelstudio.xyz` with your Sealevel Studio deployment.

## 🚀 Quick Start (Railway)

Since you're using Railway, follow these steps:

### Step 1: Add Domain in Railway

1. Go to [railway.app](https://railway.app) → Your Project → **Settings** → **Networking**
2. Click **Custom Domain** or **Add Domain**
3. Enter: `sealevelstudio.xyz`
4. Railway will provide a CNAME value (e.g., `your-project.up.railway.app`)

### Step 2: Configure DNS Records

Add the CNAME record Railway provides at your domain registrar:

**For Root Domain:**
```
Type: CNAME
Name: @ (or leave blank)
Value: [Railway-provided CNAME value]
```

**For WWW Subdomain (optional):**
```
Type: CNAME
Name: www
Value: [Railway-provided CNAME value]
```

**Note:** 
- Railway provides the exact CNAME value in the dashboard
- DNS propagation can take 24-48 hours
- Check status at [dnschecker.org](https://dnschecker.org)

### Step 3: Set Environment Variables in Railway

In Railway Dashboard → **Variables**, add:

```env
# App URL (IMPORTANT - Update this!)
NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz
NEXT_PUBLIC_BASE_URL=https://sealevelstudio.xyz

# Solana RPC
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Twitter OAuth (Update callback URL in Twitter dashboard too!)
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Other API keys...
HELIUS_API_KEY=your_helius_key
BIRDEYE_API_KEY=your_birdeye_key
# ... etc
```

### Step 5: Update Twitter App Settings

1. Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Open your app → **Settings** → **User authentication settings**
3. Update **Callback URI / Redirect URL** to:
   ```
   https://sealevelstudio.xyz/api/auth/twitter/callback
   ```
4. Save changes

### Step 6: Update Helius Webhooks (if using)

1. Go to [Helius Dashboard](https://dashboard.helius.dev)
2. Navigate to **Webhooks**
3. Update webhook URL to:
   ```
   https://sealevelstudio.xyz/api/webhooks/helius
   ```

### Step 7: Redeploy

After setting environment variables, trigger a new deployment:

```bash
railway up
```

Or push a commit to trigger automatic deployment (Railway auto-deploys on push).

**Note:** Railway automatically provisions SSL certificates for custom domains.

---

## ✅ Verification Checklist

- [ ] Domain added in Vercel dashboard
- [ ] DNS records configured at registrar
- [ ] DNS propagation complete (check with dnschecker.org)
- [ ] `NEXT_PUBLIC_APP_URL` set to `https://sealevelstudio.xyz` in Vercel
- [ ] `NEXT_PUBLIC_BASE_URL` set to `https://sealevelstudio.xyz` in Vercel
- [ ] Twitter callback URL updated in Twitter dashboard
- [ ] Helius webhook URL updated (if using)
- [ ] SSL certificate active (Vercel auto-configures this)
- [ ] Site accessible at https://sealevelstudio.xyz

---

## 🔍 Testing

1. **Check DNS Propagation:**
   ```bash
   # Check if domain resolves
   nslookup sealevelstudio.xyz
   ```

2. **Verify Railway Domain:**
   - Railway Dashboard → Settings → Networking
   - Should show "Active" status for your domain

3. **Test HTTPS:**
   - Visit: `https://sealevelstudio.xyz`
   - Should show SSL certificate (Railway auto-configures via Let's Encrypt)

3. **Test OAuth:**
   - Try connecting Twitter account
   - Should redirect to `https://sealevelstudio.xyz/api/auth/twitter/callback`

---

## 🐛 Troubleshooting

### Domain Not Resolving

1. **Check DNS Records:**
   - Verify A record points to `76.76.21.21`
   - Wait 24-48 hours for propagation

2. **Check Vercel Domain Status:**
   - Go to Vercel → Settings → Domains
   - Should show "Valid Configuration"

### SSL Certificate Issues

- Railway automatically provisions SSL certificates via Let's Encrypt
- If issues persist, check domain configuration in Railway dashboard
- Ensure DNS is properly configured before SSL provisioning

### OAuth Not Working

1. **Verify Callback URL:**
   - Must match exactly in Twitter dashboard
   - Format: `https://sealevelstudio.xyz/api/auth/twitter/callback`

2. **Check Environment Variables:**
   - `NEXT_PUBLIC_APP_URL` must be set correctly
   - `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET` must be set

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Custom Domains](https://docs.railway.app/networking/custom-domains)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [DNS Propagation Checker](https://dnschecker.org)

## 📖 Full Railway Guide

For complete Railway deployment instructions, see:
- [RAILWAY_DEPLOYMENT.md](./RAILWAY_DEPLOYMENT.md) - Complete Railway setup guide

---

## 🎉 You're All Set!

Once DNS propagates and Vercel deploys, your site will be live at:
**https://sealevelstudio.xyz**

