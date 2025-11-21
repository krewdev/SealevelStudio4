# Helius Webhooks Configuration Guide

This guide explains how to configure Helius webhooks to monitor Solana transactions relevant to pool scanning, arbitrage detection, and DEX interactions.

## Overview

Helius webhooks allow you to receive real-time notifications about specific Solana transactions. This is useful for:
- **Pool Updates**: Detect when new pools are created or existing pools are modified
- **Arbitrage Opportunities**: Monitor swaps that might create arbitrage opportunities
- **Price Changes**: Track liquidity changes that affect pool prices
- **Transaction Monitoring**: Watch for specific DEX interactions

## Recommended Transaction Types to Monitor

### 1. Pool Creation & Updates

Monitor transactions that create or modify liquidity pools:

**Orca Whirlpools:**
- **Program ID**: `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc`
- **Instructions to Monitor**:
  - `initializePool` - New pool creation
  - `updateFeesAndRewards` - Fee changes
  - `setRewardEmissions` - Reward emissions updates

**Raydium AMM:**
- **Program ID**: `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8`
- **Instructions to Monitor**:
  - `initialize` - New pool creation
  - `updatePool` - Pool parameter updates
  - `deposit` - Liquidity additions
  - `withdraw` - Liquidity removals

**Raydium CLMM (Concentrated Liquidity):**
- **Program ID**: `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK`
- **Instructions to Monitor**:
  - `initialize` - New pool creation
  - `openPosition` - New position opened
  - `closePosition` - Position closed
  - `swap` - Swaps within CLMM pools

**Meteora DLMM:**
- **Program ID**: `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo`
- **Instructions to Monitor**:
  - `initializePool` - New pool creation
  - `updatePool` - Pool updates

**Lifinity:**
- **Program ID**: `EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S`
- **Instructions to Monitor**:
  - `initialize` - New pool creation
  - `swap` - Swaps that affect pool state

### 2. Swap Transactions

Monitor all swap transactions across DEXs to detect arbitrage opportunities:

**Jupiter Aggregator:**
- **Program ID**: `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` (v6)
- **Instructions to Monitor**:
  - `route` - All swap routes
  - `swap` - Direct swaps

**Orca Swaps:**
- **Program ID**: `9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP` (Orca Swap)
- **Instructions to Monitor**:
  - `swap` - All swap transactions

**Raydium Swaps:**
- Monitor swap instructions in the Raydium AMM program

### 3. Liquidity Changes

Monitor transactions that add or remove liquidity (affects pool prices):

**All DEXs:**
- `deposit` / `addLiquidity` - Increases liquidity
- `withdraw` / `removeLiquidity` - Decreases liquidity
- `harvest` - Reward claims (may affect pool state)

## Helius Webhook Configuration

### Step 1: Local Development Setup

**⚠️ Important**: Helius cannot send webhooks directly to `localhost`. You need to expose your local server to the internet using a tunneling service.

#### Option 1: Using ngrok (Recommended)

1. **Install ngrok**:
   ```bash
   # macOS
   brew install ngrok
   
   # Or download from https://ngrok.com/
   ```

2. **Start your Next.js dev server**:
   ```bash
   npm run dev
   # Server runs on http://localhost:3000
   ```

3. **Expose localhost with ngrok**:
   ```bash
   ngrok http 3000
   ```

4. **Copy the ngrok URL** (e.g., `https://abc123.ngrok.io`)

5. **Use this URL in Helius webhook configuration**:
   ```
   https://abc123.ngrok.io/api/webhooks/helius
   ```

#### Option 2: Using Cloudflare Tunnel (Free)

1. **Install cloudflared**:
   ```bash
   brew install cloudflared
   ```

2. **Create tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

3. **Use the provided URL** in Helius webhook configuration

#### Option 3: Using localtunnel (Free, No Signup)

1. **Install localtunnel**:
   ```bash
   npm install -g localtunnel
   ```

2. **Start tunnel**:
   ```bash
   lt --port 3000
   ```

3. **Use the provided URL** in Helius webhook configuration

#### Option 4: Deploy to Staging/Production

For production, deploy your app and use your actual domain:
```
https://your-domain.com/api/webhooks/helius
```

### Step 2: Create Webhook in Helius Dashboard

