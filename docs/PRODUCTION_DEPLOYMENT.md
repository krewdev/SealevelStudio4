# Production Deployment Guide

This guide covers deploying Sealevel Studio to production environments.

## 📋 Pre-Deployment Checklist

Before deploying to production, ensure:

- [ ] All environment variables are configured (see `.env.production.template`)
- [ ] Production API keys are obtained and configured
- [ ] `NEXT_PUBLIC_APP_URL` is set to your production domain
- [ ] Webhook URLs are updated to production domain
- [ ] OAuth callback URLs match production domain
- [ ] Database/Redis connections are configured (if using)
- [ ] Build passes locally: `npm run build`
- [ ] Production build tested: `npm start`
- [ ] Security headers are configured
- [ ] SSL/TLS certificates are set up
- [ ] Monitoring and error tracking are configured

## 🚀 Quick Start

### Option 1: Automated Deployment Script

```bash
# Deploy to Vercel
./scripts/deploy-production.sh vercel

# Build Docker image
./scripts/deploy-production.sh docker

# Deploy to Railway
./scripts/deploy-production.sh railway
```

### Option 2: Manual Deployment

Follow the platform-specific instructions below.

---

## 🌐 Platform-Specific Deployment

### Vercel (Recommended)

Vercel is the easiest and most optimized platform for Next.js applications.

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login

```bash
vercel login
```

#### Step 3: Configure Environment Variables

