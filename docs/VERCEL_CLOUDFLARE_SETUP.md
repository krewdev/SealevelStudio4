# Vercel + Cloudflare Integration Guide

This guide shows you how to use Cloudflare with Vercel for maximum performance, security, and flexibility.

## Overview

You can use Cloudflare with Vercel in two ways:

1. **Cloudflare DNS + Vercel Hosting** (Recommended)
   - Use Cloudflare as DNS provider
   - Get Cloudflare's DDoS protection, CDN, and security features
   - Vercel handles the hosting and deployment

2. **Cloudflare Tunnel for Development**
   - Use Cloudflare Tunnel for local development
   - Use Vercel for production
   - Best of both worlds

## Option 1: Cloudflare DNS + Vercel (Production)

### Benefits

✅ **DDoS Protection**: Cloudflare's network protects your site  
✅ **CDN Caching**: Faster global content delivery  
✅ **SSL/TLS**: Automatic HTTPS with Cloudflare  
✅ **Analytics**: Built-in analytics and insights  
✅ **Firewall Rules**: Advanced security rules  
✅ **Vercel Hosting**: Optimized Next.js hosting  

### Setup Steps

#### 1. Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

#### 2. Add Domain to Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Click **Add a Site**
3. Enter your domain: `sealevelstudio.xyz`
4. Select a plan (Free tier works great)
5. Update nameservers at your domain registrar

#### 3. Configure DNS in Cloudflare

In Cloudflare Dashboard → **DNS** → **Records**, add:

**Root Domain:**
```
Type: CNAME
Name: @
Target: cname.vercel-dns.com
Proxy status: Proxied (orange cloud) ✅
TTL: Auto
```

**WWW Subdomain:**
```
Type: CNAME
Name: www
Target: cname.vercel-dns.com
Proxy status: Proxied (orange cloud) ✅
TTL: Auto
```

#### 4. Add Domain in Vercel

1. Go to Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Click **Add Domain**
3. Enter: `sealevelstudio.xyz`
4. Enter: `www.sealevelstudio.xyz`
5. Vercel will verify DNS records (may take a few minutes)

#### 5. Configure Cloudflare SSL/TLS

1. Go to Cloudflare Dashboard → **SSL/TLS**
2. Set encryption mode to **Full (strict)**
3. This ensures secure connection between Cloudflare and Vercel

#### 6. Optimize Cloudflare Settings

**Speed:**
- **Auto Minify**: Enable for HTML, CSS, JS
- **Brotli**: Enable
- **HTTP/2**: Enable
- **HTTP/3 (with QUIC)**: Enable

**Caching:**
- **Caching Level**: Standard
- **Browser Cache TTL**: 4 hours (or longer for static assets)

**Security:**
- **Security Level**: Medium (or High for production)
- **Bot Fight Mode**: Enable
- **Challenge Passage**: 30 minutes

#### 7. Update Environment Variables

In Vercel Dashboard → **Settings** → **Environment Variables**:

```env
NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz
NEXT_PUBLIC_BASE_URL=https://sealevelstudio.xyz
```

## Option 2: Cloudflare Tunnel for Development

Use Cloudflare Tunnel for local development while using Vercel for production.

### Setup

1. **Install cloudflared**:
   ```bash
   brew install cloudflare/cloudflare/cloudflared
   ```

2. **Login to Cloudflare**:
   ```bash
   cloudflared tunnel login
   ```

3. **Create development tunnel**:
   ```bash
   cloudflared tunnel create sealevel-dev
   cloudflared tunnel route dns sealevel-dev dev.yourdomain.com
   ```

4. **Start tunnel** (in separate terminal):
   ```bash
   cloudflared tunnel run sealevel-dev
   ```

5. **Run Next.js dev server**:
   ```bash
   npm run dev
   ```

6. **Update `.env.local`**:
   ```env
   NEXT_PUBLIC_APP_URL=https://dev.yourdomain.com
   ```

### Benefits

- ✅ Test webhooks locally
- ✅ Test OAuth callbacks locally
- ✅ Share dev environment securely
- ✅ No need to expose local IP
- ✅ Automatic HTTPS

## Option 3: Cloudflare Tunnel as Proxy to Vercel

You can also use Cloudflare Tunnel to proxy to your Vercel deployment (less common, but useful for specific use cases):

```yaml
# cloudflared-config.yml
tunnel: <TUNNEL_ID>
credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: sealevelstudio.xyz
    service: https://your-project.vercel.app
  - service: http_status:404
```

This gives you:
- Cloudflare's network in front of Vercel
- Additional caching and security layers
- More control over routing

## Recommended Setup

**For Production:**
- ✅ Use Vercel for hosting (optimized for Next.js)
- ✅ Use Cloudflare for DNS and CDN
- ✅ Enable Cloudflare proxy (orange cloud)
- ✅ Set SSL/TLS to "Full (strict)"

**For Development:**
- ✅ Use Cloudflare Tunnel for local development
- ✅ Point tunnel to `localhost:3000`
- ✅ Use subdomain like `dev.yourdomain.com`
- ✅ Update `.env.local` with tunnel URL

## Environment Variables

### Production (Vercel + Cloudflare DNS)

```env
NEXT_PUBLIC_APP_URL=https://sealevelstudio.xyz
NEXT_PUBLIC_BASE_URL=https://sealevelstudio.xyz
```

### Development (Cloudflare Tunnel)

```env
NEXT_PUBLIC_APP_URL=https://dev.yourdomain.com
NEXT_PUBLIC_BASE_URL=https://dev.yourdomain.com
```

## Troubleshooting

### DNS Not Resolving

- Wait 5-10 minutes for DNS propagation
- Check Cloudflare DNS records are correct
- Verify nameservers are updated at registrar
- Check Vercel domain verification status

### SSL Certificate Issues

- Ensure Cloudflare SSL/TLS is set to "Full (strict)"
- Check Vercel domain is verified
- Wait for SSL certificate provisioning (can take a few minutes)

### Caching Issues

- Clear Cloudflare cache: **Caching** → **Purge Everything**
- Check Cloudflare cache rules
- Verify Vercel edge caching settings

### Performance

- Enable Cloudflare Auto Minify
- Enable Brotli compression
- Check Cloudflare Analytics for insights
- Monitor Vercel Analytics for performance metrics

## Quick Reference

### Cloudflare Dashboard
- **DNS**: https://dash.cloudflare.com → Your Domain → DNS
- **SSL/TLS**: https://dash.cloudflare.com → Your Domain → SSL/TLS
- **Speed**: https://dash.cloudflare.com → Your Domain → Speed
- **Analytics**: https://dash.cloudflare.com → Your Domain → Analytics

### Vercel Dashboard
- **Domains**: https://vercel.com → Your Project → Settings → Domains
- **Environment Variables**: https://vercel.com → Your Project → Settings → Environment Variables
- **Deployments**: https://vercel.com → Your Project → Deployments

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Cloudflare Documentation](https://developers.cloudflare.com/)
- [Cloudflare Tunnel Documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Vercel + Cloudflare Best Practices](https://vercel.com/docs/integrations/cloudflare)

