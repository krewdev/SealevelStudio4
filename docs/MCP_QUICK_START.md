# MCP Quick Start Guide

Get your local AI connected to MCP resources in 3 steps!

## Step 1: Enable MCP in Environment

Add to your `.env.local` file:

```bash
# Enable MCP
MCP_ENABLED=true
MCP_SERVER_URL=http://localhost:8000
MCP_PORT=8000
# Optional: Add API key for production
# MCP_API_KEY=your_secure_key_here
```

## Step 2: Start MCP Server

```bash
# Option A: Use the startup script (recommended)
./scripts/start-mcp-server.sh

# Option B: Start manually
node app/lib/ai/mcp/server.js

# Option C: Run in background
nohup node app/lib/ai/mcp/server.js > mcp-server.log 2>&1 &
```

Verify it's running:
```bash
curl http://localhost:8000/health
curl http://localhost:8000/resources
```

## Step 3: Verify Your Local AI Setup

Make sure your local AI (LM Studio or Ollama) is running:

```bash
# Check LM Studio
curl http://localhost:1234/v1/models

# Check Ollama
curl http://localhost:11434/api/tags
```

Your `.env.local` should have:
```bash
LOCAL_AI_ENABLED=true
LOCAL_AI_ENDPOINT=http://localhost:1234/v1  # LM Studio
# or
LOCAL_AI_ENDPOINT=http://localhost:11434    # Ollama
LOCAL_AI_TYPE=lmstudio  # or ollama
```

## 🎉 You're Connected!

Your local AI can now:
- ✅ Access the Solana Vanguard Challenge dataset (1000+ Q&A)
- ✅ Reference real transaction examples from your codebase
- ✅ Provide context-aware Solana development assistance

## Testing the Connection

### Test MCP Resources Directly

```bash
# Get dataset metadata
curl "http://localhost:8000/resources/dataset%3A%2F%2Fsolana-vanguard%2Fmetadata"

# Search dataset questions
curl "http://localhost:8000/resources/dataset%3A%2F%2Fsolana-vanguard%2Fquestions?search=anchor&limit=3"

# Get transaction examples
curl "http://localhost:8000/resources/tx%3A%2F%2Fexamples%2Fall"

# Get specific transaction example
curl "http://localhost:8000/resources/tx%3A%2F%2Fexamples%2Fsystem-transfer"
```

### Test Through Your App

The MCP-enhanced client automatically enriches AI queries. Try asking:

- "How do I build a flash loan transaction?"
- "Explain Anchor account validation"
- "Show me how to create a multi-send transaction"

The AI will automatically fetch relevant resources from MCP!

## Troubleshooting

### MCP Server Won't Start

1. Check port availability:
   ```bash
   lsof -i :8000
   ```

2. Check Node.js version:
   ```bash
   node --version  # Should be 16+
   ```

3. Check logs:
   ```bash
   cat mcp-server.log  # if using nohup
   ```

### Resources Not Loading

1. Verify dataset file exists:
   ```bash
   ls -lh data/datasets/solana_vanguard_challenge_v1.json
   ```

2. Check MCP server logs for errors

3. Test resources directly via curl (see above)

### Local AI Not Using MCP

1. Verify `MCP_ENABLED=true` in `.env.local`

2. Restart your Next.js dev server:
   ```bash
   npm run dev
   ```

3. Check browser console for MCP connection errors

## What Happens Under the Hood

1. User asks a question in your app
2. App extracts keywords from the query
3. MCP-enhanced client fetches relevant:
   - Dataset questions (educational context)
   - Transaction examples (codebase patterns)
4. Context is injected into the system prompt
5. Local AI responds with enriched knowledge

## Next Steps

- Add more transaction examples to `app/lib/ai/mcp/resources/transactions.ts`
- Customize system prompts in `app/lib/ai/mcp-enhanced-client.ts`
- Add more MCP resources as needed

See [MCP_RESOURCES.md](./MCP_RESOURCES.md) for detailed resource documentation.

