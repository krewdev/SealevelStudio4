# Solana Development Datasets & Resources

This directory contains datasets and resources for training and supporting AI models in Solana development.

## Contents

### Solana Vanguard Challenge Dataset
- **File**: `solana_vanguard_challenge_v1.json`
- **Source**: Bifrost-AI/Solana-Vanguard-Challenge (Hugging Face)
- **Description**: 1,000 carefully curated questions covering:
  - Solana fundamentals (architecture, consensus, validators)
  - Rust & Anchor framework (on-chain development)
  - TypeScript client integration (@solana/web3.js, Metaplex)
  - Security best practices
  - DeFi & NFT protocols
  - Performance optimization
  - Testing & CI/CD

### Dataset Format
Each entry in the JSON file contains:
```json
{
  "Instruction": "Question or coding challenge",
  "Output": "Expected answer or solution"
}
```

## MCP Resource Access

These resources are available through the MCP (Model Context Protocol) server:

### Dataset Resources

- `dataset://solana-vanguard/metadata` - Get dataset metadata
- `dataset://solana-vanguard/questions?search=keyword` - Search questions
- `dataset://solana-vanguard/questions?topic=rust` - Get questions by topic
- `dataset://solana-vanguard/questions?index=0` - Get question by index
- `dataset://solana-vanguard/questions?random=5` - Get random questions

### Transaction Example Resources

- `tx://examples/all` - Get all transaction examples
- `tx://examples/by-category?category=arbitrage` - Filter by category
- `tx://examples/by-complexity?complexity=advanced` - Filter by complexity
- `tx://examples/search?keyword=flash` - Search examples
- `tx://examples/{id}` - Get specific example (e.g., `tx://examples/system-transfer`)

## Usage

### Via MCP Server

Start the MCP server:
```bash
node app/lib/ai/mcp/server.js
```

Then access resources via HTTP:
```bash
# List all resources
curl http://localhost:8000/resources

# Get dataset metadata
curl http://localhost:8000/resources/dataset%3A%2F%2Fsolana-vanguard%2Fmetadata

# Search questions
curl "http://localhost:8000/resources/dataset%3A%2F%2Fsolana-vanguard%2Fquestions?search=anchor"

# Get transaction examples
curl http://localhost:8000/resources/tx%3A%2F%2Fexamples%2Fall
```

### Via Local AI

Your local AI models can access these resources through the MCP client, giving them:
- Educational context from the dataset
- Real-world transaction examples from your codebase
- Implementation patterns and best practices

## Adding More Resources

To add more datasets or transaction examples:

1. Add files to this directory
2. Create resource handlers in `app/lib/ai/mcp/resources/`
3. Register resources in `app/lib/ai/mcp/resource-loader.js`
4. Update this README

## Notes

- The dataset is cached in memory after first load for performance
- Transaction examples are based on real code from the codebase
- Both resources are designed to help AI models provide better Solana development assistance
