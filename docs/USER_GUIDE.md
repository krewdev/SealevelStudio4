# Sealevel Studio User Guide

## Welcome to Sealevel Studio

Sealevel Studio is an interactive transaction builder and simulator for Solana. This guide will help you get started and make the most of all features.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Transaction Builder](#transaction-builder)
3. [Arbitrage Scanner](#arbitrage-scanner)
4. [AI Agents](#ai-agents)
5. [Account Inspector](#account-inspector)
6. [VeriSol Attestations](#verisol-attestations)
7. [Tips & Best Practices](#tips--best-practices)

---

## Getting Started

### Connecting Your Wallet

1. Click the "Connect Wallet" button in the top right
2. Select your wallet provider (Phantom, Solflare, etc.)
3. Approve the connection request
4. Your wallet address will appear in the header

### Network Selection

- **Mainnet**: Real Solana mainnet (use real SOL)
- **Devnet**: Test network (free test SOL)
- **Testnet**: Alternative test network

**Note:** Always use Devnet for testing!

---

## Transaction Builder

### Building Your First Transaction

1. Navigate to "Transaction Builder" from the sidebar
2. Click "Add Instruction" to start building
3. Select a program (e.g., System Program, SPL Token)
4. Choose an instruction type
5. Fill in the required parameters
6. Review and sign the transaction

### Instruction Types

#### System Program
- **Transfer SOL**: Send SOL from one account to another
- **Create Account**: Create a new account on-chain

#### SPL Token Program
- **Transfer Token**: Transfer tokens between accounts
- **Mint Tokens**: Mint new tokens (requires mint authority)
- **Burn Tokens**: Burn tokens to reduce supply
- **Create Associated Token Account**: Create an ATA for a token

#### Advanced Features
- **Create Token + Mint**: Create both token mint and account in one transaction
- **Token-2022 Extensions**: Support for advanced token features (transfer fees, hooks, etc.)

### Simple vs Advanced Mode

- **Simple Mode**: User-friendly forms with helpful tooltips
- **Advanced Mode**: Direct account and instruction configuration

### Tips

- Use the address clipboard to quickly paste frequently used addresses
- Hover over instruction blocks to see detailed explanations
- Use the AI agent for help building complex transactions

---

## Arbitrage Scanner

### Finding Arbitrage Opportunities

1. Navigate to "Arbitrage Scanner" from the sidebar
2. Click "Scan" to search for opportunities
3. Filter by DEX, sort by profit, or search by token
4. Click on an opportunity to see details

### Executing Arbitrage

1. Find a profitable opportunity (green profit indicator)
2. Review the path and confidence score
3. Click "Execute" to execute the arbitrage
4. Confirm the transaction in your wallet
5. Wait for confirmation

### Scanner Features

- **Real-time Updates**: WebSocket subscriptions for live pool data
- **Multi-DEX Support**: Scans Raydium, Orca, Jupiter, Meteora, Lifinity
- **AI-Powered**: Finds unconventional arbitrage opportunities
- **One-Click Execution**: Execute profitable opportunities directly

### Configuration

- **Auto Refresh**: Automatically scan for new opportunities
- **Refresh Interval**: Set how often to scan (5-60 seconds)
- **Min Profit Threshold**: Filter opportunities by minimum profit
- **Enabled DEXs**: Choose which DEXs to scan

---

## AI Agents

### Transaction Agent

Get help building transactions:
- Ask questions about Solana programs
- Get code suggestions
- Validate your transaction before sending
- Get cost estimates

### Scanner Agent

Analyze arbitrage opportunities:
- Risk/reward assessment
- Market context analysis
- Strategy suggestions
- Optimal entry/exit points

### Simulator Agent

Understand transaction behavior:
- Predict state changes
- Detect potential errors
- Suggest optimizations
- Explain execution flow

### Global Scanner Agent

Market-wide analysis:
- Cross-protocol opportunities
- Market trends
- Anomaly detection
- Volume analysis

---

## Account Inspector

### Inspecting Accounts

1. Navigate to "Account Inspector"
2. Paste an account address
3. View parsed account data
4. See token balances, program data, etc.

### Supported Account Types

- **System Accounts**: SOL balances, account info
- **Token Accounts**: Token balances, mint info
- **Program Accounts**: Parsed program-specific data
- **Unknown Accounts**: Raw account data

---

## VeriSol Attestations

### Creating a Beta Tester Attestation

1. Navigate to "VeriSol Attestation" from the sidebar
2. Connect your wallet
3. Check your usage stats (minimum 10 feature uses required)
4. Click "Create Beta Tester Attestation"
5. Approve the transaction
6. Receive your cNFT attestation

### Requirements

- **Minimum Usage**: 10 feature uses across the app
- **Wallet Connection**: Must be connected
- **ZK Proof**: Zero-knowledge proof of your usage

### Checking Attestations

Use the API to check if a wallet has an attestation:
```
GET /api/verisol/beta-tester/check?wallet=<address>
```

---

## Tips & Best Practices

### Transaction Building

1. **Always Simulate First**: Use the simulator before sending real transactions
2. **Check Account Requirements**: Ensure all required accounts are provided
3. **Verify Amounts**: Double-check SOL and token amounts
4. **Use AI Agent**: Get help with complex transactions

### Arbitrage Trading

1. **Start Small**: Test with small amounts first
2. **Check Slippage**: Ensure slippage tolerance is appropriate
3. **Monitor Gas Costs**: Factor in transaction fees
4. **Use High Confidence**: Prefer opportunities with >70% confidence

### Security

1. **Never Share Private Keys**: Keep your keys secure
2. **Verify Transactions**: Always review transactions before signing
3. **Use Devnet for Testing**: Test on Devnet before mainnet
4. **Check Addresses**: Verify all addresses are correct

### Performance

1. **Use Caching**: Scanner caches pool data for faster updates
2. **Enable Auto-Refresh**: For real-time opportunity detection
3. **Filter Results**: Use filters to focus on relevant opportunities
4. **Monitor Errors**: Check error messages for issues

---

## Troubleshooting

### Common Issues

**"Wallet not connected"**
- Click "Connect Wallet" and approve the connection

**"Insufficient funds"**
- Ensure you have enough SOL for transaction fees
- Check your wallet balance

**"Transaction failed"**
- Review error message for details
- Check that all accounts are valid
- Verify you have required permissions

**"Scanner not finding opportunities"**
- Adjust min profit threshold
- Enable more DEXs
- Check network connection

### Getting Help

- Use AI agents for assistance
- Check error messages for details
- Review transaction logs
- Contact support if needed

---

## Advanced Features

### Token-2022 Extensions

Support for advanced token features:
- Transfer fees
- Transfer hooks
- Confidential transfers
- Interest-bearing tokens
- Non-transferable tokens
- Metadata pointers
- Supply caps

### Multi-Instruction Transactions

Build complex transactions with multiple instructions:
- Create account + transfer
- Create ATA + transfer tokens
- Multiple swaps in one transaction

### Custom Programs

Support for custom Solana programs:
- Add custom program IDs
- Configure instruction parameters
- Use Anchor IDL for parsing

---

## FAQ

**Q: Is this safe to use?**
A: Yes, but always verify transactions before signing. Use Devnet for testing.

**Q: Do I need to pay to use the app?**
A: During beta, all features are free. Future versions may require SEAL tokens.

**Q: Can I use this for production trading?**
A: This is a development tool. Use at your own risk for production trading.

**Q: How accurate is the arbitrage scanner?**
A: Opportunities are estimates. Always verify before executing.

**Q: What happens if a transaction fails?**
A: You'll see an error message. Review and try again with corrections.

---

## Support

For questions or issues:
- Check the documentation
- Use AI agents for help
- Review error messages
- Contact support

Happy building! 🚀

