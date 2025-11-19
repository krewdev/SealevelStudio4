# Model Context Protocol (MCP) Guide

## What is MCP?

Model Context Protocol (MCP) is a standardized protocol by Anthropic that enables AI applications to access tools, resources, and data sources in a consistent way. It provides:

- **Standardized Tool Interfaces** - Consistent API for exposing functionality to AI models
- **Resource Management** - Access to files, databases, APIs, and other resources
- **Prompt Templates** - Reusable prompt patterns
- **Better Context Management** - Structured context for AI agents

## Why Use MCP?

### Benefits

✅ **Standardization** - One protocol for all tools and resources
✅ **Extensibility** - Easy to add new tools and resources
✅ **Interoperability** - Works across different AI models and frameworks
✅ **Better Context** - Structured context management for AI agents
✅ **Production Ready** - Designed for production AI systems

### When to Use MCP

**Use MCP if you need:**
- Standardized tool access across different AI models
- Expose Solana-specific tools/resources to AI models
- Better context management for AI agents
- Production system with multiple AI integrations
- Complex tooling requirements

**Skip MCP if:**
- Simple local inference is sufficient
- Only need basic chat/completion
- Minimal tooling requirements
- Quick prototyping without tool integration

## MCP Architecture

```
┌─────────────────┐
│   AI Model      │
│  (Ollama, etc)  │
└────────┬────────┘
         │
         │ MCP Protocol
         │
┌────────▼────────┐
│   MCP Server    │
│  (Port 8000)    │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    │         │          │          │
┌───▼───┐ ┌──▼───┐  ┌───▼───┐  ┌───▼───┐
│ Tools │ │Resources│ │Prompts│ │Context│
└───────┘ └───────┘  └───────┘  └───────┘
```

## MCP Setup

### 1. Docker Setup (Recommended)

```bash
# Start MCP server with Docker
docker-compose up -d mcp-server

# Check status
docker-compose logs -f mcp-server

# Verify health
curl http://localhost:8000/health
```

### 2. Native Setup

```bash
# Install dependencies
npm install

# Start MCP server
node app/lib/ai/mcp/server.js

# Or use the setup script
./scripts/setup-mcp-server.sh
```

### 3. Configuration

Add to `.env.local`:

```env
MCP_ENABLED=true
MCP_SERVER_URL=http://localhost:8000
MCP_API_KEY=your_secure_api_key_here
```

## MCP Tools

MCP tools are functions that AI models can call. Examples for Solana development:

### Solana Tools

- `get_account_info` - Fetch account data
- `build_transaction` - Build Solana transactions
- `simulate_transaction` - Simulate transaction execution
- `get_token_balance` - Get token balances
- `decode_instruction` - Decode instruction data
- `scan_pools` - Scan DEX pools for opportunities

### Example Tool Definition

```typescript
{
  name: "get_account_info",
  description: "Get account information from Solana blockchain",
  inputSchema: {
    type: "object",
    properties: {
      address: {
        type: "string",
        description: "Solana account address"
      },
      commitment: {
        type: "string",
        enum: ["finalized", "confirmed", "processed"],
        default: "confirmed"
      }
    },
    required: ["address"]
  }
}
```

## MCP Resources

Resources are data sources that AI models can access:

- **File System** - Read/write files
- **Database** - Query databases
- **APIs** - Access external APIs
- **Blockchain** - Solana RPC endpoints
- **Configuration** - App configuration

### Example Resource

```typescript
{
  uri: "solana://account/{address}",
  name: "Solana Account",
  description: "Access Solana account data",
  mimeType: "application/json"
}
```

## MCP Integration with Local AI

### Connecting Ollama to MCP

1. **Start both services:**
   ```bash
   docker-compose up -d ollama mcp-server
   ```

2. **Configure Ollama to use MCP:**
   ```env
   LOCAL_AI_ENABLED=true
   LOCAL_AI_ENDPOINT=http://localhost:11434
   MCP_ENABLED=true
   MCP_SERVER_URL=http://localhost:8000
   ```

3. **Query with MCP tools:**
   ```typescript
   const response = await fetch('/api/ai/core', {
     method: 'POST',
     body: JSON.stringify({
       action: 'query',
       prompt: 'Get account info for address ABC123',
       useMCP: true,
       mcpTools: ['get_account_info']
     })
   });
   ```

## MCP Server Implementation

### Server Structure

```
app/lib/ai/mcp/
├── server.js           # MCP server entry point
├── client.ts           # MCP client for connecting to server
├── tools/              # MCP tools
│   ├── solana.ts       # Solana-specific tools
│   ├── filesystem.ts   # File system tools
│   └── index.ts        # Tool registry
├── resources/          # Resource providers
│   ├── solana.ts       # Solana resources
│   └── index.ts        # Resource registry
└── prompts/            # Prompt templates
    └── solana.ts       # Solana prompt templates
```

### Creating Custom Tools

```typescript
// app/lib/ai/mcp/tools/custom.ts
import { MCPTool } from '../types';

export const customTool: MCPTool = {
  name: "my_custom_tool",
  description: "Description of what the tool does",
  inputSchema: {
    type: "object",
    properties: {
      param1: {
        type: "string",
        description: "Parameter description"
      }
    },
    required: ["param1"]
  },
  handler: async (params: any) => {
    // Tool implementation
    return { result: "success" };
  }
};
```

## MCP API

### Health Check

```bash
GET /health
```

Returns server status and available tools/resources.

### List Tools

```bash
GET /tools
```

Returns list of available MCP tools.

### Call Tool

```bash
POST /tools/{toolName}
Content-Type: application/json

{
  "params": {
    "param1": "value1"
  }
}
```

### List Resources

```bash
GET /resources
```

Returns list of available resources.

### Get Resource

```bash
GET /resources/{uri}
```

Returns resource data.

## Security

### API Key Authentication

MCP server requires an API key for production use:

```env
MCP_API_KEY=your_secure_random_key_here
```

Generate a secure key:
```bash
openssl rand -hex 32
```

### Rate Limiting

MCP server includes rate limiting to prevent abuse:
- Default: 100 requests per minute per IP
- Configurable via `MCP_RATE_LIMIT` environment variable

### Network Security

For production:
- Use HTTPS (set `MCP_SSL=true`)
- Restrict access with firewall rules
- Use reverse proxy (nginx, Caddy) for SSL termination

## Troubleshooting

### MCP Server Won't Start

1. Check port availability:
   ```bash
   lsof -i :8000
   ```

2. Check logs:
   ```bash
   docker-compose logs mcp-server
   ```

3. Verify environment variables:
   ```bash
   docker-compose config
   ```

### Tools Not Available

1. Verify tool registration:
   ```bash
   curl http://localhost:8000/tools
   ```

2. Check tool implementation in `app/lib/ai/mcp/tools/`

3. Restart MCP server:
   ```bash
   docker-compose restart mcp-server
   ```

### Connection Issues

1. Verify MCP server is running:
   ```bash
   curl http://localhost:8000/health
   ```

2. Check network connectivity:
   ```bash
   docker network inspect sealevel-ai-network
   ```

3. Verify environment variables in `.env.local`

## Next Steps

1. Review MCP tool requirements for your use case
2. Implement custom Solana tools
3. Configure MCP server
4. Test tool integration
5. Deploy to production with proper security

For more information:
- [MCP Specification](https://modelcontextprotocol.io/)
- [Anthropic MCP Documentation](https://docs.anthropic.com/mcp)

