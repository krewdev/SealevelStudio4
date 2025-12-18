# LM Studio Blockchain Plugin Setup Guide

This guide will help you set up and use the LM Studio Blockchain Plugin for Solana access.

## Overview

The LM Studio Blockchain Plugin enables AI models running in LM Studio to interact with the Solana blockchain. It provides function calling capabilities for:

- Querying wallet balances
- Getting account information
- Checking token balances
- Retrieving transaction details
- Building transactions
- Validating addresses

## Quick Start

### 1. Install Dependencies

Navigate to the plugin directory and install:

```bash
cd lm-studio-plugin-blockchain
npm install
```

### 2. Build the Plugin

```bash
npm run build
```

This will compile TypeScript to JavaScript in the `dist/` folder.

### 3. Install in LM Studio

1. Open **LM Studio**
2. Go to **Settings** → **Plugins** (or use the plugins icon in the chat interface)
3. Click **"Add Plugin"** or **"Install from Folder"**
4. Navigate to and select the `lm-studio-plugin-blockchain` directory
5. The plugin should appear in your plugins list as **"Blockchain Access"**

### 4. Enable the Plugin

1. In LM Studio's chat interface, click the **plugins icon** (usually in the top bar)
2. Find **"Blockchain Access"** in the list
3. Toggle it **ON**

### 5. Test the Plugin

Try asking your AI model:

```
What's the balance of wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU?
```

The AI should automatically call the `getBalance` function and return the wallet balance.

## Configuration

### Custom RPC Endpoints

By default, the plugin uses public Solana RPC endpoints. For better performance and rate limits, you can configure custom RPC endpoints.

#### Option 1: Environment Variables

Create a `.env` file in the plugin directory:

```bash
SOLANA_RPC_MAINNET=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
SOLANA_RPC_DEVNET=https://devnet.helius-rpc.com/?api-key=YOUR_KEY
```

#### Option 2: Modify Source Code

Edit `src/index.ts` and update the `DEFAULT_RPC_ENDPOINTS`:

```typescript
const DEFAULT_RPC_ENDPOINTS = {
  mainnet: 'https://your-custom-rpc.com',
  devnet: 'https://devnet.your-custom-rpc.com',
  testnet: 'https://testnet.your-custom-rpc.com',
};
```

Then rebuild:
```bash
npm run build
```

## Available Functions

### 1. getBalance

Query SOL balance for any wallet address.

**Example Usage:**
```
Get the balance for 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU on mainnet
```

**Returns:**
```json
{
  "balance": 1000000000,
  "balanceSOL": 1.0,
  "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
}
```

### 2. getAccountInfo

Get detailed account information including owner, executable status, and data length.

**Example Usage:**
```
Get account info for 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

### 3. getTokenBalance

Check SPL token balance for a wallet and token mint.

**Example Usage:**
```
Get USDC balance for wallet 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
Token mint: EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### 4. getTransaction

Retrieve transaction details by signature.

**Example Usage:**
```
Get transaction 5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLg8TbSA4ogFCQzKKiUcrUUmqjxiXTY86DqYkTRnqGz
```

### 5. buildTransferTransaction

Build a SOL transfer transaction (returns details, does NOT sign or send).

**Example Usage:**
```
Build a transfer of 0.1 SOL from 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU to 9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM
```

**Returns:**
```json
{
  "fromAddress": "...",
  "toAddress": "...",
  "amountSOL": 0.1,
  "amountLamports": 100000000,
  "transactionSize": 192,
  "estimatedFee": 5000,
  "instructions": ["SystemProgram.transfer"]
}
```

### 6. getBlockchainInfo

Get current blockchain status (slot, blockhash, block height).

**Example Usage:**
```
What's the current slot on mainnet?
```

### 7. validateAddress

Validate if a string is a valid Solana address.

**Example Usage:**
```
Is 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU a valid Solana address?
```

## Network Selection

All functions support network selection via the `network` parameter:

- `mainnet` - Solana Mainnet (default)
- `devnet` - Solana Devnet (for testing)
- `testnet` - Solana Testnet (deprecated, use devnet)

**Example:**
```
Get the balance for 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU on devnet
```

## Development

### Project Structure

