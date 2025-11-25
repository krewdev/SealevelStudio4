# Production Configuration - Quick Start

## 🚀 Quick Deployment

### Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel --prod
```

### Docker

```bash
# 1. Create production env file
cp .env.production.template .env.production.local
# Edit .env.production.local

# 2. Build and run
docker build -f Dockerfile.prod -t sealevel-studio:latest .
docker run -p 3000:3000 --env-file .env.production.local sealevel-studio:latest
```

### Automated Script

```bash
./scripts/deploy-production.sh vercel
./scripts/deploy-production.sh docker
```

## 📋 Required Environment Variables

**Minimum Required:**

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
HELIUS_API_KEY=your_production_key
NEXT_PUBLIC_HELIUS_API_KEY=your_production_key
NEXT_PUBLIC_SOLANA_NETWORK=mainnet
```

**Recommended:**

```env
# AI
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key

# Redis (for caching)
REDIS_ENABLED=true
REDIS_URL=redis://your-redis-host:6379

# Security
ADMIN_API_TOKEN=$(openssl rand -hex 32)
HELIUS_WEBHOOK_SECRET=$(openssl rand -hex 32)
```

## ✅ Pre-Deployment Checklist

- [ ] Copy `.env.production.template` to `.env.production.local`
- [ ] Fill in all required environment variables
- [ ] Test build: `npm run build`
- [ ] Test production server: `npm start`
- [ ] Verify all API keys are production keys
- [ ] Update webhook URLs to production domain
- [ ] Update OAuth callback URLs

## 📚 Full Documentation

See [docs/PRODUCTION_DEPLOYMENT.md](./docs/PRODUCTION_DEPLOYMENT.md) for complete guide.

## 🔧 Configuration Files

- **Environment Template**: `.env.production.template`
- **Dockerfile**: `Dockerfile.prod`
- **Docker Compose**: `docker-compose.prod.yml`
- **Deployment Script**: `scripts/deploy-production.sh`
- **Vercel Config**: `vercel.json`
- **Next.js Config**: `next.config.js` (production optimizations enabled)

## 🎯 Next Steps

1. Configure environment variables
2. Choose deployment platform
3. Deploy using script or manually
4. Verify deployment
5. Set up monitoring

For detailed instructions, see the [Production Deployment Guide](./docs/PRODUCTION_DEPLOYMENT.md).
