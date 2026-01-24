# Domain Transfer Guide: sealevelstudio/sealevelstudio4 → krewdev/SealevelStudio4

This guide will help you transfer your custom domain from the old repository to the new one.

## 📋 Prerequisites

- Domain name: `sealevelstudio.xyz` (or your domain)
- Old repository: `sealevelstudio/sealevelstudio4`
- New repository: `krewdev/SealevelStudio4`
- Access to domain DNS settings

## 🚀 Step-by-Step Transfer Process

### Step 1: Remove Domain from Old Repository

1. **If using GitHub Pages:**
   - Go to `sealevelstudio/sealevelstudio4` repository
   - Navigate to **Settings** → **Pages**
   - Remove the custom domain
   - Delete the `CNAME` file if it exists

2. **If using Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Find the project connected to `sealevelstudio/sealevelstudio4`
   - Go to **Settings** → **Domains**
   - Remove the domain from that project

3. **If using Railway:**
   - Go to [railway.app](https://railway.app)
   - Find the project connected to `sealevelstudio/sealevelstudio4`
   - Go to **Settings** → **Networking**
   - Remove the custom domain

### Step 2: Connect New Repository to Your Hosting Service

#### Option A: Vercel (Recommended for Next.js)

1. **Connect Repository:**
   - Go to [vercel.com](https://vercel.com)
   - Click **Add New Project**
   - Import `krewdev/SealevelStudio4` repository
   - Configure build settings (auto-detected for Next.js)
   - Deploy

2. **Add Custom Domain:**
   - Go to your project → **Settings** → **Domains**
   - Click **Add Domain**
   - Enter: `sealevelstudio.xyz`
   - Vercel will provide DNS instructions

3. **Update DNS Records:**
   
   **For Root Domain:**
   ```
   Type: A
   Name: @
   Value: 76.76.21.21
   ```
   
   **For WWW Subdomain:**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

#### Option B: Railway

1. **Connect Repository:**
   - Go to [railway.app](https://railway.app)
   - Click **New Project**
   - Select **Deploy from GitHub repo**
   - Choose `krewdev/SealevelStudio4`
   - Railway will auto-detect Next.js

2. **Add Custom Domain:**
   - Go to **Settings** → **Networking**
   - Click **Custom Domain**
   - Enter: `sealevelstudio.xyz`
   - Railway will provide a CNAME value

3. **Update DNS Records:**
   ```
   Type: CNAME
   Name: @
   Value: [Railway-provided CNAME value]
   ```

#### Option C: GitHub Pages (if using static site)

1. **Enable GitHub Pages:**
   - Go to `krewdev/SealevelStudio4` repository
   - Navigate to **Settings** → **Pages**
   - Select source branch (usually `main` or `gh-pages`)
   - Save

2. **Add Custom Domain:**
   - In **Pages** settings, enter your domain: `sealevelstudio.xyz`
   - Click **Save**
   - This will create a `CNAME` file automatically

3. **Create CNAME File (if not auto-created):**
   ```bash
   echo "sealevelstudio.xyz" > CNAME
   git add CNAME
   git commit -m "Add custom domain CNAME"
   git push
   ```

4. **Update DNS Records:**
   ```
   Type: A
   Name: @
   Value: 185.199.108.153
   Value: 185.199.109.153
   Value: 185.199.110.153
   Value: 185.199.111.153
   ```

### Step 3: Update Environment Variables

In your hosting service (Vercel/Railway), update these environment variables:

```env
NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz
NEXT_PUBLIC_BASE_URL=https://sealevelstudio.xyz
```

### Step 4: Update External Service Callbacks

1. **Twitter OAuth:**
   - Go to [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
   - Update callback URL to: `https://sealevelstudio.xyz/api/auth/twitter/callback`

2. **Helius Webhooks (if using):**
   - Update webhook URL to: `https://sealevelstudio.xyz/api/webhooks/helius`

3. **Other OAuth/Webhook services:**
   - Update all callback URLs to use the new domain

### Step 5: Verify DNS Propagation

1. **Check DNS:**
   ```bash
   nslookup sealevelstudio.xyz
   dig sealevelstudio.xyz
   ```

2. **Use online tools:**
   - [dnschecker.org](https://dnschecker.org)
   - [whatsmydns.net](https://www.whatsmydns.net)

3. **Wait for propagation:**
   - DNS changes can take 24-48 hours
   - Usually propagates within a few hours

### Step 6: Test the Domain

1. **Check HTTPS:**
   - Visit: `https://sealevelstudio.xyz`
   - Should show valid SSL certificate

2. **Test OAuth:**
   - Try connecting Twitter account
   - Should redirect correctly

3. **Test API endpoints:**
   - Verify all API routes work with the new domain

## 🔧 Quick Commands

### If using GitHub Pages and need to create CNAME manually:

```bash
cd /Users/krewdev/SealevelStudio4
echo "sealevelstudio.xyz" > CNAME
git add CNAME
git commit -m "Add custom domain CNAME file"
git push origin main
```

### If using Vercel:

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Add domain
vercel domains add sealevelstudio.xyz
```

## ✅ Verification Checklist

- [ ] Domain removed from old repository/hosting service
- [ ] New repository connected to hosting service
- [ ] Custom domain added to new project
- [ ] DNS records updated at domain registrar
- [ ] Environment variables updated (`NEXT_PUBLIC_APP_URL`)
- [ ] Twitter OAuth callback URL updated
- [ ] Helius webhook URL updated (if using)
- [ ] DNS propagation verified
- [ ] HTTPS working (SSL certificate active)
- [ ] Site accessible at custom domain
- [ ] OAuth flows working correctly

## 🐛 Troubleshooting

### Domain Not Resolving

1. **Check DNS records:**
   - Verify records are correct at your registrar
   - Wait for DNS propagation (can take 24-48 hours)

2. **Check hosting service:**
   - Verify domain is added in hosting dashboard
   - Check domain status (should show "Active" or "Valid")

### SSL Certificate Issues

- **Vercel/Railway:** SSL certificates are auto-provisioned
- **GitHub Pages:** SSL is automatic once DNS is configured
- Wait for DNS propagation before SSL can be issued

### OAuth Not Working

1. **Verify callback URLs:**
   - Must match exactly in service dashboards
   - Check `NEXT_PUBLIC_APP_URL` environment variable

2. **Check CORS settings:**
   - Ensure domain is whitelisted in OAuth apps

## 📚 Additional Resources

- [Vercel Custom Domains](https://vercel.com/docs/concepts/projects/domains)
- [Railway Custom Domains](https://docs.railway.app/networking/custom-domains)
- [GitHub Pages Custom Domain](https://docs.github.com/pages/configuring-a-custom-domain-for-your-github-pages-site)

---

**Note:** The exact domain name (`sealevelstudio.xyz`) should be replaced with your actual domain name throughout this guide.