1. Go to [Helius Dashboard](https://dashboard.helius.dev/)
2. Navigate to **Webhooks** section
3. Click **Create Webhook**

### Step 3: Configure Webhook Settings

**Basic Configuration (Production):**
```json
{
  "webhookURL": "https://your-domain.com/api/webhooks/helius",
  "transactionTypes": ["ANY"],
  "accountAddresses": [],
  "webhookType": "enhanced"
}
```

**Local Development (with ngrok):**
```json
{
  "webhookURL": "https://abc123.ngrok.io/api/webhooks/helius",
  "transactionTypes": ["ANY"],
  "accountAddresses": [],
  "webhookType": "enhanced"
}
```

**Recommended Configuration for Pool Monitoring:**

```json
{
  "webhookURL": "https://your-domain.com/api/webhooks/helius",
  "transactionTypes": ["ANY"],
  "accountAddresses": [
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",  // Orca Whirlpools
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",  // Raydium AMM
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",  // Raydium CLMM
    "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",  // Meteora DLMM
    "EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S",  // Lifinity
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"   // Jupiter v6
  ],
  "webhookType": "enhanced",
  "encoding": "jsonParsed"
}
```

**For Arbitrage Detection (Swaps Only):**

```json
{
  "webhookURL": "https://your-domain.com/api/webhooks/helius",
  "transactionTypes": ["SWAP"],
  "accountAddresses": [
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",  // Orca
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",  // Raydium
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"   // Jupiter
  ],
  "webhookType": "enhanced",
  "encoding": "jsonParsed"
}
```

**For Pool Creation Only:**

```json
{
  "webhookURL": "https://your-domain.com/api/webhooks/helius",
  "transactionTypes": ["ANY"],
  "accountAddresses": [
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",  // Orca
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",  // Raydium
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",  // Raydium CLMM
    "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"   // Meteora
  ],
  "webhookType": "enhanced",
  "encoding": "jsonParsed",
  "filter": {
    "instructions": [
      {
        "programId": "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
        "instructionNames": ["initializePool"]
      },
      {
        "programId": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
        "instructionNames": ["initialize"]
      }
    ]
  }
}
```

### Step 3: Transaction Types

Helius supports these transaction types:

- **`ANY`**: All transactions (high volume, use filters)
- **`SWAP`**: Swap transactions only
- **`NFT_SALE`**: NFT sales
- **`NFT_MINT`**: NFT mints
- **`NFT_TRANSFER`**: NFT transfers
- **`TRANSFER`**: Token transfers
- **`BURN`**: Token burns

### Step 4: Webhook Types

- **`enhanced`**: Detailed transaction data with parsed instructions (recommended)
- **`raw`**: Raw transaction data (less detailed, faster)

## Recommended Webhook Strategies

### Strategy 1: Comprehensive Pool Monitoring

Monitor all DEX program interactions:

```json
{
  "webhookURL": "https://your-domain.com/api/webhooks/helius",
  "transactionTypes": ["ANY"],
  "accountAddresses": [
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
    "EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S"
  ],
  "webhookType": "enhanced",
  "encoding": "jsonParsed"
}
```

**Use Case**: Real-time pool updates, new pool detection, liquidity changes

### Strategy 2: Arbitrage-Focused

Monitor only swap transactions:

```json
{
  "webhookURL": "https://your-domain.com/api/webhooks/helius",
  "transactionTypes": ["SWAP"],
  "accountAddresses": [
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
  ],
  "webhookType": "enhanced",
  "encoding": "jsonParsed"
}
```

**Use Case**: Detect arbitrage opportunities from swap activity

### Strategy 3: Pool Creation Only

Monitor only pool initialization:

```json
{
  "webhookURL": "https://your-domain.com/api/webhooks/helius",
  "transactionTypes": ["ANY"],
  "accountAddresses": [
    "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
    "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
    "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo"
  ],
  "webhookType": "enhanced",
  "encoding": "jsonParsed",
  "filter": {
    "instructions": [
      {
        "programId": "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
        "instructionNames": ["initializePool"]
      },
      {
        "programId": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8",
        "instructionNames": ["initialize"]
      },
      {
        "programId": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK",
        "instructionNames": ["initialize"]
      },
      {
        "programId": "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo",
        "instructionNames": ["initializePool"]
      }
    ]
  }
}
```

**Use Case**: Detect new pools as they're created

## Program IDs Reference

| DEX | Program ID | Purpose |
|-----|------------|---------|
| Orca Whirlpools | `whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc` | Concentrated liquidity pools |
| Raydium AMM | `675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8` | Traditional AMM pools |
| Raydium CLMM | `CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK` | Concentrated liquidity market maker |
| Meteora DLMM | `LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo` | Dynamic liquidity market maker |
| Lifinity | `EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S` | AMM with active market making |
| Jupiter v6 | `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4` | Aggregator swaps |

## Testing Your Webhook Locally

### Quick Test with ngrok

1. **Start your dev server**:
   ```bash
   npm run dev
   ```

2. **Start ngrok**:
   ```bash
   ngrok http 3000
   ```

3. **Copy the ngrok URL** and configure it in Helius dashboard

4. **Test the webhook**:
   ```bash
   # Test endpoint directly
   curl https://abc123.ngrok.io/api/webhooks/helius
   
   # Should return webhook status
   ```

5. **Monitor webhook calls**:
   - Check ngrok web interface: http://localhost:4040
   - Check your Next.js console for incoming requests
   - Check Helius dashboard for webhook delivery status

### Troubleshooting

**Webhook not receiving data?**
- Verify ngrok is running and URL is correct
- Check Helius dashboard for webhook delivery errors
- Ensure your Next.js server is running on port 3000
- Check firewall/network settings

**ngrok URL changes?**
- Free ngrok URLs change on restart
- Use ngrok's reserved domains (paid) for stable URLs
- Or update webhook URL in Helius dashboard each time

## Next Steps

1. **✅ Webhook Endpoint Created**: `/api/webhooks/helius/route.ts` is ready
2. **Process Transactions**: Webhook handler parses DEX transactions
3. **Update Cache**: TODO - Refresh pool cache when new pools are detected
4. **Trigger Arbitrage Scan**: TODO - Run arbitrage detection when swaps occur

See `app/api/webhooks/helius/route.ts` for the webhook handler implementation.

