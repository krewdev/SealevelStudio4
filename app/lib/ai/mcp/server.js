/**
 * MCP Server Implementation
 * Model Context Protocol server for standardized AI tool access
 * 
 * This is a basic implementation. For production, consider using
 * the official MCP SDK or a more robust server framework.
 */

const http = require('http');
const url = require('url');

const PORT = process.env.MCP_PORT || 8000;
const API_KEY = process.env.MCP_API_KEY;
const LOG_LEVEL = process.env.MCP_LOG_LEVEL || 'info';

// Simple logging
function log(level, message) {
  const levels = ['debug', 'info', 'warn', 'error'];
  if (levels.indexOf(level) >= levels.indexOf(LOG_LEVEL)) {
    console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}`);
  }
}

// MCP Tools Registry
const tools = {
  // Solana-specific tools would be registered here
  // Example: get_account_info, build_transaction, etc.
};

// MCP Resources Registry
const resources = {
  // Resources would be registered here
  // Example: solana://account/{address}
};

// Health check endpoint
function handleHealth(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));
}

// List tools endpoint
function handleTools(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    tools: Object.keys(tools).map(name => ({
      name,
      ...tools[name],
    })),
  }));
}

// Call tool endpoint
function handleToolCall(req, res, toolName) {
  const tool = tools[toolName];
  if (!tool) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Tool ${toolName} not found` }));
    return;
  }

  // Read request body
  let body = '';
  req.on('data', chunk => {
    body += chunk.toString();
  });

  req.on('end', async () => {
    try {
      const params = body ? JSON.parse(body) : {};
      const result = await tool.handler(params);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ result }));
    } catch (error) {
      log('error', `Tool call error: ${error.message}`);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  });
}

// List resources endpoint
function handleResources(req, res) {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    resources: Object.keys(resources).map(uri => ({
      uri,
      ...resources[uri],
    })),
  }));
}

// Get resource endpoint
function handleResource(req, res, resourceUri) {
  const resource = resources[resourceUri];
  if (!resource) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: `Resource ${resourceUri} not found` }));
    return;
  }

  // Return resource data
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ resource }));
}

// API key authentication middleware
function authenticate(req, res, callback) {
  if (!API_KEY) {
    // No API key required in development
    callback();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  callback();
}

// Request handler
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  log('debug', `${req.method} ${pathname}`);

  // Health check (no auth required)
  if (pathname === '/health' && req.method === 'GET') {
    handleHealth(req, res);
    return;
  }

  // Authenticate other endpoints
  authenticate(req, res, () => {
    // Routes
    if (pathname === '/tools' && req.method === 'GET') {
      handleTools(req, res);
    } else if (pathname.startsWith('/tools/') && req.method === 'POST') {
      const toolName = pathname.split('/')[2];
      handleToolCall(req, res, toolName);
    } else if (pathname === '/resources' && req.method === 'GET') {
      handleResources(req, res);
    } else if (pathname.startsWith('/resources/') && req.method === 'GET') {
      const resourceUri = decodeURIComponent(pathname.split('/').slice(2).join('/'));
      handleResource(req, res, resourceUri);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });
});

// Start server
server.listen(PORT, () => {
  log('info', `MCP Server started on port ${PORT}`);
  log('info', `API Key: ${API_KEY ? 'Set' : 'Not set (development mode)'}`);
  log('info', `Log Level: ${LOG_LEVEL}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log('info', 'SIGTERM received, shutting down gracefully');
  server.close(() => {
    log('info', 'Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log('info', 'SIGINT received, shutting down gracefully');
  server.close(() => {
    log('info', 'Server closed');
    process.exit(0);
  });
});

