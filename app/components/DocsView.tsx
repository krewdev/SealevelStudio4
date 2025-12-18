'use client';

import React, { useState } from 'react';
import { Book, ArrowLeft, Search, FileText, Code, Shield, Terminal, Zap, TrendingUp } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Wrapper to satisfy React/TypeScript JSX element typing for SyntaxHighlighter
const CodeBlockHighlighter: React.FC<any> = (props) => <SyntaxHighlighter {...props} />;

interface DocsViewProps {
  onBack?: () => void;
}

export function DocsView({ onBack }: DocsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  const docs = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <FileText size={20} />,
      category: 'Basics',
      content: `# Getting Started with Sealevel Studio

## Welcome

Sealevel Studio is a comprehensive developer toolkit for Solana blockchain development. This guide will help you get started.

## Quick Start

1. **Connect Your Wallet**: Click the wallet button in the header to connect your Solana wallet
2. **Choose a Tool**: Navigate to any tool from the sidebar
3. **Start Building**: Use the visual interfaces to build transactions, scan for opportunities, or analyze code

## Core Features

### Account Inspector
- Inspect any Solana account
- View token balances, program data, and account state
- Supports system accounts, token accounts, and program accounts

### Transaction Builder
- Visually build Solana transactions
- Drag-and-drop instruction blocks
- Real-time validation and error checking
- Export to TypeScript/Rust code

### Arbitrage Scanner
- Find arbitrage opportunities across DEXs
- Real-time price monitoring
- One-click transaction building
- Multi-hop pathfinding

### Simulation Engine
- Simulate transactions before sending
- View state changes
- Check compute units and fees
- Debug transaction logic

## Next Steps

- Read the [Account Inspector Guide](#account-inspector)
- Learn about [Transaction Building](#transaction-builder)
- Explore [Advanced Features](#advanced-features)`
    },
    {
      id: 'account-inspector',
      title: 'Account Inspector',
      icon: <Search size={20} />,
      category: 'Tools',
      content: `# Account Inspector Guide

## Overview

The Account Inspector allows you to examine any Solana account on-chain, viewing its data, balance, and state.

## How to Use

1. **Enter Account Address**: Paste any Solana account address (wallet, token account, program, etc.)
2. **Select Network**: Choose Mainnet, Devnet, or Testnet
3. **Inspect**: View detailed account information

## Account Types

### System Accounts
- Standard SOL wallets
- Shows balance, owner, and account data
- Displays transaction history links

### Token Accounts
- SPL Token accounts
- Shows token balance, mint address, owner
- Displays token metadata if available

### Program Accounts
- Program-derived accounts (PDAs)
- Shows account data and owner program
- Attempts to deserialize using program IDL

## Features

- **Auto-detection**: Automatically detects account type
- **IDL Parsing**: Uses Anchor IDLs to parse program accounts
- **Copy Address**: Quick copy of account addresses
- **External Links**: Links to Solscan for detailed view`
    },
    {
      id: 'transaction-builder',
      title: 'Transaction Builder',
      icon: <Code size={20} />,
      category: 'Tools',
      content: `# Transaction Builder Guide

## Overview

Build Solana transactions visually using drag-and-drop instruction blocks.

## Getting Started

1. Navigate to "Transaction Builder" from the sidebar
2. Click "Add Block" to add instructions
3. Fill in required parameters
4. Build and preview your transaction

## Instruction Blocks

### System Program
- **Transfer SOL**: Send SOL between accounts
- Parameters: Destination, Amount (in SOL, auto-converted to lamports)

### SPL Token Program
- **Transfer Tokens**: Transfer SPL tokens
- **Mint Tokens**: Create new tokens
- **Burn Tokens**: Destroy tokens
- **Create ATA**: Create Associated Token Account

### Token-2022 Extensions
- **Transfer Fees**: Configure transfer fees
- **Transfer Hooks**: Set up transfer hooks
- **Confidential Transfers**: Enable privacy
- **Interest-bearing**: Configure interest rates

### Metaplex Token Metadata
- **Create Metadata**: Add token metadata
- **Update Metadata**: Modify existing metadata
- Parameters: Name, Symbol, URI, Creators, Seller Fee

## Advanced Features

### Multi-Instruction Transactions
- Add multiple instructions to a single transaction
- Instructions execute atomically (all or nothing)
- Order matters - instructions execute sequentially

### Program-Derived Addresses (PDAs)
- Automatically derive PDAs for new accounts
- Uses seeds and program ID
- No keypair needed for PDA signing

### Auto-Conversion
- SOL amounts automatically converted to lamports
- User-friendly input (e.g., "1.5 SOL" → 1,500,000,000 lamports)

## Validation

- Real-time parameter validation
- Account existence checks
- Balance verification
- Signer requirements
- Owner verification

## Export

- Export to TypeScript code
- Export to Rust code
- Copy-paste ready snippets
- Includes all dependencies`
    },
    {
      id: 'arbitrage-scanner',
      title: 'Arbitrage Scanner',
      icon: <TrendingUp size={20} />,
      category: 'Tools',
      content: `# Arbitrage Scanner Guide

## Overview

Find profitable arbitrage opportunities across multiple DEXs on Solana.

## How It Works

1. **Scan**: Click "Scan" to search all configured DEXs
2. **Analyze**: AI analyzes price differences and calculates profit
3. **Execute**: One-click transaction building for opportunities

## Supported DEXs

- **Raydium**: AMM pools
- **Orca**: Whirlpools and standard pools
- **Jupiter**: Aggregator (best routes)
- **Meteora**: Dynamic AMM
- **Lifinity**: Proactive market making

## Opportunity Types

### Simple Arbitrage
- Direct price difference between two pools
- Same token pair on different DEXs
- Fast execution, lower risk

### Multi-Hop Arbitrage
- Multiple swaps through different tokens
- Higher profit potential
- More complex execution

### Cross-Protocol
- Leverage different protocols (lending, staking, etc.)
- Flash loans for capital
- Advanced strategies

## Features

### Real-Time Updates
- WebSocket connections for live pool data
- Automatic refresh at configurable intervals
- Price change notifications

### One-Click Execution
- Build transaction directly from opportunity
- Automatic slippage protection
- Gas estimation

### AI-Powered Analysis
- Risk assessment
- Profit optimization
- Route suggestions
- Market manipulation detection

## Best Practices

1. **Check Liquidity**: Ensure pools have sufficient liquidity
2. **Monitor Gas**: Factor in transaction fees
3. **Slippage**: Set appropriate slippage tolerance
4. **Timing**: Execute quickly as opportunities disappear fast`
    },
    {
      id: 'security-ai',
      title: 'Security AI Scanner',
      icon: <Shield size={20} />,
      category: 'Security',
      content: `# Security AI Scanner Guide

## Overview

Advanced AI-powered security scanning that detects trackers, tracers, watchers, and network threats.

## Features

### Animated Security Bot
- Blue AI bot travels around your screen during scans
- Real-time status updates
- Visual progress indicator

### Comprehensive Scanning
- **Trackers**: Analytics scripts, cookies, localStorage
- **Network**: Connections, ports, DNS queries
- **Certificates**: X.509 validation, HTTPS checks
- **Watchers**: PerformanceObserver, MutationObserver

### Security Report
- Security score (0-100)
- Detailed threat breakdown
- Network information
- Certificate status
- Recommendations

## How to Use

1. Click "Start Scan"
2. Watch the blue bot scan your screen
3. Review the detailed security report
4. Export report if needed

## Access Tiers

- **Free**: 5 scans/month
- **Basic** (100 SEAL): 50 scans/month
- **Pro** (500 SEAL): 500 scans/month
- **Enterprise** (2000 SEAL): Unlimited

## Truth Validator

All security reports are validated by our Truth Validator AI to ensure:
- No hallucinations
- Accurate threat detection
- Verified facts only
- Fast, emotionless analysis`
    },
    {
      id: 'cybersecurity-finder',
      title: 'Cybersecurity Finder',
      icon: <Shield size={20} />,
      category: 'Security',
      content: `# Cybersecurity Finder Guide

## Overview

AI-powered code analysis tool that finds vulnerabilities, suggests exploits, and provides fixes.

## Three AI Personas

### Blue Team (Analyst)
- Finds vulnerabilities in code
- Explains why issues are dangerous
- Rates severity (Critical, High, Medium, Low)
- References known exploit patterns

### Red Team (Attacker)
- Identifies attack vectors
- Explains exploitation strategies
- Describes potential impact
- Educational purpose only

### Secure Coder (Fixer)
- Provides corrected code
- Explains all fixes
- Follows security best practices
- Complete code rewrite

## How to Use

### Console Mode
1. Type commands in the console
2. Use \`analyze-all\` to run all three AIs
3. Use \`analyze-find\`, \`analyze-exploit\`, or \`analyze-fix\` for specific analysis

### Paste Scanning
1. Type \`scan-paste\` to enable
2. Paste code anywhere
3. Automatic analysis triggered

### Commands
- \`help\` - Show all commands
- \`analyze-all\` - Run all analyses
- \`scan-paste\` - Enable paste scanning
- \`report\` - Generate security report
- \`exploit-list\` - List known exploits
- \`exploit-search <keyword>\` - Search exploits
- \`exploit-info <id>\` - Show exploit details

## Shell Environment

### Variables
- \`set <VAR> <value>\` - Set variable
- \`vars\` - List all variables
- \`unset <VAR>\` - Remove variable

### Commands
- \`shell echo <text>\` - Echo text
- \`shell curl <url>\` - Simulate HTTP request
- \`shell payload <type>\` - Generate test payload

## Known Exploits Database

Access to 20+ known exploits including:
- Solana-specific vulnerabilities
- Web application vulnerabilities
- Detection patterns
- Mitigation strategies`
    },
    {
      id: 'rd-console',
      title: 'R&D Console',
      icon: <Terminal size={20} />,
      category: 'Tools',
      content: `# R&D Console Guide

## Overview

Advanced decryption and R&D tool with terminal interface for research purposes.

## Features

- Base64, Hex, Base58 encoding/decoding
- AES decryption
- Solana keypair decoding
- Transaction decoding
- Account data decoding
- Hash functions (SHA-256, SHA-512)

## Commands

### Encoding/Decoding
- \`base64 encode <data>\` - Encode to base64
- \`base64 decode <data>\` - Decode from base64
- \`hex encode <data>\` - Encode to hex
- \`hex decode <data>\` - Decode from hex
- \`base58 encode <hex>\` - Encode to base58
- \`base58 decode <base58>\` - Decode from base58

### Solana Tools
- \`keypair <format> <data>\` - Decode keypair (base64/hex/base58/array)
- \`tx <base64>\` - Decode transaction
- \`account <base64> [encoding]\` - Decode account data

### Crypto
- \`hash sha256 <data>\` - Compute SHA-256
- \`hash sha512 <data>\` - Compute SHA-512
- \`aes <encrypted> <key> [iv]\` - Decrypt AES

### Utilities
- \`detect <data>\` - Detect encoding format
- \`clear\` - Clear console
- \`help [command]\` - Show help

## Usage Tips

- Use command history (↑/↓ arrows)
- All commands are case-insensitive
- Variables support substitution (\`$VAR\`)
- Results are color-coded (success/error/info)`
    },
    {
      id: 'premium-services',
      title: 'Premium Services',
      icon: <Zap size={20} />,
      category: 'Services',
      content: `# Premium Services Guide

## Overview

Advanced tools and services available for SEAL token payment.

## Services

### Transaction Bundler
- Multi-send SOL to up to 50 wallets
- Auto-create new wallet accounts
- Priority fee support
- Cost: 500 SEAL per use

### Market Maker Agent
- Autonomous on-chain trading agent
- Customizable strategies (Grid, TWAP, Market Making)
- Real-time analytics
- Cost: 2,000 SEAL setup + monthly fees

### Advertising Bots
- Telegram bot for token promotion
- Twitter/X automation
- Message templating
- Scheduling and rate limiting
- Cost: 1,000-1,500 SEAL

### Wallet Manager
- Manage created/imported wallets
- Label and organize
- Import/export functionality
- Free to use

## Payment

All premium services require SEAL tokens:
- Purchase SEAL tokens
- Services deduct from balance
- Usage tracked automatically
- Receipts provided`
    },
    {
      id: 'ai-agents',
      title: 'AI Agents',
      icon: <Zap size={20} />,
      category: 'AI',
      content: `# AI Agents Guide

## Overview

Unified AI assistant system with specialized agents for different tasks.

## Available Agents

### Transaction Assistant
- Helps build transactions
- Suggests optimizations
- Explains instructions
- Validates parameters

### Scanner Agent
- Analyzes arbitrage opportunities
- Calculates risk/reward
- Suggests optimal entry/exit
- Detects market manipulation

### Simulator Agent
- Predicts transaction outcomes
- Estimates costs
- Identifies potential errors
- Suggests fixes

### Account & Security Agent
- Usage tracking
- Payment management
- Security recommendations
- Account information

### Global Scanner Agent
- Dune Analytics integration
- Solscan API access
- Market analysis
- On-chain data queries

## Usage

1. Open the AI Agents panel (floating icon)
2. Select an agent tab
3. Ask questions or use suggestions
4. Agents provide context-aware responses

## Features

- Context-aware responses
- Code generation
- Cost optimization
- Security analysis
- Real-time blockchain data`
    },
    {
      id: 'ai-training',
      title: 'Custom AI Model Training',
      icon: <Zap size={20} />,
      category: 'AI',
      content: `# Custom AI Model Training

## Overview

We are currently in the process of training our own specialized AI model specifically designed for Solana blockchain development, security analysis, and transaction optimization.

## Why Custom Training?

### Current Limitations
- Generic AI models lack Solana-specific knowledge
- No understanding of account model, PDAs, or CPI
- Limited context about Solana programs and protocols
- Cannot accurately predict transaction outcomes
- Missing domain expertise in DeFi and security

### Our Solution
A custom-trained model that understands:
- Solana's account model and program architecture
- Transaction building and optimization
- Security vulnerabilities specific to Solana
- DeFi protocols and arbitrage strategies
- Real-time on-chain data interpretation

## Training Data

### Solana-Specific Datasets
1. **Transaction Corpus**
   - Millions of verified Solana transactions
   - Successful and failed transaction patterns
   - Gas optimization examples
   - Multi-instruction transaction flows

2. **Program IDLs**
   - Complete Anchor program IDLs
   - Instruction schemas and account structures
   - Common program patterns (Token, Metaplex, etc.)
   - Custom program examples

3. **Security Vulnerabilities**
   - Known exploit patterns
   - Vulnerability reports and fixes
   - Security audit findings
   - Best practices and anti-patterns

4. **DeFi Protocol Data**
   - DEX pool structures and mechanics
   - Lending protocol interactions
   - Staking and yield farming patterns
   - Arbitrage opportunity examples

5. **Code Examples**
   - Production Solana programs
   - Client-side transaction building
   - Testing and simulation code
   - Optimization techniques

## Model Architecture

### Base Model
- Starting with a proven foundation (e.g., Llama 3, Mistral, or custom)
- Fine-tuned specifically for Solana development
- Multi-task learning for different agent types

### Specialized Heads
- **Transaction Builder Head**: Generates valid Solana transactions
- **Security Analyzer Head**: Detects vulnerabilities and threats
- **Code Generator Head**: Produces production-ready code
- **Optimizer Head**: Suggests gas and cost optimizations

### Truth Validator Component
- Separate model trained to detect hallucinations
- Validates factual claims against on-chain data
- Ensures no "dreaming" or false information
- Fast, emotionless, accurate decision-making

## Training Process

### Phase 1: Data Collection (Current)
- ✅ Collecting transaction data from Solana mainnet
- ✅ Gathering program IDLs and schemas
- ✅ Building security vulnerability database
- ✅ Curating code examples and patterns
- 🔄 Continuous data collection and validation

### Phase 2: Preprocessing
- Cleaning and normalizing transaction data
- Extracting features (accounts, instructions, outcomes)
- Creating training/validation/test splits
- Augmenting data with synthetic examples

### Phase 3: Fine-Tuning
- Fine-tuning base model on Solana-specific data
- Training specialized heads for each agent type
- Optimizing for accuracy and speed
- Iterative improvement based on feedback

### Phase 4: Validation
- Testing on held-out transaction data
- Validating against known security issues
- Benchmarking against existing solutions
- User testing and feedback collection

### Phase 5: Deployment
- Model quantization for faster inference
- Server deployment with GPU acceleration
- API integration with existing agents
- Continuous learning from user interactions

## Model Capabilities

### Accuracy Guarantees
- **No Hallucinations**: Truth validator ensures factual accuracy
- **No Lies**: Model trained to say "I don't know" when uncertain
- **Fast Responses**: Optimized for sub-second inference
- **Emotionless**: Pure logic-based decision making
- **Intentional**: Every response has clear purpose and reasoning

### Specialized Knowledge
- Solana account model (ownership, PDAs, rent)
- Transaction structure and validation
- Program instruction formats
- Security best practices
- Gas optimization techniques
- DeFi protocol interactions

### Real-Time Adaptation
- Continuous learning from user interactions
- Adaptation to new Solana programs
- Integration with latest protocol updates
- Feedback loop for improvement

## Training Infrastructure

### Hardware
- GPU cluster for training (A100/H100)
- Distributed training for large models
- Efficient data loading and preprocessing
- Model checkpointing and versioning

### Software Stack
- PyTorch/Transformers for model training
- Weights & Biases for experiment tracking
- Custom Solana data loaders
- Automated evaluation pipelines

### Data Pipeline
- Real-time data collection from Solana RPC
- Automated data validation and cleaning
- Feature extraction and engineering
- Continuous dataset updates

## Timeline

### Current Status: Phase 1 (Data Collection)
- Actively collecting training data
- Building comprehensive datasets
- Validating data quality
- Preparing for fine-tuning phase

### Next Steps
- **Q1 2025**: Complete data collection, begin preprocessing
- **Q2 2025**: Start fine-tuning process
- **Q3 2025**: Validation and testing
- **Q4 2025**: Beta deployment with select users

## Benefits of Custom Model

### For Users
- More accurate Solana-specific advice
- Better understanding of your code
- Faster, more relevant responses
- Reduced hallucinations and errors

### For Platform
- Reduced API costs (self-hosted)
- Better control over model behavior
- Ability to fine-tune for specific use cases
- Competitive advantage in Solana tooling

## Access

Once deployed, the custom model will be available through:
- All existing AI agents (upgraded automatically)
- API access for Pro/Enterprise tiers
- Enhanced accuracy and speed
- Specialized Solana knowledge

## Contributing

We welcome contributions to training data:
- Submit transaction examples
- Report model inaccuracies
- Suggest improvements
- Share Solana program patterns

The model will continuously improve based on real-world usage and feedback.`
    },
    {
      id: 'cli-tools',
      title: 'Solana CLI Tools',
      icon: <Terminal size={20} />,
      category: 'Tools',
      content: `# Sealevel Studio CLI Tools

## Overview

Sealevel Studio includes a comprehensive set of command-line tools for Solana development, deployment, and maintenance. These tools are designed to streamline your workflow and automate common tasks.

## Installation

All CLI tools are located in the \`scripts/\` directory. Most are executable directly:

\`\`\`bash
# Make scripts executable (if needed)
chmod +x scripts/*.sh

# TypeScript scripts require ts-node
npm install -g ts-node
\`\`\`

## Core CLI Tools

### 1. Install Solana Build Tools

**Script**: \`scripts/install-solana-build-tools.sh\`

Installs Solana platform tools including \`cargo build-sbf\` required for Anchor program compilation.

\`\`\`bash
./scripts/install-solana-build-tools.sh
\`\`\`

**What it does:**
- Checks for Solana CLI installation
- Detects macOS (Homebrew) or Linux installation
- Installs platform tools via \`solana-install\`
- Verifies \`cargo build-sbf\` availability
- Provides alternative installation methods if needed

**Output:**
- Confirms installation success
- Shows path to add to your \`PATH\` environment variable
- Provides troubleshooting tips if installation fails

### 2. Setup Merkle Tree

**Script**: \`scripts/setup-merkle-tree.ts\`

Creates a Metaplex Bubblegum merkle tree for compressed NFT (cNFT) minting, used for attestations.

\`\`\`bash
# Devnet (default)
ts-node scripts/setup-merkle-tree.ts --network devnet

# Mainnet
ts-node scripts/setup-merkle-tree.ts --network mainnet --keypair ~/.config/solana/id.json

# Custom options
ts-node scripts/setup-merkle-tree.ts --network devnet --max-depth 16 --max-buffer-size 64
\`\`\`

**Options:**
- \`--network\`: Network to deploy on (devnet, mainnet, testnet)
- \`--max-depth\`: Merkle tree depth (default: 14)
- \`--max-buffer-size\`: Buffer size (default: 64)
- \`--keypair\`: Path to keypair file (required for mainnet)

**Output:**
- Merkle tree address
- Tree authority PDA address
- Transaction signature
- Environment variables file (\`.env.merkle-tree.<network>\`)

**Example Output:**
\`\`\`
✅ Merkle Tree Created!
======================
Merkle Tree: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Tree Authority: 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
Transaction: 5j7s8F9...xyz123
\`\`\`

### 3. Save IDL

**Script**: \`scripts/save-idl.sh\`

Generates and saves the Anchor program IDL with proper metadata for Solscan display.

\`\`\`bash
./scripts/save-idl.sh
\`\`\`

**What it does:**
- Runs \`anchor idl build\` in the attestation program directory
- Extracts JSON IDL from build output
- Validates JSON format
- Saves to \`programs/attestation-program/target/idl/sealevel_attestation.json\`
- Displays metadata information

**Output:**
- IDL file location
- Metadata summary (name, description, repository)

### 4. Update Solscan Metadata

**Script**: \`scripts/update-solscan-metadata.sh\`

Updates Cargo.toml and Anchor.toml with Sealevel Studios metadata for proper Solscan display.

\`\`\`bash
./scripts/update-solscan-metadata.sh
\`\`\`

**What it does:**
- Updates \`Cargo.toml\` with Sealevel Studios metadata
- Updates \`Anchor.toml\` program name
- Ensures consistent branding across all metadata

**Metadata Updated:**
- Package name: \`sealevel-attestation\`
- Description: "Sealevel Studios - Attestation Program..."
- Authors: ["Sealevel Studios"]
- Repository, homepage, documentation URLs
- Keywords for discoverability

### 5. Check Attestation Setup

**Script**: \`scripts/check-attestation-setup.ts\`

Verifies that all attestation program components are properly configured and deployed.

\`\`\`bash
ts-node scripts/check-attestation-setup.ts
\`\`\`

**Checks:**
- ✅ Program ID configured in environment
- ✅ Program deployed on-chain
- ✅ Merkle tree address configured
- ✅ Merkle tree exists on-chain
- ✅ IDL file exists
- ✅ Environment variables set correctly

**Output:**
\`\`\`
🔍 Checking Attestation Setup...
================================

✅ Program ID: AeK2u45NkNvAcgZuYyCWqmRuCsnXPvcutR3pziXF1cDw
✅ Program Deployed: Yes
✅ Merkle Tree: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
✅ Merkle Tree Exists: Yes
✅ IDL File: Found
✅ Environment: Configured

🎉 Setup is complete and ready!
\`\`\`

### 6. Initialize Attestation Program

**Script**: \`scripts/init-attestation-program.sh\`

Initializes a new Anchor attestation program with boilerplate code.

\`\`\`bash
./scripts/init-attestation-program.sh
\`\`\`

**What it does:**
- Creates Anchor program structure
- Generates program ID
- Sets up basic program template
- Creates necessary directories

### 7. Setup MCP Server

**Script**: \`scripts/setup-mcp-server.sh\`

Sets up the Model Context Protocol (MCP) server for AI agent integration.

\`\`\`bash
./scripts/setup-mcp-server.sh
\`\`\`

**What it does:**
- Installs MCP server dependencies
- Configures environment variables
- Sets up Docker container (optional)
- Verifies server health

### 8. Setup Local AI

**Script**: \`scripts/setup-local-ai.sh\`

Configures local AI models (LM Studio, Ollama) for offline AI agent functionality.

\`\`\`bash
./scripts/setup-local-ai.sh
\`\`\`

**What it does:**
- Checks for LM Studio or Ollama installation
- Configures API endpoints
- Tests AI model connectivity
- Sets up environment variables

## Testing Scripts

### Test Features

**Script**: \`scripts/test-features.ts\`

Runs comprehensive tests on all platform features.

\`\`\`bash
ts-node scripts/test-features.ts
\`\`\`

### Test Pools API

**Script**: \`scripts/test-pools-api.sh\`

Tests DEX pool scanning and arbitrage detection APIs.

\`\`\`bash
./scripts/test-pools-api.sh
\`\`\`

### Test Agents API

**Script**: \`scripts/test-agents-api.sh\`

Tests AI agent API endpoints and functionality.

\`\`\`bash
./scripts/test-agents-api.sh
\`\`\`

### Devnet Transaction Tests

**Script**: \`scripts/devnet-transaction-tests.ts\`

Runs end-to-end transaction tests on devnet.

\`\`\`bash
ts-node scripts/devnet-transaction-tests.ts
\`\`\`

## Utility Scripts

### Verify Merkle Tree

**Script**: \`scripts/verify-merkle-tree.ts\`

Verifies merkle tree configuration and on-chain status.

\`\`\`bash
ts-node scripts/verify-merkle-tree.ts --tree <tree_address> --network devnet
\`\`\`

### Setup Presale Merkle Tree

**Script**: \`scripts/setup-presale-merkle-tree.ts\`

Creates a separate merkle tree for presale attestations.

\`\`\`bash
ts-node scripts/setup-presale-merkle-tree.ts --network devnet
\`\`\`

### Seed Transactions

**Script**: \`scripts/seed-transactions.ts\`

Generates test transactions for development and testing.

\`\`\`bash
ts-node scripts/seed-transactions.ts --count 10 --network devnet
\`\`\`

## Development Workflow

### Typical Setup Flow

\`\`\`bash
# 1. Install Solana build tools
./scripts/install-solana-build-tools.sh

# 2. Initialize attestation program (if new)
./scripts/init-attestation-program.sh

# 3. Build and deploy program
cd programs/attestation-program
anchor build
anchor deploy --provider.cluster devnet

# 4. Update metadata for Solscan
cd ../..
./scripts/update-solscan-metadata.sh

# 5. Save IDL
./scripts/save-idl.sh

# 6. Setup merkle tree
ts-node scripts/setup-merkle-tree.ts --network devnet

# 7. Verify setup
ts-node scripts/check-attestation-setup.ts
\`\`\`

### Quick Commands Reference

\`\`\`bash
# Check GPU availability (for AI)
./scripts/check-gpu.sh

# Start Cloudflare tunnel
./scripts/start-cloudflare-tunnel.sh

# Test webhook server
./scripts/test-webhook.sh

# Train Solana AI model
ts-node scripts/train-solana-ai.ts
\`\`\`

## Environment Variables

Most scripts use environment variables from \`.env.local\`:

\`\`\`bash
# Required for most scripts
NEXT_PUBLIC_ATTESTATION_PROGRAM_ID=<program_id>
NEXT_PUBLIC_BETA_TESTER_MERKLE_TREE=<tree_address>
NEXT_PUBLIC_SOLANA_RPC_DEVNET=<rpc_url>

# Optional
HELIUS_API_KEY=<api_key>
QUICKNODE_API_KEY=<api_key>
\`\`\`

## Troubleshooting

### "build-sbf not found"
\`\`\`bash
./scripts/install-solana-build-tools.sh
\`\`\`

### "Program not deployed"
\`\`\`bash
cd programs/attestation-program
anchor deploy --provider.cluster devnet
\`\`\`

### "Merkle tree not found"
\`\`\`bash
ts-node scripts/setup-merkle-tree.ts --network devnet
\`\`\`

### "IDL not found"
\`\`\`bash
cd programs/attestation-program
anchor build
cd ../..
./scripts/save-idl.sh
\`\`\`

## Best Practices

1. **Always test on devnet first** before deploying to mainnet
2. **Check setup status** before running production scripts
3. **Backup keypairs** before running deployment scripts
4. **Verify environment variables** are set correctly
5. **Read script output** for important information and warnings

## Script Locations

All scripts are in the \`scripts/\` directory:
- Shell scripts (\`.sh\`): Directly executable
- TypeScript scripts (\`.ts\`): Require \`ts-node\`
- JavaScript scripts (\`.js\`): Node.js compatible

## Contributing

When adding new CLI tools:
1. Add to \`scripts/\` directory
2. Include usage documentation in script comments
3. Add to this documentation
4. Test on devnet before mainnet
5. Include error handling and helpful messages`
    },
    {
      id: 'developer-guide',
      title: 'Developer Guide',
      icon: <Code size={20} />,
      category: 'Basics',
      content: `# Sealevel Studio Developer Guide

## Introduction

Sealevel Studio is a comprehensive development platform for Solana blockchain applications. This guide provides in-depth technical documentation for developers.

## Architecture

### Core Components

1. **Transaction Builder**: Visual transaction construction with code export
2. **Account Inspector**: On-chain account data inspection
3. **Arbitrage Scanner**: Real-time DEX opportunity detection
4. **AI Agents**: Specialized AI assistants for different tasks
5. **Attestation System**: Compressed NFT-based credential system

### Technology Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Blockchain**: Solana Web3.js, Anchor Framework
- **AI**: OpenAI API, Local AI (LM Studio, Ollama)
- **Storage**: LocalStorage, IndexedDB, Server-side cookies
- **Styling**: Tailwind CSS

## Solana Development

### Account Model

Solana uses an account-based model where:
- Every account has an owner (program ID)
- Accounts store data and SOL balance
- Program accounts are owned by programs
- System accounts are owned by System Program

### Program-Derived Addresses (PDAs)

PDAs are deterministic addresses derived from seeds and a program ID:

\`\`\`typescript
import { PublicKey } from '@solana/web3.js';

const [pda, bump] = PublicKey.findProgramAddressSync(
  [Buffer.from('seed'), authority.toBuffer()],
  programId
);
\`\`\`

### Transaction Structure

Solana transactions contain:
- **Instructions**: Array of program instructions
- **Accounts**: All accounts referenced in instructions
- **Signatures**: Required signers
- **Recent Blockhash**: For transaction expiration

\`\`\`typescript
import { Transaction, SystemProgram } from '@solana/web3.js';

const transaction = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: fromKey,
    toPubkey: toKey,
    lamports: amount,
  })
);
\`\`\`

### Instruction Building

Instructions require:
- **Program ID**: The program to invoke
- **Accounts**: All accounts the instruction needs
- **Data**: Instruction-specific data

\`\`\`typescript
import { TransactionInstruction } from '@solana/web3.js';

const instruction = new TransactionInstruction({
  programId: programId,
  keys: [
    { pubkey: account1, isSigner: true, isWritable: true },
    { pubkey: account2, isSigner: false, isWritable: false },
  ],
  data: Buffer.from(instructionData),
});
\`\`\`

## API Endpoints

### Transaction Building

\`POST /api/transactions/build\`
- Builds a transaction from instruction blocks
- Returns serialized transaction

### Account Inspection

\`GET /api/accounts/inspect?address=<address>\`
- Fetches account data from blockchain
- Attempts to parse using IDL

### Arbitrage Scanning

\`GET /api/pools/scan?tokenA=<mint>&tokenB=<mint>\`
- Scans DEXs for arbitrage opportunities
- Returns opportunities with profit calculations

### Attestation

\`POST /api/verisol/subscription/verify\`
- Verifies subscription status
- Returns eligibility for cNFT minting

## CLI Tools

See [Solana CLI Tools](#cli-tools) documentation for complete CLI tool reference.

## Best Practices

### Security

1. **Never expose private keys** in client-side code
2. **Validate all user inputs** before building transactions
3. **Use PDAs** instead of keypairs when possible
4. **Check account ownership** before operations
5. **Verify transaction signatures** on-chain

### Performance

1. **Batch operations** when possible
2. **Use connection pooling** for RPC calls
3. **Cache account data** when appropriate
4. **Optimize compute units** in transactions
5. **Use WebSockets** for real-time data

### Error Handling

\`\`\`typescript
try {
  const signature = await connection.sendTransaction(tx, signers);
  await connection.confirmTransaction(signature);
} catch (error) {
  if (error instanceof SendTransactionError) {
    // Handle transaction errors
  } else if (error instanceof ConfirmTransactionError) {
    // Handle confirmation errors
  }
}
\`\`\`

## Testing

### Unit Tests

\`\`\`bash
npm test
\`\`\`

### Integration Tests

\`\`\`bash
ts-node scripts/devnet-transaction-tests.ts
\`\`\`

### Feature Tests

\`\`\`bash
ts-node scripts/test-features.ts
\`\`\`

## Deployment

### Program Deployment

\`\`\`bash
cd programs/attestation-program
anchor build
anchor deploy --provider.cluster devnet
\`\`\`

### Frontend Deployment

Deploy to Vercel, Railway, or any Next.js-compatible platform.

## Resources

- [Solana Documentation](https://docs.solana.com)
- [Anchor Book](https://www.anchor-lang.com)
- [Web3.js Reference](https://solana-labs.github.io/solana-web3.js)
- [Metaplex Documentation](https://docs.metaplex.com)`
    }
  ];

  const filteredDocs = docs.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedDoc = activeDoc ? docs.find(d => d.id === activeDoc) : null;

  // Show Documentation (No authentication required)
  return (
    <div className="flex flex-col h-full bg-gray-900 text-white relative">
      {/* Background Logo Placeholder */}
      <img
        src="/sea-level-logo.png"
        alt="Sealevel Studio Background"
        className="absolute inset-0 w-full h-full object-contain opacity-[0.05] filter hue-rotate-[90deg] saturate-75 brightness-110 pointer-events-none"
        style={{
          objectPosition: 'center right',
          transform: 'scale(0.6) rotate(-5deg)',
          zIndex: 0
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
      <div style={{ zIndex: 1, position: 'relative', height: '100%' }}>
      {/* Header */}
      <div className="border-b border-gray-700 p-4 bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              >
                <ArrowLeft size={18} />
                <span>Back</span>
              </button>
            )}
            <Book className="text-blue-400" size={24} />
            <h1 className="text-2xl font-bold">Developer Documentation</h1>
            <span className="text-sm text-gray-400 ml-2">Public Access</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documentation..."
            className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 border-r border-gray-700 bg-gray-800 overflow-y-auto custom-scrollbar">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-gray-400 uppercase mb-3">Categories</h2>
            <div className="space-y-2">
              {['Basics', 'Tools', 'Security', 'Services', 'AI'].map(category => (
                <div key={category} className="mb-4">
                  <div className="text-xs font-semibold text-gray-500 mb-2">{category}</div>
                  {filteredDocs
                    .filter(doc => doc.category === category)
                    .map(doc => (
                      <button
                        key={doc.id}
                        onClick={() => setActiveDoc(doc.id)}
                        className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center gap-2 transition-colors ${
                          activeDoc === doc.id
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {doc.icon}
                        <span className="text-sm">{doc.title}</span>
                      </button>
                    ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {selectedDoc ? (
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h2 className="text-3xl font-bold mb-2">{selectedDoc.title}</h2>
                <div className="text-sm text-gray-400">{selectedDoc.category}</div>
              </div>
              <div className="prose prose-invert prose-lg max-w-none">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 markdown-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      h1: ({ node, ...props }) => (
                        <h1 className="text-3xl font-bold text-white mb-4 mt-6 first:mt-0 border-b border-gray-700 pb-2" {...props} />
                      ),
                      h2: ({ node, ...props }) => (
                        <h2 className="text-2xl font-bold text-white mb-3 mt-6 first:mt-0 border-b border-gray-700 pb-2" {...props} />
                      ),
                      h3: ({ node, ...props }) => (
                        <h3 className="text-xl font-bold text-blue-400 mb-2 mt-4" {...props} />
                      ),
                      h4: ({ node, ...props }) => (
                        <h4 className="text-lg font-semibold text-purple-400 mb-2 mt-3" {...props} />
                      ),
                      p: ({ node, ...props }) => (
                        <p className="text-gray-200 mb-4 leading-relaxed" {...props} />
                      ),
                      ul: ({ node, ...props }) => (
                        <ul className="list-disc list-inside mb-4 space-y-2 text-gray-200 ml-4" {...props} />
                      ),
                      ol: ({ node, ...props }) => (
                        <ol className="list-decimal list-inside mb-4 space-y-2 text-gray-200 ml-4" {...props} />
                      ),
                      li: ({ node, ...props }) => (
                        <li className="text-gray-200 leading-relaxed" {...props} />
                      ),
                      code: ({ node, inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '');
                        const language = match ? match[1] : '';
                        const codeString = String(children).replace(/\n$/, '');
                        
                        return !inline && language ? (
                          <div className="my-4">
                            <CodeBlockHighlighter
                              language={language}
                              style={vscDarkPlus}
                              customStyle={{
                                margin: 0,
                                borderRadius: '0.5rem',
                                padding: '1rem',
                                fontSize: '0.875rem',
                                lineHeight: '1.5',
                              }}
                              PreTag="div"
                              {...props}
                            >
                              {codeString}
                            </CodeBlockHighlighter>
                          </div>
                        ) : (
                          <code className="bg-gray-900 text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                            {children}
                          </code>
                        );
                      },
                      blockquote: ({ node, ...props }) => (
                        <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-4" {...props} />
                      ),
                      a: ({ node, ...props }) => (
                        <a className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer" {...props} />
                      ),
                      strong: ({ node, ...props }) => (
                        <strong className="font-bold text-white" {...props} />
                      ),
                      em: ({ node, ...props }) => (
                        <em className="italic text-gray-300" {...props} />
                      ),
                      hr: ({ node, ...props }) => (
                        <hr className="border-gray-700 my-6" {...props} />
                      ),
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto my-4">
                          <table className="min-w-full border-collapse border border-gray-700" {...props} />
                        </div>
                      ),
                      thead: ({ node, ...props }) => (
                        <thead className="bg-gray-900" {...props} />
                      ),
                      tbody: ({ node, ...props }) => (
                        <tbody {...props} />
                      ),
                      tr: ({ node, ...props }) => (
                        <tr className="border-b border-gray-700" {...props} />
                      ),
                      th: ({ node, ...props }) => (
                        <th className="border border-gray-700 px-4 py-2 text-left font-semibold text-white bg-gray-900" {...props} />
                      ),
                      td: ({ node, ...props }) => (
                        <td className="border border-gray-700 px-4 py-2 text-gray-200" {...props} />
                      ),
                    }}
                  >
                    {selectedDoc.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Book className="text-gray-600 mb-4" size={64} />
              <h2 className="text-2xl font-bold mb-2">Select a Document</h2>
              <p className="text-gray-400">
                Choose a topic from the sidebar to view documentation
              </p>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

