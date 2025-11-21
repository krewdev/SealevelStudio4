#!/bin/bash

# Test Helius Webhook Endpoint
# Usage: ./scripts/test-webhook.sh [webhook-url]

WEBHOOK_URL="${1:-http://localhost:3000/api/webhooks/helius}"

echo "🧪 Testing Helius Webhook Endpoint"
echo "=================================="
echo "URL: $WEBHOOK_URL"
echo ""

# Test 1: GET request (health check)
echo "1️⃣ Testing GET (health check)..."
curl -s "$WEBHOOK_URL" | jq '.' || curl -s "$WEBHOOK_URL"
echo ""
echo ""

# Test 2: POST with empty array (simulating Helius webhook)
echo "2️⃣ Testing POST with empty payload..."
curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '[]' | jq '.' || curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '[]'
echo ""
echo ""

# Test 3: POST with sample transaction (simulating real webhook)
echo "3️⃣ Testing POST with sample transaction..."
SAMPLE_PAYLOAD='[{
  "signature": "test-signature-123",
  "type": "SWAP",
  "slot": 123456789,
  "timestamp": 1234567890,
  "instructions": [{
    "programId": "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc",
    "programName": "orca_whirlpool",
    "accounts": []
  }],
  "tokenTransfers": [{
    "fromTokenAccount": "test-from",
    "toTokenAccount": "test-to",
    "fromUserAccount": "test-user-from",
    "toUserAccount": "test-user-to",
    "tokenAmount": 1000,
    "mint": "So11111111111111111111111111111111111111112"
  }]
}]'

curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$SAMPLE_PAYLOAD" | jq '.' || curl -s -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$SAMPLE_PAYLOAD"
echo ""
echo ""

echo "✅ Tests complete!"
echo ""
echo "💡 Tips:"
echo "   - Check your Next.js console for '[Helius Webhook]' logs"
echo "   - Check Helius dashboard for webhook delivery status"
echo "   - Make sure your dev server is running: npm run dev"

