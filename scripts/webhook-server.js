/**
 * Standalone Webhook Testing Server
 * 
 * A simple HTTP server for testing webhook payloads locally.
 * Useful for debugging QuickNode streams, Helius webhooks, and other webhook integrations.
 * 
 * Usage:
 *   node scripts/webhook-server.js
 * 
 * Configuration:
 *   - PORT: Set via environment variable (default: 3000)
 *   - WEBHOOK_PATH: Set via environment variable (default: /webhook)
 * 
 * Features:
 *   - Logs all incoming webhook data
 *   - Pretty-prints JSON payloads
 *   - Saves webhook payloads to files (optional)
 *   - Health check endpoint
 *   - CORS support for testing
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = process.env.PORT || 3000;
const WEBHOOK_PATH = process.env.WEBHOOK_PATH || '/webhook';
const SAVE_PAYLOADS = process.env.SAVE_PAYLOADS === 'true';
const PAYLOADS_DIR = path.join(__dirname, '..', 'webhook-payloads');

// Create payloads directory if saving is enabled
if (SAVE_PAYLOADS && !fs.existsSync(PAYLOADS_DIR)) {
  fs.mkdirSync(PAYLOADS_DIR, { recursive: true });
  console.log(`Created payloads directory: ${PAYLOADS_DIR}`);
}

/**
 * Save webhook payload to file
 */
function savePayload(payload, headers) {
  if (!SAVE_PAYLOADS) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `webhook-${timestamp}.json`;
  const filepath = path.join(PAYLOADS_DIR, filename);

  const data = {
    timestamp: new Date().toISOString(),
    headers: headers,
    payload: payload
  };

  try {
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`\n💾 Payload saved to: ${filepath}`);
  } catch (error) {
    console.error('Error saving payload:', error.message);
  }
}

/**
 * Format headers for display
 */
function formatHeaders(headers) {
  const formatted = {};
  for (const key in headers) {
    formatted[key] = headers[key];
  }
  return formatted;
}

/**
 * Detect webhook type from headers or payload
 */
function detectWebhookType(headers, payload) {
  // Check headers first
  if (headers['user-agent'] && headers['user-agent'].includes('Helius')) {
    return 'Helius';
  }
  if (headers['x-quicknode-signature']) {
    return 'QuickNode';
  }
  if (headers['x-telegram-bot-api-secret-token']) {
    return 'Telegram';
  }
  if (headers['x-twitter-webhook-signature']) {
    return 'Twitter';
  }

  // Check payload structure
  if (Array.isArray(payload) && payload.length > 0) {
    const first = payload[0];
    if (first.signature && first.slot) {
      return 'Helius (transaction array)';
    }
    if (first.transactions) {
      return 'QuickNode Stream';
    }
  }

  if (payload && payload.message) {
    return 'Telegram';
  }

  return 'Unknown';
}

/**
 * Process webhook payload
 */
function processWebhook(body, headers) {
  let parsedData = null;
  let webhookType = 'Unknown';

  try {
    parsedData = JSON.parse(body);
    webhookType = detectWebhookType(headers, parsedData);
  } catch (error) {
    // Not JSON, keep as raw text
    parsedData = body;
  }

  return {
    type: webhookType,
    data: parsedData,
    raw: body
  };
}

/**
 * Create HTTP server
 */
const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      server: 'webhook-test-server',
      port: PORT,
      webhookPath: WEBHOOK_PATH,
      timestamp: new Date().toISOString()
    }, null, 2));
    return;
  }

  // Webhook endpoint
  if (req.method === 'POST' && req.url === WEBHOOK_PATH) {
    let body = '';
    const headers = formatHeaders(req.headers);

    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      console.log('\n' + '='.repeat(80));
      console.log('📨 WEBHOOK RECEIVED');
      console.log('='.repeat(80));
      console.log(`Time: ${new Date().toISOString()}`);
      console.log(`Method: ${req.method}`);
      console.log(`URL: ${req.url}`);
      console.log(`Content-Length: ${body.length} bytes`);

      // Process webhook
      const result = processWebhook(body, headers);
      
      console.log(`\n🔍 Webhook Type: ${result.type}`);
      console.log('\n📋 Headers:');
      console.log(JSON.stringify(headers, null, 2));

      if (result.data !== body) {
        // Successfully parsed JSON
        console.log('\n📦 Parsed JSON Data:');
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        // Raw body (not JSON)
        console.log('\n📦 Raw Body:');
        console.log(body.substring(0, 1000) + (body.length > 1000 ? '...' : ''));
      }

      // Additional analysis for known webhook types
      if (result.type === 'Helius' || result.type === 'Helius (transaction array)') {
        if (Array.isArray(result.data)) {
          console.log(`\n📊 Helius Transaction Count: ${result.data.length}`);
          if (result.data.length > 0) {
            const firstTx = result.data[0];
            console.log(`   First Transaction: ${firstTx.signature || 'N/A'}`);
            console.log(`   Slot: ${firstTx.slot || 'N/A'}`);
          }
        }
      }

      if (result.type === 'QuickNode Stream') {
        if (Array.isArray(result.data) && result.data.length > 0) {
          const firstBlock = result.data[0];
          console.log(`\n📊 QuickNode Stream Block Count: ${result.data.length}`);
          if (firstBlock.transactions) {
            console.log(`   Transactions in first block: ${firstBlock.transactions.length}`);
          }
        }
      }

      // Save payload if enabled
      savePayload(result.data, headers);

      console.log('\n' + '='.repeat(80));

      // Send response
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'X-Webhook-Type': result.type
      });
      res.end(JSON.stringify({
        success: true,
        message: 'Webhook received',
        type: result.type,
        timestamp: new Date().toISOString(),
        bodySize: body.length
      }, null, 2));
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    });
  } else {
    // 404 for other routes
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      message: `Endpoint not found. Use POST ${WEBHOOK_PATH} for webhooks or GET /health for health check.`,
      availableEndpoints: {
        webhook: `POST ${WEBHOOK_PATH}`,
        health: 'GET /health'
      }
    }, null, 2));
  }
});

// Start server
server.listen(PORT, () => {
  console.log('🚀 Webhook Testing Server Started');
  console.log('='.repeat(80));
  console.log(`Port: ${PORT}`);
  console.log(`Webhook Endpoint: POST http://localhost:${PORT}${WEBHOOK_PATH}`);
  console.log(`Health Check: GET http://localhost:${PORT}/health`);
  console.log(`Save Payloads: ${SAVE_PAYLOADS ? 'Enabled' : 'Disabled'}`);
  if (SAVE_PAYLOADS) {
    console.log(`Payloads Directory: ${PAYLOADS_DIR}`);
  }
  console.log('='.repeat(80));
  console.log('\nWaiting for webhooks...\n');
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Error: Port ${PORT} is already in use.`);
    console.error(`   Try a different port: PORT=3001 node scripts/webhook-server.js`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down webhook server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\n\n👋 Shutting down webhook server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});





