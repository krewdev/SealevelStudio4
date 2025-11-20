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
   - Enter your custom domain (e.g., `sealevelstudio.com`)
   - Follow DNS configuration instructions

2. **Via CLI**:
   ```bash
   vercel domains add sealevelstudio.com
   ```

### Step 3: Configure DNS

Add these DNS records to your domain provider:

**For Root Domain (sealevelstudio.com):**
```
Type: A
Name: @
Value: 76.76.21.21
```

**For WWW Subdomain (www.sealevelstudio.com):**
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
NEXT_PUBLIC_APP_URL=https://sealevelstudio.com

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
- New: `https://sealevelstudio.com/api/webhooks/helius`

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

### Step 2: Add Custom Domain

1. In Railway dashboard → **Settings** → **Networking**
2. Click **Generate Domain** or **Add Custom Domain**
3. Enter your domain
4. Configure DNS as instructed by Railway

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
  -e NEXT_PUBLIC_APP_URL=https://sealevelstudio.com \
  -e NEXT_PUBLIC_SOLANA_RPC_MAINNET=... \
  # ... other env vars
  sealevel-studio
```

### Step 4: Configure Nginx Reverse Proxy

Create `/etc/nginx/sites-available/sealevelstudio.com`:

```nginx
server {
    listen 80;
    server_name sealevelstudio.com www.sealevelstudio.com;

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
sudo ln -s /etc/nginx/sites-available/sealevelstudio.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 5: Configure SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d sealevelstudio.com -d www.sealevelstudio.com
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

