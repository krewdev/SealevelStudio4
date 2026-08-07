# Vercel Domain Transfer Guide: sealevelstudio/sealevelstudio4 → krewdev/SealevelStudio4

Step-by-step guide to transfer your custom domain from the old repository to the new one on Vercel.

## 🚀 Quick Transfer Steps

### Step 1: Remove Domain from Old Vercel Project

1. **Go to Vercel Dashboard:**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Find the project connected to `sealevelstudio/sealevelstudio4`

2. **Remove Domain:**
   - Click on the project
   - Go to **Settings** → **Domains**
   - Find your domain (e.g., `sealevelstudio.xyz`)
   - Click the **Remove** button next to the domain
   - Confirm removal

### Step 2: Connect New Repository to Vercel

1. **Add New Project:**
   - In Vercel Dashboard, click **Add New Project**
   - Click **Import Git Repository**
   - Select `krewdev/SealevelStudio4` from the list
   - If not visible, click **Adjust GitHub App Permissions** and grant access

2. **Configure Project:**
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./` (default)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `.next` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)
   - Click **Deploy**

3. **Wait for Initial Deployment:**
   - Vercel will build and deploy your project
   - This may take a few minutes

### Step 3: Add Custom Domain to New Project

1. **Navigate to Domain Settings:**
   - In your new project dashboard
   - Go to **Settings** → **Domains**

2. **Add Domain:**
   - Click **Add Domain**
   - Enter your domain: `sealevelstudio.xyz`
   - Click **Add**

3. **Vercel will show DNS configuration:**
   - You'll see DNS records that need to be added
   - **For Root Domain:** Usually an A record pointing to `76.76.21.21`
   - **For WWW Subdomain:** Usually a CNAME pointing to `cname.vercel-dns.com`

### Step 4: Update DNS Records

Go to your domain registrar (where you bought the domain) and update DNS:

**For Root Domain (sealevelstudio.xyz):**
```
Type: A
Name: @ (or leave blank)
Value: 76.76.21.21
```

**For WWW Subdomain (www.sealevelstudio.xyz):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Note:** Vercel may provide different values - always use what Vercel shows in the dashboard!

### Step 5: Update Environment Variables

1. **In Vercel Dashboard:**
   - Go to your project → **Settings** → **Environment Variables**

2. **Add/Update these variables:**
   ```env
   NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz
   NEXT_PUBLIC_BASE_URL=https://sealevelstudio.xyz
   ```

3. **Add other required variables:**
   - `NEXT_PUBLIC_SOLANA_RPC_MAINNET`
   - `NEXT_PUBLIC_SOLANA_RPC_DEVNET`
   - `TWITTER_CLIENT_ID`
   - `TWITTER_CLIENT_SECRET`
   - Any other API keys you need

4. **Redeploy:**
   - After adding environment variables, trigger a new deployment
   - Go to **Deployments** tab
   - Click **Redeploy** on the latest deployment
   - Or push a new commit to trigger auto-deployment

### Step 6: Update External Service Callbacks

1. **Twitter OAuth:**
   - Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
   - Open your app → **Settings** → **User authentication settings**
   - Update **Callback URI / Redirect URL** to:
     ```
     https://sealevelstudio.xyz/api/auth/twitter/callback
     ```
   - Save changes

2. **Helius Webhooks (if using):**
   - Go to [Helius Dashboard](https://dashboard.helius.dev)
   - Navigate to **Webhooks**
   - Update webhook URL to:
     ```
     https://sealevelstudio.xyz/api/webhooks/helius
     ```

3. **Other OAuth/Webhook services:**
   - Update all callback URLs to use the new domain

### Step 7: Verify Domain Transfer

1. **Check DNS Propagation:**
   ```bash
   nslookup sealevelstudio.xyz
   dig sealevelstudio.xyz
   ```
   - Or use [dnschecker.org](https://dnschecker.org)

2. **Check Vercel Domain Status:**
   - Go to **Settings** → **Domains**
   - Domain should show "Valid Configuration" status
   - SSL certificate will be auto-provisioned

3. **Test the Site:**
   - Visit: `https://sealevelstudio.xyz`
   - Should load your site with valid SSL certificate
   - Test OAuth flows
   - Test API endpoints

## 🔧 Using Vercel CLI (Alternative Method)

If you prefer using the command line:

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Link to your project (from repository root)
cd /Users/krewdev/SealevelStudio4
vercel link

# Follow prompts:
# - Select existing project or create new
# - Choose organization
# - Select project name

# Add domain
vercel domains add sealevelstudio.xyz

# Set environment variables
vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://sealevelstudio.xyz

vercel env add NEXT_PUBLIC_BASE_URL production
# Enter: https://sealevelstudio.xyz
```

## ✅ Verification Checklist

- [ ] Domain removed from old Vercel project (`sealevelstudio/sealevelstudio4`)
- [ ] New Vercel project created for `krewdev/SealevelStudio4`
- [ ] Domain added to new Vercel project
- [ ] DNS records updated at domain registrar
- [ ] DNS propagation verified (can take 24-48 hours)
- [ ] Environment variables set (`NEXT_PUBLIC_APP_URL`, etc.)
- [ ] Project redeployed with new environment variables
- [ ] Twitter OAuth callback URL updated
- [ ] Helius webhook URL updated (if using)
- [ ] SSL certificate active (auto-provisioned by Vercel)
- [ ] Site accessible at `https://sealevelstudio.xyz`
- [ ] OAuth flows working correctly
- [ ] All API endpoints working

## 🐛 Troubleshooting

### Domain Not Resolving

1. **Check DNS Records:**
   - Verify records are correct at your registrar
   - Use `nslookup` or `dig` to check current DNS
   - Wait for DNS propagation (24-48 hours)

2. **Check Vercel Domain Status:**
   - Go to **Settings** → **Domains**
   - Should show "Valid Configuration"
   - If showing errors, check the error message

### SSL Certificate Issues

- Vercel automatically provisions SSL certificates via Let's Encrypt
- SSL is issued after DNS is properly configured
- Wait for DNS propagation before SSL can be issued
- Usually takes a few minutes after DNS is correct

### OAuth Not Working

1. **Verify Callback URLs:**
   - Must match exactly in Twitter dashboard
   - Check `NEXT_PUBLIC_APP_URL` environment variable
   - Ensure it's set to `https://sealevelstudio.xyz` (with https)

2. **Check Environment Variables:**
   - Verify `NEXT_PUBLIC_APP_URL` is set correctly
   - Ensure variables are set for the correct environment (Production)
   - Redeploy after adding environment variables

### Build Failures

1. **Check Build Logs:**
   - Go to **Deployments** tab
   - Click on failed deployment
   - Review build logs for errors

2. **Common Issues:**
   - Missing environment variables
   - Build command errors
   - Dependency issues

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [DNS Propagation Checker](https://dnschecker.org)

---

**Important Notes:**
- DNS changes can take 24-48 hours to fully propagate
- Vercel automatically handles SSL certificates
- Always use the DNS values shown in Vercel dashboard (they may differ from examples)
- Replace `sealevelstudio.xyz` with your actual domain name
