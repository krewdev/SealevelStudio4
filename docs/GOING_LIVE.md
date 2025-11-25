# Going Live - Minimal Configuration Guide

This guide helps you deploy Sealevel Studio to production even if you don't have all environment variables configured yet.

## 🚀 Quick Start - Minimum Required

The **absolute minimum** you need to go live:

```bash
# 1. Set your production URL
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# 2. That's it! The app will work with just this.
```

The app will:
- ✅ Work with public Solana RPCs (rate-limited but functional)
- ✅ Show helpful error messages for features that need configuration
- ✅ Gracefully disable features that require missing variables
- ✅ Allow you to add more variables later without breaking anything

## 📋 Feature Status

### ✅ Works Without Configuration

These features work out of the box with no API keys:

- **Core Application**: All pages and navigation
- **Transaction Builder**: Basic transaction building
- **Pool Explorer**: View pools (using public RPCs)
- **Arbitrage Scanner**: Basic scanning (rate-limited)
- **Wallet Connection**: Connect wallets
- **UI Components**: All UI elements

### ⚠️ Works But Limited

These work but have limitations without API keys:

- **Solana RPC**: Uses public RPCs (slower, rate-limited)
  - **To improve**: Add `NEXT_PUBLIC_SOLANA_RPC_MAINNET`
- **Token Prices**: Limited price data
  - **To improve**: Add `BIRDEYE_API_KEY` or `NEXT_PUBLIC_BIRDEYE_API_KEY`
- **Swaps**: Basic swap functionality (rate-limited)
  - **To improve**: Add `JUPITER_API_KEY`

### 🔒 Disabled Without Configuration

These features will show helpful error messages and be disabled:

- **AI Features**: Service Bot, Marketing Bot, Cybersecurity AI
  - **To enable**: Set `LOCAL_AI_ENABLED=true` and `LOCAL_AI_ENDPOINT` (FREE)
  - **Or**: Add `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `ANTHROPIC_API_KEY`
- **Twitter Bot**: Twitter posting and automation
  - **To enable**: Add `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET`
- **Substack Bot**: Substack posting
  - **To enable**: Add `SUBSTACK_API_KEY`
- **Telegram Bot**: Telegram automation
  - **To enable**: Add `TELEGRAM_BOT_TOKEN`
- **Attestation Features**: Beta tester and presale attestations
  - **To enable**: Add `NEXT_PUBLIC_ATTESTATION_PROGRAM_ID` and merkle tree addresses

## 📊 Check Your Configuration

After deploying, check your configuration status:

```
GET /api/health/config
```

This endpoint shows:
- Which features are enabled
- Which variables are missing
- Recommendations for improvement

**Example Response:**
```json
{
  "status": "healthy",
  "summary": {
    "enabled": 5,
    "total": 10,
    "required": 1,
    "requiredEnabled": 1
  },
  "features": [
    {
      "name": "Core Application",
      "enabled": true,
      "required": true,
      "message": "Core application is configured"
    },
    {
      "name": "AI Features",
      "enabled": false,
      "required": false,
      "message": "No AI provider configured. AI features will be disabled."
    }
  ],
  "recommendations": [
    "💡 Recommended: Enable AI Features, Solana RPC for better performance"
  ]
}
```

## 🎯 Recommended Minimal Setup

For a better experience, add these (in order of priority):

### Priority 1: AI Features (FREE Option)
```bash
# Use local AI - no API keys needed!
LOCAL_AI_ENABLED=true
LOCAL_AI_ENDPOINT=http://localhost:1234/v1
LOCAL_AI_TYPE=lmstudio
LOCAL_AI_MODEL=llama2
```

**Or** if you prefer external APIs:
```bash
# Pick one or more:
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
```

### Priority 2: Better RPC Performance
```bash
# Get a free Helius API key at https://www.helius.dev/
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
HELIUS_API_KEY=your_key
NEXT_PUBLIC_HELIUS_API_KEY=your_key
```

### Priority 3: Enhanced Features
```bash
# Token prices (free tier available)
BIRDEYE_API_KEY=...
NEXT_PUBLIC_BIRDEYE_API_KEY=...

# Better swap rates
JUPITER_API_KEY=...
```

## 🔄 Adding Variables Later

You can add environment variables at any time:

1. **Vercel**: Go to Project Settings → Environment Variables
2. **Railway**: Go to Variables tab
3. **Other platforms**: Add to your platform's environment variable settings

After adding:
- **No code changes needed** - the app detects new variables automatically
- **No redeploy needed** for most variables (Next.js will pick them up)
- **Features will automatically enable** when required variables are present

## 🛡️ Error Handling

The app handles missing variables gracefully:

- **API Routes**: Return `503 Service Unavailable` with helpful messages
- **UI Components**: Show "Feature requires configuration" messages
- **No Crashes**: The app never crashes due to missing variables

**Example Error Message:**
```json
{
  "error": "No AI provider configured",
  "suggestion": "Please set either OPENAI_API_KEY or LOCAL_AI_ENDPOINT",
  "requiresConfiguration": true
}
```

## 📝 Environment Variable Template

Use `env.minimal.template` for the absolute minimum, or `env.template` for all options.

**Copy the minimal template:**
```bash
cp env.minimal.template .env.local
```

Then fill in what you have!

## ✅ Deployment Checklist

Before going live:

- [ ] Set `NEXT_PUBLIC_APP_URL` to your production domain
- [ ] (Optional) Add `LOCAL_AI_ENABLED=true` for AI features
- [ ] (Optional) Add RPC endpoints for better performance
- [ ] Test `/api/health/config` to see what's configured
- [ ] Verify core features work (navigation, wallet connection)
- [ ] Check that disabled features show helpful messages

## 🆘 Troubleshooting

### "Feature not available" messages
- This is normal! Features without required variables are disabled
- Check `/api/health/config` to see what's missing
- Add the required variables to enable features

### Slow performance
- Add RPC endpoints (`NEXT_PUBLIC_SOLANA_RPC_MAINNET`)
- Add Helius API key for faster RPC

### AI features not working
- Set `LOCAL_AI_ENABLED=true` and `LOCAL_AI_ENDPOINT`
- Or add an external AI API key

### Rate limit errors
- Add API keys for the services you're using
- Helius, Birdeye, and Jupiter all have free tiers

## 🎉 You're Ready!

Once you've set `NEXT_PUBLIC_APP_URL`, you can deploy! The app will work, and you can add more features as you get API keys.

**Remember**: You can always add more variables later without breaking anything.

