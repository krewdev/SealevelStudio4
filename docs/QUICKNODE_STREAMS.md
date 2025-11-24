# QuickNode Streams Integration

This document describes how to use QuickNode WebSocket streams with filters for pump.fun and arbitrage monitoring.

## Overview

QuickNode provides high-performance WebSocket streaming for Solana accounts and transactions. We use QuickNode streams with filters to monitor:

1. **Pump.fun Token Launches**: Real-time detection of new token launches
2. **Arbitrage Opportunities**: Real-time monitoring of DEX pool price imbalances

## Configuration

### Environment Variables

Add to `.env.local`:

```env
# QuickNode Configuration
QUICKNODE_API_KEY=your_quicknode_api_key
QUICKNODE_ENDPOINT=your-endpoint.solana-mainnet.quiknode.pro
NEXT_PUBLIC_QUICKNODE_WS_URL=wss://your-endpoint.solana-mainnet.quiknode.pro/your-api-key/

# Pump.fun Program ID (for filter)
PUMPFUN_PROGRAM_ID=6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P

# Fallback RPC (used when WebSocket has gaps)
QUICKNODE_STREAM_FILTER=https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
```

## QuickNode Stream Filters

### Pump.fun Filter

The pump.fun filter monitors the pump.fun program for new token launches:

```typescript
const filter = {
  programs: [PUMPFUN_PROGRAM_ID], // Monitor all accounts owned by pump.fun program
  accountInclude: [], // Optional: specific accounts to monitor
};
```

**What it detects:**
- New token mint creation
- Bonding curve account creation
- Token metadata updates
- Price changes on bonding curve

### Arbitrage Filter

The arbitrage filter monitors DEX programs for price imbalances:

```typescript
const filter = {
  programs: [
    '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8', // Raydium AMM
    '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP', // Orca Whirlpool
    'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', // Jupiter
    // ... other DEX programs
  ],
  accounts: poolAddresses, // Optional: specific pool addresses
  vote: false, // Exclude vote transactions
  failed: false, // Include failed transactions (might indicate arbitrage attempts)
};
```

**What it detects:**
- Pool reserve changes
- Price updates
- Swap transactions
- Liquidity changes

## Usage

### Pump.fun Stream

```typescript
import { PumpFunQuickNodeStream } from '@/lib/pumpfun/quicknode-stream';

const stream = new PumpFunQuickNodeStream(connection);

stream.onEvent((event) => {
  if (event.type === 'token_created') {
    console.log('New token:', event.token);
    // Trigger AI analysis
  }
});

stream.connect();
```

### Arbitrage Stream

```typescript
import { ArbitrageQuickNodeStream } from '@/lib/arbitrage/quicknode-stream';

const stream = new ArbitrageQuickNodeStream(connection);

stream.onEvent((event) => {
  if (event.type === 'price_imbalance' && event.opportunity) {
    console.log('Arbitrage opportunity:', event.opportunity);
    // Execute arbitrage trade
  }
});

stream.connect(['pool1', 'pool2']); // Optional: specific pools
```

## Stream Manager

The `QuickNodeStreamManager` handles:

- **Connection Management**: Automatic reconnection with exponential backoff
- **Filter Application**: Applies filters to QuickNode WebSocket subscriptions
- **Event Parsing**: Parses QuickNode WebSocket messages into structured events
- **Subscription Management**: Tracks and manages multiple subscriptions

## Filter Types

QuickNode supports various filter types:

### Account Filters
```typescript
{
  accounts: ['account1', 'account2'], // Monitor specific accounts
}
```

### Program Filters
```typescript
{
  programs: ['program1', 'program2'], // Monitor all accounts owned by programs
}
```

### Transaction Filters
```typescript
{
  accountInclude: ['account1'], // Transactions involving these accounts
  accountExclude: ['account2'], // Exclude transactions with these accounts
  memos: ['memo1'], // Filter by memo content
  vote: false, // Include/exclude vote transactions
  failed: false, // Include/exclude failed transactions
}
```

## Performance Considerations

1. **Connection Pooling**: The stream manager pools connections to reduce overhead
2. **Selective Filtering**: Use specific filters to reduce data volume
3. **Fallback RPC**: `QUICKNODE_STREAM_FILTER` is used when WebSocket has gaps
4. **Reconnection**: Automatic reconnection with exponential backoff

## Troubleshooting

### Stream Not Connecting

1. **Check QuickNode Configuration**:
   ```bash
   echo $QUICKNODE_API_KEY
   echo $QUICKNODE_ENDPOINT
   ```

2. **Verify WebSocket URL**:
   - Should be: `wss://your-endpoint.solana-mainnet.quiknode.pro/your-api-key/`
   - Check browser console for connection errors

3. **Check Program IDs**:
   - Verify `PUMPFUN_PROGRAM_ID` is correct
   - Verify DEX program IDs are correct

### No Events Received

1. **Check Filters**: Ensure filters match actual on-chain activity
2. **Check Network**: Verify you're on the correct network (mainnet/devnet)
3. **Check Subscription**: Verify subscription was successful (check console logs)

### High Latency

1. **Use Specific Filters**: Narrow filters to reduce data volume
2. **Monitor Specific Pools**: Use `accounts` filter instead of `programs`
3. **Check QuickNode Plan**: Higher tier plans have better performance

## Best Practices

1. **Use Specific Filters**: Don't subscribe to entire programs if you only need specific accounts
2. **Monitor Connection Status**: Check `getStatus()` regularly
3. **Handle Reconnections**: Implement retry logic for critical operations
4. **Rate Limiting**: Be mindful of QuickNode rate limits
5. **Error Handling**: Always handle errors in callbacks

## API Reference

See:
- `app/lib/quicknode/stream.ts` - QuickNode stream manager
- `app/lib/pumpfun/quicknode-stream.ts` - Pump.fun stream implementation
- `app/lib/arbitrage/quicknode-stream.ts` - Arbitrage stream implementation








