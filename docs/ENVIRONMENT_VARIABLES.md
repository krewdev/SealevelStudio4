# Environment Variables Guide

This document lists all environment variables used in Sealevel Studio and how to configure them.

## Quick Start

1. Copy `env.template` to `.env.local`:
   ```bash
   cp env.template .env.local
   ```

2. Fill in your API keys and configuration values

3. Restart your development server

## Variable Categories

### Solana RPC Endpoints

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SOLANA_RPC_MAINNET` | No | Mainnet RPC endpoint URL |
| `NEXT_PUBLIC_SOLANA_RPC_DEVNET` | No | Devnet RPC endpoint URL |
| `NEXT_PUBLIC_SOLANA_NETWORK` | No | Default network (`mainnet` or `devnet`) |
| `NEXT_PUBLIC_RPC_URL` | No | Fallback RPC URL |

**Example:**
```bash
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_RPC_DEVNET=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
NEXT_PUBLIC_SOLANA_NETWORK=mainnet
```

### Server-side API Keys

These are used in Next.js API routes and are **never exposed to the browser**.

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|--------------|
| `HELIUS_API_KEY` | No | Helius API key for enhanced RPC | [helius.dev](https://www.helius.dev/) |
| `BIRDEYE_API_KEY` | No | Birdeye API key for token prices | [birdeye.so](https://birdeye.so/) |
| `DUNE_API_KEY` | No | Dune Analytics API key | [dune.com](https://dune.com/) |
| `SOLSCAN_API_KEY` | No | Solscan API key | [solscan.io](https://solscan.io/) |
| `JUPITER_API_KEY` | No | Jupiter API key for swaps | [jup.ag](https://jup.ag/) |

### Client-side API Keys

These are prefixed with `NEXT_PUBLIC_` and **will be exposed to the browser**. Only use for APIs that require client-side access.

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_HELIUS_API_KEY` | No | Helius API key for client-side pool fetching |
| `NEXT_PUBLIC_BIRDEYE_API_KEY` | No | Birdeye API key for client-side price fetching |

### WebSocket URLs

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_HELIUS_WS_URL` | No | Helius WebSocket URL for real-time updates |
| `NEXT_PUBLIC_BIRDEYE_WS_URL` | No | Birdeye WebSocket URL for real-time updates |

### VeriSol Protocol

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_VERISOL_PROGRAM_ID` | Yes* | VeriSol program ID |
| `NEXT_PUBLIC_VERISOL_MERKLE_TREE` | Yes* | Merkle tree address for attestations |
| `NEXT_PUBLIC_VERISOL_TREE_AUTHORITY` | No | Tree authority (auto-derived if not set) |
| `NEXT_PUBLIC_VERISOL_BUBBLEGUM_PROGRAM_ID` | No | Metaplex Bubblegum program ID |
| `NEXT_PUBLIC_VERISOL_COMPRESSION_PROGRAM_ID` | No | Metaplex Compression program ID |
| `NEXT_PUBLIC_VERISOL_LOG_WRAPPER` | No | Metaplex Log Wrapper program ID |

*Required if using VeriSol attestation features

