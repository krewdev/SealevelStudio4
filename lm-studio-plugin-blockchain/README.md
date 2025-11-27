# LM Studio Blockchain Plugin

A plugin for LM Studio that enables blockchain access to the Solana network. This plugin provides function calling capabilities that allow AI models running in LM Studio to interact with the Solana blockchain.

## Features

- ✅ Query SOL balances
- ✅ Get account information
- ✅ Check SPL token balances
- ✅ Retrieve transaction details
- ✅ Build transfer transactions
- ✅ Get blockchain status (slot, blockhash, block height)
- ✅ Validate Solana addresses
- ✅ Support for Mainnet, Devnet, and Testnet

## Installation

### Prerequisites

- LM Studio installed and running
- Node.js 18+ installed
- TypeScript (will be installed as dev dependency)

### Setup Steps

1. **Navigate to the plugin directory:**
   ```bash
   cd lm-studio-plugin-blockchain
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the plugin:**
   ```bash
   npm run build
   ```

4. **Install the plugin in LM Studio:**
   - Open LM Studio
   - Go to Settings → Plugins
   - Click "Add Plugin" or "Install from Folder"
   - Select the `lm-studio-plugin-blockchain` directory
   - The plugin should appear in your plugins list

5. **Enable the plugin:**
   - In LM Studio, go to the chat interface
   - Click on the plugins icon
   - Enable "Blockchain Access" plugin

## Configuration

### Encryption Key (Required for Production)

LM Studio requires an encryption key for production use. This ensures secure handling of blockchain operations.

**Generate an encryption key:**
```bash
npm run generate-key
```

Or manually:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Set the encryption key:**

1. **Create a `.env` file** in the plugin directory:
   ```bash
   cp .env.example .env
   ```

2. **Add your encryption key:**
   ```bash
   LM_STUDIO_PLUGIN_ENCRYPTION_KEY=your_generated_key_here
   ```

3. **For production deployment**, set the environment variable:
   - In LM Studio plugin settings, or
   - As a system environment variable, or
   - In your deployment platform's environment variables

**Note:** The encryption key is optional for development but **required for production** to avoid security warnings.

### Environment Variables (Optional)

You can configure custom RPC endpoints by setting environment variables:

```bash
# Mainnet RPC (optional - defaults to public RPC)
SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Devnet RPC (optional - defaults to public RPC)
SOLANA_RPC_DEVNET=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

### Network Selection

By default, the plugin uses Solana Mainnet. You can specify a different network in function calls:

- `mainnet` - Solana Mainnet (default)
- `devnet` - Solana Devnet
- `testnet` - Solana Testnet

## Available Functions

### 1. getBalance

Get the SOL balance for a wallet address.

**Parameters:**
- `address` (string, required): Solana wallet address
- `network` (string, optional): Network to query (mainnet/devnet/testnet)

**Example:**
```
Get the balance for address 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

### 2. getAccountInfo

Get detailed account information.

**Parameters:**
- `address` (string, required): Solana account address
- `network` (string, optional): Network to query

**Example:**
```
Get account info for 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

### 3. getTokenBalance

Get SPL token balance for a wallet and token mint.

**Parameters:**
- `walletAddress` (string, required): Wallet address
- `mintAddress` (string, required): Token mint address
- `network` (string, optional): Network to query

**Example:**
```
Get USDC balance for wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Token mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### 4. getTransaction

Get transaction details by signature.

**Parameters:**
- `signature` (string, required): Transaction signature
- `network` (string, optional): Network to query

**Example:**
```
Get transaction details for signature 5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLg8TbSA4ogFCQzKKiUcrUUmqjxiXTY86DqYkTRnqGz
```

### 5. buildTransferTransaction

Build a SOL transfer transaction (returns transaction details, not signed).

**Parameters:**
- `fromAddress` (string, required): Sender address
- `toAddress` (string, required): Recipient address
- `amountSOL` (number, required): Amount in SOL
- `network` (string, optional): Network to use

**Example:**
```
Build a transfer of 0.1 SOL from 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU to 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```

### 6. getBlockchainInfo

Get current blockchain status.

**Parameters:**
- `network` (string, optional): Network to query

**Example:**
```
Get current blockchain info for mainnet
```

### 7. validateAddress

Validate if a string is a valid Solana address.

**Parameters:**
- `address` (string, required): Address to validate

**Example:**
```
Validate address 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

## Usage Examples

### Example 1: Check Wallet Balance

**User:** "What's the balance of wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU?"

**AI Response:** The plugin will call `getBalance` and return:
```json
{
  "balance": 1000000000,
  "balanceSOL": 1.0,
  "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

### Example 2: Get Transaction Details

**User:** "Tell me about transaction 5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLg8TbSA4ogFCQzKKiUcrUUmqjxiXTY86DqYkTRnqGz"

**AI Response:** The plugin will call `getTransaction` and provide details about the transaction.

### Example 3: Build Transfer

**User:** "I want to send 0.5 SOL from my wallet to 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"

**AI Response:** The plugin will call `buildTransferTransaction` and return transaction details including estimated fees.

## Development

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

This will start the plugin in development mode with hot reload.

### Watch Mode

```bash
npm run watch
```

This will watch for file changes and rebuild automatically.

## Troubleshooting

### Plugin Not Appearing in LM Studio

1. Make sure you've built the plugin (`npm run build`)
2. Check that the `dist` folder exists and contains `index.js`
3. Restart LM Studio
4. Check LM Studio's plugin logs for errors

### RPC Connection Errors

1. Check your internet connection
2. Verify the RPC endpoint is accessible
3. If using a custom RPC, ensure the API key is valid
4. Try switching networks (devnet vs mainnet)

### Function Call Errors

1. Verify the function parameters are correct
2. Check that addresses are valid Solana addresses
3. Ensure the network parameter matches the address network
4. Check LM Studio's console for detailed error messages

## Security Notes

⚠️ **Important Security Considerations:**

- This plugin does NOT sign or send transactions - it only builds and queries
- Never share private keys or seed phrases
- The `buildTransferTransaction` function returns transaction details but does not execute them
- Always verify transaction details before signing in a wallet
- Use devnet for testing before using mainnet

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Check the [LM Studio Plugin Documentation](https://lmstudio.ai/docs/typescript/plugins)
- Review the plugin logs in LM Studio
- Open an issue in the repository

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

