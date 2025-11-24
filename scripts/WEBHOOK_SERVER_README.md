# Webhook Testing Server

A standalone HTTP server for testing webhook payloads locally. Useful for debugging QuickNode streams, Helius webhooks, and other webhook integrations.

## Quick Start

```bash
# Start the server (default port 3000)
npm run webhook:server

# Or run directly
node scripts/webhook-server.js

# Custom port
PORT=3001 node scripts/webhook-server.js

# Enable payload saving
SAVE_PAYLOADS=true node scripts/webhook-server.js
```

## Features

- ✅ **Logs all incoming webhook data** - Pretty-printed JSON with headers
- ✅ **Webhook type detection** - Automatically detects Helius, QuickNode, Telegram, Twitter webhooks
- ✅ **Payload saving** - Optionally save webhook payloads to files for analysis
- ✅ **Health check endpoint** - GET `/health` for monitoring
- ✅ **CORS support** - Works with browser-based testing
- ✅ **Graceful shutdown** - Handles SIGINT/SIGTERM properly

## Endpoints

### POST `/webhook`
Main webhook endpoint. Accepts POST requests and logs all data.

**Response:**
```json
{
  "success": true,
  "message": "Webhook received",
  "type": "Helius",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "bodySize": 1234
}
```

### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "server": "webhook-test-server",
  "port": 3000,
  "webhookPath": "/webhook",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Configuration

Set via environment variables:

| Variable | Default | Description |
|---------|---------|-------------|
| `PORT` | `3000` | Server port |
| `WEBHOOK_PATH` | `/webhook` | Webhook endpoint path |
| `SAVE_PAYLOADS` | `false` | Save payloads to `webhook-payloads/` directory |

## Usage Examples

### Testing Helius Webhooks

```bash
# Start server
npm run webhook:server

# In another terminal, test with curl
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '[{
    "signature": "test-123",
    "type": "SWAP",
    "slot": 123456789
  }]'
```

### Testing QuickNode Streams

```bash
# Start server
npm run webhook:server

# QuickNode will send POST requests to your server
# Configure QuickNode webhook URL: http://your-ip:3000/webhook
```

### Saving Payloads for Analysis

```bash
# Start server with payload saving enabled
SAVE_PAYLOADS=true npm run webhook:server

# Payloads will be saved to: webhook-payloads/webhook-YYYY-MM-DDTHH-MM-SS.json
```

### Using with ngrok (for local testing with external services)

```bash
# Terminal 1: Start webhook server
npm run webhook:server

# Terminal 2: Start ngrok tunnel
ngrok http 3000

# Use the ngrok URL in your webhook configuration:
# https://abc123.ngrok.io/webhook
```

## Webhook Type Detection

The server automatically detects webhook types based on headers and payload structure:

- **Helius**: Detects Helius transaction webhooks
- **QuickNode Stream**: Detects QuickNode stream data
- **Telegram**: Detects Telegram bot webhooks
- **Twitter**: Detects Twitter webhooks
- **Unknown**: Fallback for unrecognized webhooks

## Output Example

```
🚀 Webhook Testing Server Started
================================================================================
Port: 3000
Webhook Endpoint: POST http://localhost:3000/webhook
Health Check: GET http://localhost:3000/health
Save Payloads: Disabled
================================================================================

Waiting for webhooks...

================================================================================
📨 WEBHOOK RECEIVED
================================================================================
Time: 2024-01-01T00:00:00.000Z
Method: POST
URL: /webhook
Content-Length: 1234 bytes

🔍 Webhook Type: Helius

📋 Headers:
{
  "content-type": "application/json",
  "user-agent": "Helius-Webhook/1.0"
}

📦 Parsed JSON Data:
[
  {
    "signature": "abc123...",
    "type": "SWAP",
    "slot": 123456789
  }
]

📊 Helius Transaction Count: 1
   First Transaction: abc123...
   Slot: 123456789

================================================================================
```

## Integration with QuickNode

1. Start the webhook server:
   ```bash
   npm run webhook:server
   ```

2. Use ngrok or similar to expose your local server:
   ```bash
   ngrok http 3000
   ```

3. Configure QuickNode Stream webhook URL:
   - Go to QuickNode Dashboard → Streams
   - Set webhook URL to: `https://your-ngrok-url.ngrok.io/webhook`
   - The server will log all incoming stream data

## Integration with Helius

1. Start the webhook server:
   ```bash
   npm run webhook:server
   ```

2. Use ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```

3. Configure Helius webhook:
   - Go to Helius Dashboard → Webhooks
   - Set webhook URL to: `https://your-ngrok-url.ngrok.io/webhook`
   - The server will log all incoming transaction data

## Troubleshooting

### Port Already in Use

```bash
# Use a different port
PORT=3001 npm run webhook:server
```

### Payloads Not Saving

Make sure `SAVE_PAYLOADS=true` is set:
```bash
SAVE_PAYLOADS=true npm run webhook:server
```

### Webhook Not Receiving Data

1. Check if server is running: `curl http://localhost:3000/health`
2. Verify webhook URL is correct
3. Check firewall/network settings
4. Use ngrok for external access

## File Structure

```
scripts/
  webhook-server.js          # Main server file
  WEBHOOK_SERVER_README.md   # This file
webhook-payloads/            # Saved payloads (if SAVE_PAYLOADS=true)
  webhook-2024-01-01T00-00-00.json
  ...
```

## Next Steps

After testing webhooks locally, you can:

1. **Integrate with Next.js**: Use the webhook handlers in `app/api/webhooks/`
2. **Process with Pump Fun Filter**: Use the QuickNode filter to process stream data
3. **Deploy**: Deploy your Next.js app and configure production webhook URLs