```
lm-studio-plugin-blockchain/
├── src/
│   └── index.ts          # Main plugin code
├── dist/                 # Compiled JavaScript (generated)
├── package.json          # Dependencies and config
├── tsconfig.json         # TypeScript config
└── README.md            # Plugin documentation
```

### Building

```bash
npm run build
```

### Development Mode

```bash
npm run dev
```

### Watch Mode

```bash
npm run watch
```

Automatically rebuilds on file changes.

## Troubleshooting

### Plugin Not Loading

1. **Check Build:**
   ```bash
   cd lm-studio-plugin-blockchain
   npm run build
   ```
   Ensure `dist/index.js` exists.

2. **Check LM Studio Logs:**
   - In LM Studio, go to Help → View Logs
   - Look for plugin-related errors

3. **Restart LM Studio:**
   - Close and reopen LM Studio
   - Re-enable the plugin

### Function Calls Not Working

1. **Verify Plugin is Enabled:**
   - Check the plugins icon in LM Studio chat
   - Ensure "Blockchain Access" is toggled ON

2. **Check Model Support:**
   - Ensure your model supports function calling
   - Most modern models (GPT-4, Claude, Llama 3.1+) support this

3. **Test with Explicit Request:**
   ```
   Please use the getBalance function to check the balance of 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
   ```

### RPC Connection Errors

1. **Check Internet Connection:**
   - Ensure you're connected to the internet
   - Try accessing the RPC URL in a browser

2. **Verify RPC Endpoint:**
   - Test the endpoint: `https://api.mainnet-beta.solana.com`
   - If using custom RPC, verify API key is valid

3. **Try Different Network:**
   - Switch to devnet for testing
   - Devnet is often more stable for testing

### Rate Limiting

If you encounter rate limiting:

1. **Use Custom RPC:**
   - Set up a Helius or QuickNode account
   - Configure custom RPC endpoints (see Configuration section)

2. **Reduce Request Frequency:**
   - Space out your queries
   - Batch requests when possible

## Security Considerations

⚠️ **Important Security Notes:**

1. **No Transaction Signing:**
   - This plugin does NOT sign or send transactions
   - It only builds and queries blockchain data
   - Always verify transaction details before signing

2. **Private Keys:**
   - Never share private keys or seed phrases
   - The plugin never requires or stores private keys

3. **Transaction Building:**
   - `buildTransferTransaction` returns transaction details only
   - You must sign and send transactions through a wallet
   - Always double-check amounts and addresses

4. **Network Selection:**
   - Use devnet for testing
   - Only use mainnet when you're certain
   - Verify network matches your addresses

## Advanced Usage

### Custom Function Integration

You can extend the plugin by adding custom functions in `src/index.ts`:

```typescript
export async function myCustomFunction(params: { ... }): Promise<{ ... }> {
  // Your custom logic
}

// Add to tools export
export const tools = {
  // ... existing tools
  myCustomFunction: {
    name: 'myCustomFunction',
    description: 'Description of your function',
    parameters: { /* ... */ },
  },
};

// Add to functionHandlers
export const functionHandlers = {
  // ... existing handlers
  myCustomFunction,
};
```

Then rebuild:
```bash
npm run build
```

## Integration with Sealevel Studio

This plugin can work alongside your Sealevel Studio application:

1. **Shared RPC Configuration:**
   - Use the same RPC endpoints for consistency
   - Share environment variables if needed

2. **Complementary Features:**
   - Plugin: Query and build transactions
   - Sealevel Studio: Sign and execute transactions
   - Together: Complete blockchain workflow

3. **Development Workflow:**
   - Use plugin in LM Studio for AI-assisted queries
   - Use Sealevel Studio for actual transaction execution
   - Test on devnet before mainnet

## Support

For issues or questions:

1. Check the [main README](../lm-studio-plugin-blockchain/README.md)
2. Review LM Studio plugin logs
3. Check [LM Studio Plugin Documentation](https://lmstudio.ai/docs/typescript/plugins)
4. Open an issue in the repository

## Next Steps

1. ✅ Install and build the plugin
2. ✅ Enable it in LM Studio
3. ✅ Test with a simple balance query
4. ✅ Try building a transaction
5. ✅ Explore other functions
6. ✅ Configure custom RPC if needed

Enjoy using blockchain access in LM Studio! 🚀

