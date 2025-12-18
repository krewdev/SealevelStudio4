# MCP Resources Guide

This document explains the MCP (Model Context Protocol) resources available for your local AI.

## Overview

Your MCP server now provides access to:

1. **Solana Vanguard Challenge Dataset** - Educational Q&A covering Solana development
2. **Complex Transaction Examples** - Real-world transaction patterns from your codebase

## Quick Start

### 1. Start the MCP Server

```bash
# From project root
node app/lib/ai/mcp/server.js

# Or with Docker (if configured)
docker-compose up -d mcp-server
```

### 2. Verify Resources

```bash
# Check server health
curl http://localhost:8000/health

# List all available resources
curl http://localhost:8000/resources
```

## Dataset Resources

### Get Dataset Metadata

```bash
curl http://localhost:8000/resources/dataset%3A%2F%2Fsolana-vanguard%2Fmetadata
```

Returns:
- Total question count
- Topics covered
- Dataset description

### Search Questions

```bash
# Search by keyword
curl "http://localhost:8000/resources/dataset%3A%2F%2Fsolana-vanguard%2Fquestions?search=anchor&limit=5"

# Get questions by topic
curl "http://localhost:8000/resources/dataset%3A%2F%2Fsolana-vanguard%2Fquestions?topic=rust&limit=10"

# Get random questions
curl "http://localhost:8000/resources/dataset%3A%2F%2Fsolana-vanguard%2Fquestions?random=5"

# Get question by index
curl "http://localhost:8000/resources/dataset%3A%2F%2Fsolana-vanguard%2Fquestions?index=0"
```

## Transaction Examples Resources

### Get All Examples

```bash
curl http://localhost:8000/resources/tx%3A%2F%2Fexamples%2Fall
```

### Filter Examples

```bash
# By category (simple, multi-step, arbitrage, defi, nft, advanced)
curl "http://localhost:8000/resources/tx%3A%2F%2Fexamples%2Fby-category?category=arbitrage"

# By complexity (basic, intermediate, advanced, expert)
curl "http://localhost:8000/resources/tx%3A%2F%2Fexamples%2Fby-complexity?complexity=advanced"

# Search by keyword
curl "http://localhost:8000/resources/tx%3A%2F%2Fexamples%2Fsearch?keyword=flash"

# Get specific example by ID
curl "http://localhost:8000/resources/tx%3A%2F%2Fexamples%2Fsystem-transfer"
```

## Available Transaction Examples

1. **system-transfer** - Basic SOL transfer
2. **create-token-and-mint** - Create SPL token with initial mint
3. **simple-arbitrage** - 2-pool arbitrage execution
4. **flash-loan-stack** - Multi-protocol flash loans
5. **multi-send** - Batch transfers with account creation
6. **nft-mint-with-metadata** - NFT creation with Metaplex
7. **priority-fee-with-transfers** - Transactions with priority fees

## Integration with Local AI

### LM Studio / Ollama

Your local AI can access these resources through the MCP protocol. The AI will automatically:
- Reference educational content when answering Solana questions
- Use transaction examples to help build complex transactions
- Provide context-aware assistance based on your codebase patterns

### Example AI Queries

Once connected via MCP, your AI can:

- "Show me how to create a flash loan transaction"
  → AI will reference `tx://examples/flash-loan-stack`

- "Explain Anchor account validation"
  → AI will search the dataset for relevant questions

- "Build a multi-send transaction"
  → AI will use the `tx://examples/multi-send` pattern

## Resource Structure

```
app/lib/ai/mcp/
├── server.js              # MCP server (HTTP endpoint)
├── resource-loader.js     # Resource registration
├── resources/
│   ├── dataset.ts         # Dataset handlers (TypeScript)
│   ├── transactions.ts    # Transaction examples (TypeScript)
│   ├── dataset-fallback.js    # Fallback (JavaScript)
│   └── transactions-fallback.js # Fallback (JavaScript)
└── client.ts              # MCP client for connecting to server

data/datasets/
├── solana_vanguard_challenge_v1.json  # The dataset file
└── README.md              # Dataset documentation
```

## Adding More Resources

To add a new resource:

1. Create handler in `app/lib/ai/mcp/resources/`
2. Register in `app/lib/ai/mcp/resource-loader.js`
3. Test via HTTP endpoint
4. Document in this file

## Troubleshooting

### Resources not loading

Check the server logs:
```bash
# If running directly
node app/lib/ai/mcp/server.js

# If using Docker
docker-compose logs mcp-server
```

### Dataset not found

Verify the dataset file exists:
```bash
ls -lh data/datasets/solana_vanguard_challenge_v1.json
```

The file should be ~2.5MB. If missing, re-download:
```bash
hf download Bifrost-AI/Solana-Vanguard-Challenge --repo-type=dataset
cp ~/.cache/huggingface/hub/datasets--Bifrost-AI--Solana-Vanguard-Challenge/snapshots/*/solana_vanguard_challenge_v1.json data/datasets/
```

### Resource handler errors

Check that fallback modules exist:
```bash
ls app/lib/ai/mcp/resources/*-fallback.js
```

## Next Steps

1. **Test the resources** - Try accessing them via curl or Postman
2. **Connect your local AI** - Configure LM Studio/Ollama to use MCP
3. **Extend with more examples** - Add more transaction patterns as you develop them
4. **Monitor usage** - Check server logs to see which resources are used most

For more information, see the main [MCP_GUIDE.md](./MCP_GUIDE.md).