### Beta Tester Attestation

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE` | Yes* | Beta tester merkle tree address |
| `NEXT_PUBLIC_BETA_TESTER_COLLECTION_ID` | No | Collection ID for beta tester cNFTs |

*Required if using beta tester attestation features

### SEAL Token

| Variable | Required | Description |
|----------|----------|-------------|
| `SEAL_TREASURY_SEED` | No | Seed phrase for SEAL token treasury |

### AI API Keys

| Variable | Required | Description | Where to Get |
|----------|----------|-------------|-------------|
| `ANTHROPIC_API_KEY` | No | Anthropic Claude API key | [anthropic.com](https://www.anthropic.com/) |
| `OPENAI_API_KEY` | No | OpenAI API key | [openai.com](https://openai.com/) |
| `GEMINI_API_KEY` | No | Google Gemini API key | [ai.google.dev](https://ai.google.dev/) |
| `DEEPSEEK_API_URL` | No | DeepSeek API server URL | Self-hosted |
| `DEEPSEEK_API_KEY` | No | DeepSeek API key | Self-hosted |

### AI Configuration

| Variable | Required | Description | Options |
|----------|----------|-------------|---------|
| `AI_PROVIDER` | No | AI provider to use | `anthropic`, `openai`, `gemini`, `deepseek` |
| `AI_MODEL` | No | AI model name | `gemini-2.0-flash-exp`, `gpt-4`, `claude-3-opus`, etc. |

## Security Best Practices

### 1. Never Commit `.env.local`

The `.env.local` file is already in `.gitignore`. Never commit it to version control.

### 2. Server-side vs Client-side

- **Server-side variables** (no `NEXT_PUBLIC_` prefix): Safe for sensitive keys
- **Client-side variables** (`NEXT_PUBLIC_` prefix): Exposed to browser, use carefully

### 3. Use Different Keys for Environments

- Development: Use test/development API keys
- Production: Use production API keys with higher limits

### 4. Rotate Keys Regularly

Rotate API keys periodically for security.

### 5. Vercel Deployment

For Vercel deployments:

1. Go to **Project Settings → Environment Variables**
2. Add each variable
3. Select environments (Production, Preview, Development)
4. Redeploy after adding variables

## Required vs Optional

Most variables are **optional** and have fallbacks:

- **RPC Endpoints**: Falls back to public Solana RPCs
- **API Keys**: Features work without them but with limited functionality
- **VeriSol**: Required only if using attestation features
- **AI Keys**: Required only if using AI agent features

## Troubleshooting

### Variable Not Working

1. **Restart your dev server** after adding variables
2. **Check spelling** - variable names are case-sensitive
3. **Check prefix** - `NEXT_PUBLIC_` is required for client-side access
4. **Check Vercel** - Variables must be set in Vercel dashboard for production

### Missing Variable Warnings

The app will log warnings for missing required variables. Check the console for details.

### API Rate Limits

If you hit rate limits:
- Add API keys for higher limits
- Use server-side API keys when possible
- Implement request caching

## Getting API Keys

### Helius
1. Sign up at [helius.dev](https://www.helius.dev/)
2. Create a project
3. Copy your API key from the dashboard

### Birdeye
1. Sign up at [birdeye.so](https://birdeye.so/)
2. Go to API section
3. Generate an API key

### Dune Analytics
1. Sign up at [dune.com](https://dune.com/)
2. Go to Settings → API
3. Create an API key

### Solscan
1. Sign up at [solscan.io](https://solscan.io/)
2. Go to API section
3. Generate an API key

### Jupiter
1. Visit [jup.ag](https://jup.ag/)
2. Contact for API access or use public endpoints

### AI Providers
- **Anthropic**: [console.anthropic.com](https://console.anthropic.com/)
- **OpenAI**: [platform.openai.com](https://platform.openai.com/)
- **Gemini**: [ai.google.dev](https://ai.google.dev/)

## Example `.env.local`

```bash
# Solana RPC
NEXT_PUBLIC_SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=abc123
NEXT_PUBLIC_SOLANA_NETWORK=mainnet

# API Keys (Server-side)
HELIUS_API_KEY=your_helius_key
JUPITER_API_KEY=your_jupiter_key

# API Keys (Client-side)
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_key

# VeriSol
NEXT_PUBLIC_VERISOL_PROGRAM_ID=mUQFmu8w9jf4RGd5cHE6Y54y1B7Bou5an5Rvezu9GY6
NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE=your_tree_address

# AI
GEMINI_API_KEY=your_gemini_key
AI_PROVIDER=gemini
AI_MODEL=gemini-2.0-flash-exp
```

## Need Help?

If you're having issues with environment variables:
1. Check the console for error messages
2. Verify variable names match exactly
3. Ensure you've restarted the dev server
4. Check Vercel environment variables for production deployments

