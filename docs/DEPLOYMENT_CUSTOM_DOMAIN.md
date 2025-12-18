# Deploying to Custom Domain

This guide covers deploying Sealevel Studio to a custom domain using various platforms.

## 🚀 Option 1: Vercel (Recommended for Next.js)

Vercel is the easiest and most optimized platform for Next.js applications.

### Step 1: Deploy to Vercel

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project or create new
   - Confirm settings
   - Deploy

4. **For production deployment**:
   ```bash
   vercel --prod
   ```

### Step 2: Connect Custom Domain

1. **Via Vercel Dashboard**:
   - Go to your project on [vercel.com](https://vercel.com)
   - Navigate to **Settings** → **Domains**
   - Click **Add Domain**
   - Enter your custom domain (e.g., `sealevelstudio.xyz`)
   - Follow DNS configuration instructions

2. **Via CLI**:
   ```bash
   vercel domains add sealevelstudio.xyz
   ```

### Step 3: Configure DNS

#### Option A: Direct DNS (Any Provider)

Add these DNS records to your domain provider:

**For Root Domain (sealevelstudio.xyz):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For WWW Subdomain (www.sealevelstudio.xyz):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

**Alternative (using CNAME for root):**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
```

#### Option B: Cloudflare DNS (Recommended)

If your domain is managed by Cloudflare, you get additional benefits:
- DDoS protection
- CDN caching
- SSL/TLS encryption
- Analytics
- Firewall rules

**Setup with Cloudflare:**

1. **Add Domain to Cloudflare** (if not already):
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
   - Add your domain
   - Update nameservers at your registrar

2. **Configure DNS Records in Cloudflare:**

   **For Root Domain (sealevelstudio.xyz):**
   ```
   Type: CNAME
   Name: @
   Target: cname.vercel-dns.com
   Proxy status: Proxied (orange cloud) ✅
   TTL: Auto
   ```

   **For WWW Subdomain (www.sealevelstudio.xyz):**
   ```
   Type: CNAME
   Name: www
   Target: cname.vercel-dns.com
   Proxy status: Proxied (orange cloud) ✅
   TTL: Auto
   ```

3. **Cloudflare SSL/TLS Settings:**
   - Go to **SSL/TLS** → **Overview**
   - Set encryption mode to **Full (strict)**
   - This ensures end-to-end encryption between Cloudflare and Vercel

4. **Cloudflare Speed Settings (Optional):**
   - Enable **Auto Minify** (HTML, CSS, JS)
   - Enable **Brotli** compression
   - Enable **HTTP/2** and **HTTP/3**

5. **Update Vercel Domain Settings:**
   - In Vercel Dashboard → **Settings** → **Domains**
   - Add your domain: `sealevelstudio.xyz`
   - Vercel will verify the DNS records
   - Once verified, SSL certificates are automatically provisioned

### Step 4: Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables, add:

```env
# Solana RPC
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key
NEXT_PUBLIC_HELIUS_FAST_RPC=https://sender.helius-rpc.com/fast

# AI Configuration
LOCAL_AI_ENABLED=false
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key

# Attestation Program
NEXT_PUBLIC_ATTESTATION_PROGRAM_ID=AeK2u45NkNvAcgZuYyCWqmRuCsnXPvcutR3pziXF1cDw

# App URL
NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz
NEXT_PUBLIC_BASE_URL=https://sealevelstudio.xyz

# Webhook Secret (if using Helius webhooks)
HELIUS_WEBHOOK_SECRET=your_webhook_secret

# Social Bot APIs (if using)
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret
SUBSTACK_API_KEY=your_substack_key
TELEGRAM_BOT_TOKEN=your_telegram_token
```

### Step 5: Update Webhook URLs

If you're using Helius webhooks, update the webhook URL in Helius dashboard:
- Old: `https://abc123.ngrok.io/api/webhooks/helius`
- New: `https://sealevelstudio.xyz/api/webhooks/helius`

### Step 6: Cloudflare Tunnel for Development (Optional)

For local development with webhooks and OAuth callbacks, you can use Cloudflare Tunnel alongside Vercel:

1. **Production**: Use Vercel deployment at `https://sealevelstudio.xyz`
2. **Development**: Use Cloudflare Tunnel at `https://dev.yourdomain.com` pointing to `localhost:3000`

This allows you to:
- Test webhooks locally
- Test OAuth callbacks locally
- Share your dev environment securely

See [CLOUDFLARE_TUNNEL_SETUP.md](./CLOUDFLARE_TUNNEL_SETUP.md) for detailed setup instructions.

**Quick Start:**
```bash
# Install cloudflared
brew install cloudflare/cloudflare/cloudflared

# Login
cloudflared tunnel login

# Create tunnel for dev
cloudflared tunnel create sealevel-dev

# Start tunnel
cloudflared tunnel run sealevel-dev
```

Then update your `.env.local`:
```env
# Development with Cloudflare Tunnel
NEXT_PUBLIC_APP_URL=https://dev.yourdomain.com

# Production (Vercel)
# NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz
```

---

## 🌐 Option 2: Railway

### Step 1: Deploy to Railway

1. **Install Railway CLI**:
   ```bash
   npm i -g @railway/cli
   ```

2. **Login**:
   ```bash
   railway login
   ```

3. **Initialize and Deploy**:
   ```bash
   railway init
   railway up
   ```

   Or deploy via Railway dashboard:
   - Connect your GitHub repository
   - Railway will auto-detect Next.js
   - Deploy automatically on push

### Step 2: Add Custom Domain

1. **Via Railway Dashboard**:
   - Go to your project on [railway.app](https://railway.app)
   - Navigate to **Settings** → **Networking**
   - Click **Custom Domain** or **Add Domain**
   - Enter: `sealevelstudio.xyz`
   - Railway will provide DNS configuration instructions

2. **Via Railway CLI**:
   ```bash
   railway domain add sealevelstudio.xyz
   ```

### Step 3: Configure DNS Records

Railway will provide specific DNS values. Typically, you'll add:

**For Root Domain (sealevelstudio.xyz):**
```
Type: CNAME
Name: @
Value: [Railway-provided CNAME value]
```

**For WWW Subdomain (www.sealevelstudio.xyz):**
```
Type: CNAME
Name: www
Value: [Railway-provided CNAME value]
```

**Note:** Railway provides the exact CNAME value in the dashboard after adding the domain.

### Step 4: Configure Environment Variables

In Railway Dashboard → **Variables**, add:

```env
# App URL (IMPORTANT!)
NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz
NEXT_PUBLIC_BASE_URL=https://sealevelstudio.xyz

# Solana RPC
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_api_key

# AI Configuration
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
GEMINI_API_KEY=your_gemini_key

# Twitter OAuth
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# Other API keys...
BIRDEYE_API_KEY=your_birdeye_key
JUPITER_API_KEY=your_jupiter_key
TELEGRAM_BOT_TOKEN=your_telegram_token
```

**To add variables via CLI:**
```bash
railway variables set NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz
railway variables set NEXT_PUBLIC_BASE_URL=https://sealevelstudio.xyz
# ... add other variables
```

### Step 5: Update Twitter OAuth Callback

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

After adding environment variables, trigger a redeploy:

```bash
railway up
```

Or push a commit to trigger automatic deployment.

### Railway-Specific Notes

- **Automatic SSL**: Railway automatically provisions SSL certificates for custom domains
- **Port Configuration**: Railway auto-detects Next.js and sets PORT automatically
- **Build Settings**: Railway auto-detects `npm run build` and `npm start`
- **Environment**: Variables are encrypted and secure in Railway dashboard

---

## 🐳 Option 3: Docker + Custom Server

### Step 1: Create Production Dockerfile

Create `Dockerfile.prod`:

```dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build Next.js
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### Step 2: Update next.config.js

Add output configuration:

```js
const nextConfig = {
  // ... existing config
  output: 'standalone', // Enable standalone output for Docker
}
```

### Step 3: Build and Run

```bash
# Build Docker image
docker build -f Dockerfile.prod -t sealevel-studio .

# Run container
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz \
  -e NEXT_PUBLIC_BASE_URL=https://sealevelstudio.xyz \
  -e NEXT_PUBLIC_SOLANA_RPC_MAINNET=... \
  # ... other env vars
  sealevel-studio
```

### Step 4: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/sealevelstudio.xyz`:

```nginx
server {
    listen 80;
    server_name sealevelstudio.xyz www.sealevelstudio.xyz;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/sealevelstudio.xyz /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Configure SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d sealevelstudio.xyz -d www.sealevelstudio.xyz
```

---

## 🔧 Option 4: Render

### Step 1: Deploy to Render

1. Connect your GitHub repository to Render
2. Create new **Web Service**
3. Configure:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

### Step 2: Add Custom Domain

1. In Render dashboard → **Settings** → **Custom Domains**
2. Add your domain
3. Configure DNS as instructed

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All environment variables are set
- [ ] `NEXT_PUBLIC_APP_URL` matches your domain
- [ ] API keys are configured (Helius, AI providers, etc.)
- [ ] Webhook URLs are updated (if using)
- [ ] Database/Redis connections are configured (if using)
- [ ] Build passes locally: `npm run build`
- [ ] Test production build: `npm start`

---

## 🔐 Security Considerations

1. **Environment Variables**: Never commit `.env.local` to git
2. **API Keys**: Use Vercel/Platform secrets management
3. **CORS**: Configure if needed in `next.config.js`
4. **Rate Limiting**: Consider adding rate limiting for API routes
5. **HTTPS**: Always use HTTPS in production (most platforms auto-configure)

---

## 🐛 Troubleshooting

### Domain Not Resolving

1. **Check DNS Propagation**: Use [dnschecker.org](https://dnschecker.org)
2. **Wait for Propagation**: DNS changes can take 24-48 hours
3. **Verify DNS Records**: Ensure A/CNAME records are correct

### Build Fails

1. **Check Node Version**: Ensure platform supports Node 18+
2. **Check Environment Variables**: All required vars must be set
3. **Check Build Logs**: Review platform build logs for errors

### API Routes Not Working

1. **Check API Route Paths**: Ensure routes are in `app/api/`
2. **Check Environment Variables**: Server-side vars must be set
3. **Check CORS**: If calling from different domain

---

## 📚 Additional Resources

- [Vercel Deployment Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Custom Domain Setup](https://vercel.com/docs/concepts/projects/domains)

---

## 🎯 Recommended Setup

For Sealevel Studio, we recommend:

1. **Vercel** for hosting (easiest Next.js deployment)
2. **Cloudflare** for DNS (fast propagation, free SSL)
3. **Environment Variables** via Vercel dashboard
4. **Automatic SSL** via Vercel (free)

This combination provides:
- ✅ Fast global CDN
- ✅ Automatic SSL certificates
- ✅ Easy environment variable management
- ✅ Automatic deployments from Git
- ✅ Preview deployments for PRs