1. Go to [Vercel Dashboard](https://vercel.com)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all variables from `.env.production.template`
5. Set environment to **Production**

#### Step 4: Deploy

```bash
# Link project (first time only)
vercel link

# Deploy to production
vercel --prod
```

#### Step 5: Configure Custom Domain

1. In Vercel Dashboard → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter your domain
4. Follow DNS configuration instructions

**DNS Configuration:**

For root domain:
```
Type: A
Name: @
Value: 76.76.21.21
```

For www subdomain:
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

#### Vercel Environment Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# Application
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Solana RPC
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_NETWORK=mainnet

# API Keys (Server-side)
HELIUS_API_KEY=your_production_key
BIRDEYE_API_KEY=your_production_key
JUPITER_API_KEY=your_production_key

# API Keys (Client-side)
NEXT_PUBLIC_HELIUS_API_KEY=your_production_key
NEXT_PUBLIC_BIRDEYE_API_KEY=your_production_key

# AI Configuration
AI_PROVIDER=gemini
AI_MODEL=gemini-2.0-flash-exp
GEMINI_API_KEY=your_production_key

# VeriSol
NEXT_PUBLIC_VERISOL_PROGRAM_ID=mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6
NEXT_PUBLIC_VERISOL_MERKLE_TREE=your_production_tree_address

# Platform Fees
NEXT_PUBLIC_PLATFORM_FEE_ADDRESS=your_production_fee_address

# Webhooks
HELIUS_WEBHOOK_SECRET=your_secure_webhook_secret

# Social APIs (if using)
TWITTER_CLIENT_ID=your_production_client_id
TWITTER_CLIENT_SECRET=your_production_client_secret
TWITTER_CALLBACK_URL=https://your-domain.com/api/twitter/auth/callback
```

---

### Docker Deployment

#### Step 1: Build Production Image

```bash
docker build -f Dockerfile.prod -t sealevel-studio:latest .
```

#### Step 2: Create Production Environment File

```bash
cp .env.production.template .env.production.local
# Edit .env.production.local with your production values
```

#### Step 3: Run Container

```bash
docker run -d \
  --name sealevel-studio \
  -p 3000:3000 \
  --env-file .env.production.local \
  --restart unless-stopped \
  sealevel-studio:latest
```

#### Step 4: Verify

```bash
# Check logs
docker logs sealevel-studio

# Check health
curl http://localhost:3000/api/health
```

#### Docker Compose (Production)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.prod
    container_name: sealevel-studio
    ports:
      - "3000:3000"
    env_file:
      - .env.production.local
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  redis:
    image: redis:7-alpine
    container_name: sealevel-redis-prod
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-}
    restart: unless-stopped

volumes:
  redis-data:
    driver: local
```

Deploy:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

### Railway Deployment

#### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

#### Step 2: Login

```bash
railway login
```

#### Step 3: Initialize Project

```bash
railway init
```

#### Step 4: Add Environment Variables

```bash
# Add variables one by one
railway variables set NEXT_PUBLIC_APP_URL=https://your-domain.com
railway variables set HELIUS_API_KEY=your_key

# Or upload from file
railway variables < .env.production.local
```

#### Step 5: Deploy

```bash
railway up
```

#### Step 6: Configure Custom Domain

1. In Railway Dashboard → **Settings** → **Networking**
2. Click **Generate Domain** or **Add Custom Domain**
3. Configure DNS as instructed

---

### Render Deployment

#### Step 1: Connect Repository

1. Go to [Render Dashboard](https://render.com)
2. Click **New** → **Web Service**
3. Connect your GitHub repository

#### Step 2: Configure Service

- **Name**: sealevel-studio
- **Environment**: Node
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Plan**: Choose appropriate plan

#### Step 3: Add Environment Variables

In **Environment** section, add all variables from `.env.production.template`

#### Step 4: Deploy

Click **Create Web Service** and wait for deployment.

#### Step 5: Configure Custom Domain

1. Go to **Settings** → **Custom Domains**
2. Add your domain
3. Configure DNS as instructed

---

## 🔧 Production Configuration

### Environment Variables

Copy `.env.production.template` to `.env.production.local` and fill in:

```bash
cp .env.production.template .env.production.local
```

**Required Variables:**

- `NEXT_PUBLIC_APP_URL` - Your production domain
- `NEXT_PUBLIC_SOLANA_RPC_MAINNET` - Production RPC endpoint
- `HELIUS_API_KEY` - Production Helius API key
- `NEXT_PUBLIC_HELIUS_API_KEY` - Client-side Helius key

**Recommended Variables:**

- `REDIS_ENABLED=true` - Enable Redis for caching
- `REDIS_URL` - Redis connection URL
- `AI_PROVIDER=gemini` - AI provider
- `GEMINI_API_KEY` - Gemini API key
- `ADMIN_API_TOKEN` - Secure admin token

### Build Configuration

The production build is optimized with:

- ✅ Standalone output for Docker
- ✅ Code splitting and tree shaking
- ✅ Image optimization (AVIF/WebP)
- ✅ Security headers
- ✅ Compression enabled
- ✅ Source maps disabled

### Security Headers

Production security headers are automatically configured:

- `Strict-Transport-Security` - Force HTTPS
- `X-Frame-Options` - Prevent clickjacking
- `X-Content-Type-Options` - Prevent MIME sniffing
- `X-XSS-Protection` - XSS protection
- `Referrer-Policy` - Control referrer information

---

## 🔐 Security Best Practices

### 1. Environment Variables

- ✅ Never commit `.env.production.local` to git
- ✅ Use platform secrets management (Vercel, AWS Secrets Manager)
- ✅ Rotate API keys regularly
- ✅ Use different keys for production vs development

### 2. API Keys

- ✅ Use production-grade keys with higher rate limits
- ✅ Monitor API usage and rate limits
- ✅ Set up alerts for unusual activity
- ✅ Use server-side keys when possible (no `NEXT_PUBLIC_` prefix)

### 3. Webhooks

- ✅ Use secure webhook secrets
- ✅ Validate webhook signatures
- ✅ Update webhook URLs to production domain
- ✅ Monitor webhook delivery

### 4. OAuth

- ✅ Update callback URLs to production domain
- ✅ Use OAuth 2.0 (not direct tokens)
- ✅ Store tokens securely
- ✅ Implement token refresh

### 5. Monitoring

- ✅ Set up error tracking (Sentry, LogRocket)
- ✅ Monitor API rate limits
- ✅ Track performance metrics
- ✅ Set up alerts for critical errors

---

## 📊 Monitoring & Logging

### Error Tracking

Recommended services:

- **Sentry**: [sentry.io](https://sentry.io)
- **LogRocket**: [logrocket.com](https://logrocket.com)
- **Rollbar**: [rollbar.com](https://rollbar.com)

### Performance Monitoring

- **Vercel Analytics**: Built-in with Vercel
- **Google Analytics**: Add tracking code
- **Web Vitals**: Monitor Core Web Vitals

### Logging

Configure log levels:

```env
LOG_LEVEL=warn  # Production: warn, error
ENABLE_ERROR_TRACKING=true
ENABLE_PERFORMANCE_MONITORING=true
```

---

## 🧪 Testing Production Build

### Local Testing

```bash
# Build production bundle
npm run build

# Start production server
npm start

# Test in browser
open http://localhost:3000
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

### Verify Environment Variables

```bash
# Check if variables are loaded
node -e "console.log(process.env.NEXT_PUBLIC_APP_URL)"
```

---

## 🔄 Updating Production

### Vercel

```bash
# Automatic on git push to main branch
git push origin main

# Or manual deploy
vercel --prod
```

### Docker

```bash
# Rebuild and restart
docker build -f Dockerfile.prod -t sealevel-studio:latest .
docker stop sealevel-studio
docker rm sealevel-studio
docker run -d --name sealevel-studio -p 3000:3000 --env-file .env.production.local sealevel-studio:latest
```

### Railway

```bash
# Automatic on git push
git push origin main

# Or manual deploy
railway up
```

---

## 🐛 Troubleshooting

### Build Fails

1. **Check Node version**: Ensure Node 18+ is used
2. **Check environment variables**: All required vars must be set
3. **Check build logs**: Review platform build logs
4. **Test locally**: `npm run build` should work locally

### API Routes Not Working

1. **Check environment variables**: Server-side vars must be set
2. **Check API route paths**: Ensure routes are in `app/api/`
3. **Check CORS**: If calling from different domain
4. **Check logs**: Review server logs for errors

### Environment Variables Not Loading

1. **Restart server**: After adding variables
2. **Check prefix**: `NEXT_PUBLIC_` for client-side
3. **Check platform**: Variables must be set in platform dashboard
4. **Verify format**: No quotes around values

### Performance Issues

1. **Enable Redis**: For caching
2. **Check RPC endpoints**: Use production-grade endpoints
3. **Monitor API limits**: Check rate limit usage
4. **Optimize images**: Use Next.js Image component
5. **Enable CDN**: Use Vercel or Cloudflare

---

## 📚 Additional Resources

- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Vercel Documentation](https://vercel.com/docs)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Environment Variables Guide](./ENVIRONMENT_VARIABLES.md)
- [Custom Domain Setup](./DEPLOYMENT_CUSTOM_DOMAIN.md)

---

## ✅ Post-Deployment Checklist

After deployment:

- [ ] Verify site is accessible
- [ ] Test all API endpoints
- [ ] Verify webhook delivery
- [ ] Test OAuth flows
- [ ] Check error tracking is working
- [ ] Monitor performance metrics
- [ ] Set up alerts
- [ ] Document deployment process
- [ ] Backup environment variables
- [ ] Update documentation

---

## 🎯 Recommended Production Setup

For Sealevel Studio, we recommend:

1. **Hosting**: Vercel (easiest Next.js deployment)
2. **DNS**: Cloudflare (fast propagation, free SSL)
3. **CDN**: Vercel Edge Network (automatic)
4. **Caching**: Redis (for API responses)
5. **Monitoring**: Sentry (error tracking)
6. **Analytics**: Vercel Analytics (built-in)

This combination provides:

- ✅ Fast global CDN
- ✅ Automatic SSL certificates
- ✅ Easy environment variable management
- ✅ Automatic deployments from Git
- ✅ Preview deployments for PRs
- ✅ Built-in analytics
- ✅ Edge functions support

---

## 💡 Tips

1. **Start Small**: Deploy to staging first, then production
2. **Monitor Closely**: Watch logs and metrics after deployment
3. **Test Thoroughly**: Test all features in production
4. **Backup Everything**: Keep backups of configs and keys
5. **Document Changes**: Document all configuration changes
6. **Use Secrets Management**: Never hardcode secrets
7. **Enable Logging**: Keep detailed logs for debugging
8. **Set Up Alerts**: Get notified of issues immediately

---

Need help? Check the [troubleshooting section](#-troubleshooting) or open an issue on GitHub.
