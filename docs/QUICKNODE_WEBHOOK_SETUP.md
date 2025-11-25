# QuickNode Webhook Setup Guide

Complete guide for setting up QuickNode Stream webhooks with Pump Fun transaction filtering.

## Overview

QuickNode Streams allow you to monitor Solana transactions in real-time using custom filters. This guide shows you how to:
1. Set up a webhook endpoint
2. Configure QuickNode Stream with the Pump Fun filter
3. Test and monitor webhook deliveries

## Step 1: Choose Your Webhook Endpoint

### Option A: Standalone Webhook Server (Recommended for Testing)

**Best for:** Local development and testing

1. **Start the webhook server:**
   ```bash
   npm run webhook:server
   ```
   Server runs on `http://localhost:3000`

2. **Expose with ngrok:**
   ```bash
   ngrok http 3000
   ```

3. **Use this webhook URL:**
   ```
   https://your-ngrok-url.ngrok.io/webhook
   ```

### Option B: Next.js API Route (Production)

**Best for:** Production deployments

1. **Deploy your Next.js app** (Vercel, Railway, etc.)

2. **Use this webhook URL:**
   ```
   https://your-domain.com/api/webhook
   ```

## Step 2: Configure QuickNode Stream

### In QuickNode Dashboard

1. **Navigate to Streams:**
   - Go to [QuickNode Dashboard](https://dashboard.quicknode.com/)
   - Click on **Streams** in the sidebar
   - Click **Create Stream**

2. **Stream Configuration:**
   - **Network:** Solana Mainnet (or Devnet)
   - **Stream Type:** Custom Filter
   - **Webhook URL:** `https://your-ngrok-url.ngrok.io/webhook` (or your production URL)

3. **Custom Filter Setup:**
   - **Filter Type:** Custom JavaScript Filter
   - **Filter Code:** Copy the entire contents of `app/lib/pumpfun/quicknode-filter.js`

### QuickNode Stream Configuration JSON

```json
{
  "network": "solana-mainnet",
  "streamType": "custom",
  "webhookUrl": "https://your-ngrok-url.ngrok.io/webhook",
  "filter": {
    "type": "custom",
    "code": "<paste contents of quicknode-filter.js>"
  },
  "programIds": [
    "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
  ]
}
```

## Step 3: Program ID Configuration

**Pump Fun Program ID:**
```
6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P
```

Add this to your QuickNode Stream filter configuration.

## Step 4: Custom Filter Code

Copy the entire file `app/lib/pumpfun/quicknode-filter.js` into the QuickNode custom filter editor.

**Key points:**
- The filter uses plain JavaScript (compatible with QuickNode's isolated VM)
- Main entry point is the `main()` function
- Returns `null` if no matching transactions found
- Returns array of transaction results if matches found

## Step 5: Test Your Webhook

### Test 1: Health Check

```bash
# If using standalone server
curl http://localhost:3000/health

# If using Next.js API
curl https://your-domain.com/api/webhook
```

### Test 2: Send Test Payload

```bash
curl -X POST https://your-ngrok-url.ngrok.io/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "data": [{
      "parentSlot": 123456789,
      "blockTime": 1234567890,
      "transactions": [{
        "transaction": {
          "signatures": ["test-signature"],
          "message": {
            "instructions": [{
              "programId": "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P",
              "data": "base58-encoded-data"
            }],
            "accountKeys": []
          }
        },
        "meta": {
          "err": null,
          "preBalances": [0],
          "postBalances": [0],
          "preTokenBalances": [],
          "postTokenBalances": []
        }
      }]
    }]
  }'
```

## Step 6: Monitor Webhook Deliveries

### Check Webhook Server Logs

If using standalone server:
```bash
# Terminal running webhook server will show:
📨 WEBHOOK RECEIVED
🔍 Webhook Type: QuickNode Stream
📦 Parsed JSON Data: {...}
```

### Check QuickNode Dashboard

1. Go to **Streams** → Your Stream
2. Click on **Webhook Deliveries**
3. Check delivery status and response codes

### Check ngrok Inspector (if using ngrok)

1. Open http://localhost:4040
2. See all incoming requests in real-time

## Webhook Payload Structure

QuickNode sends webhook payloads in this format:

```json
{
  "data": [
    {
      "parentSlot": 123456789,
      "blockTime": 1234567890,
      "transactions": [
        {
          "transaction": {
            "signatures": ["signature..."],
            "message": {
              "instructions": [...],
              "accountKeys": [...]
            }
          },
          "meta": {
            "err": null,
            "preBalances": [...],
            "postBalances": [...],
            "preTokenBalances": [...],
            "postTokenBalances": [...],
            "logMessages": [...]
          }
        }
      ]
    }
  ]
}
```

## Filter Response Format

Your filter should return:

```json
[
  {
    "slot": 123456790,
    "blockTime": 1234567890,
    "transactions": [
      {
        "signature": "transaction-signature",
        "operation": "buy",
        "timestamp": 1234567890,
        "accounts": {
          "owner": "wallet-address",
          "mint": "token-mint-address"
        },
        "info": {
          "tokenAddress": "token-address",
          "changes": {
            "sol": 1.5,
            "token": 1000000
          },
          "price": 0.0000015,
          "volume": 1.5,
          "isWhale": false,
          "patterns": []
        }
      }
    ]
  }
]
```

## Configuration Options

Edit the `CONFIG` object in `quicknode-filter.js`:

```javascript
var CONFIG = {
  MIN_TRADE_THRESHOLD_SOL: 0.01,        // Minimum trade size to include
  WHALE_THRESHOLD_SOL: 10,              // Threshold for whale detection
  ENABLE_ENHANCED_DISCOVERY: true,      // Enable advanced features
  ENABLE_PATTERN_DETECTION: true,       // Detect bot patterns, etc.
  ENABLE_PRICE_CALCULATION: true,       // Calculate token prices
  INCLUDE_ERRORS: false                 // Include failed transactions
};
```

## Troubleshooting

### Webhook Not Receiving Data

1. **Check ngrok is running:**
   ```bash
   curl http://localhost:4040/api/tunnels
   ```

2. **Verify webhook URL in QuickNode:**
   - Go to Streams → Your Stream → Settings
   - Check webhook URL is correct
   - Test webhook URL manually

3. **Check filter code:**
   - Ensure no syntax errors
   - Test filter with sample data
   - Check console for errors

4. **Verify program ID:**
   - Pump Fun Program ID: `6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P`
   - Must match exactly

### Filter Returns No Results

1. **Check transaction threshold:**
   - `MIN_TRADE_THRESHOLD_SOL` might be too high
   - Lower to 0.001 for testing

2. **Verify program ID matching:**
   - Filter checks for Pump Fun program ID
   - Ensure transactions actually use this program

3. **Check filter logic:**
   - Add console.log statements for debugging
   - Verify discriminator matching

### ngrok URL Changes

**Problem:** Free ngrok URLs change on restart

**Solutions:**
1. **Use ngrok reserved domain (paid):**
   ```bash
   ngrok http 3000 --domain=your-reserved-domain.ngrok.io
   ```

2. **Update QuickNode webhook URL** each time ngrok restarts

3. **Use production deployment** for stable URLs

## Production Deployment

### Using Vercel

1. **Deploy your Next.js app:**
   ```bash
   vercel --prod
   ```

2. **Use production webhook URL:**
   ```
   https://your-app.vercel.app/api/webhook
   ```

3. **Update QuickNode Stream:**
   - Go to Streams → Your Stream → Settings
   - Update webhook URL to production URL

### Using Railway

1. **Deploy your app to Railway**

2. **Use Railway URL:**
   ```
   https://your-app.railway.app/api/webhook
   ```

3. **Update QuickNode Stream webhook URL**

## Webhook Security (Optional)

For production, add webhook signature verification:

1. **Set webhook secret in QuickNode:**
   - Generate a secret: `openssl rand -hex 32`
   - Add to QuickNode Stream settings

2. **Verify signature in webhook handler:**
   ```javascript
   const signature = req.headers['x-quicknode-signature'];
   // Verify signature matches expected value
   ```

## Next Steps

1. ✅ **Webhook endpoint configured**
2. ✅ **QuickNode Stream created**
3. ✅ **Filter code deployed**
4. 🔄 **Monitor webhook deliveries**
5. 🔄 **Process Pump Fun transactions**
6. 🔄 **Store/analyze transaction data**

## Example Webhook Handler

If you want to process the webhook data in your Next.js app:

```typescript
// app/api/webhooks/quicknode/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    
    // Process Pump Fun transactions
    const results = payload.data || [];
    
    for (const block of results) {
      if (block.transactions) {
        for (const tx of block.transactions) {
          // Process each transaction
          console.log('Pump Fun transaction:', tx);
          
          // Store in database, trigger alerts, etc.
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('QuickNode webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

## Resources

- [QuickNode Streams Documentation](https://www.quicknode.com/docs/solana/streams)
- [Pump Fun Program](https://pump.fun/)
- [Webhook Server README](../scripts/WEBHOOK_SERVER_README.md)




