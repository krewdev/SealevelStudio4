# Transaction Logging System

## Overview

The transaction logging system records all user interactions with features across the application. Every transaction is stored in the database and kept for at least 6 months for reference.

## Features

- **Per-Feature Logging**: Each feature logs its transactions independently
- **Recent Transactions Display**: Shows the last N transactions for each feature
- **6-Month Retention**: Transactions are automatically cleaned up after 6 months
- **Status Tracking**: Tracks transaction status (pending, success, failed, cancelled)

## Database Schema

The `feature_transactions` table stores:
- User wallet address and ID
- Feature name
- Transaction type
- Transaction signature (if available)
- Transaction data (JSONB)
- Status
- Error messages
- Network (mainnet/devnet/testnet)
- Timestamps

## API Endpoints

### Log Transaction
```
POST /api/transactions/log
Body: {
  userWalletAddress: string,
  userWalletId: string,
  featureName: string,
  transactionType: string,
  transactionSignature?: string,
  transactionData?: any,
  status?: 'pending' | 'success' | 'failed' | 'cancelled',
  errorMessage?: string,
  network?: 'mainnet' | 'devnet' | 'testnet'
}
```

### Get Recent Transactions
```
GET /api/transactions/recent?walletAddress=...&feature=...&limit=10&offset=0
```

### Update Transaction Status
```
PATCH /api/transactions/log
Body: {
  transactionId: number,
  status: 'pending' | 'success' | 'failed' | 'cancelled',
  transactionSignature?: string,
  errorMessage?: string
}
```

### Seed Test Data
```
POST /api/transactions/seed
Body: {
  count: 50,
  clearExisting: true
}
Authorization: Bearer <SEED_API_TOKEN> (only required in production)
```

## Usage

### In Components

```typescript
import { useTransactionLogger } from '../hooks/useTransactionLogger';

function MyComponent() {
  const { log, updateStatus } = useTransactionLogger();
  
  const handleAction = async () => {
    // Log transaction start
    const transactionId = await log(
      'my-feature',
      'build',
      { /* transaction data */ }
    );
    
    try {
      // Perform action
      const signature = await sendTransaction();
      
      // Update to success
      if (transactionId) {
        await updateStatus(transactionId, 'success', signature);
      }
    } catch (error) {
      // Update to failed
      if (transactionId) {
        await updateStatus(transactionId, 'failed', undefined, error.message);
      }
    }
  };
}
```

### Display Recent Transactions

```typescript
import { RecentTransactions } from '../components/RecentTransactions';

function MyFeature() {
  return (
    <div>
      {/* Your feature content */}
      
      <RecentTransactions 
        featureName="my-feature" 
        limit={10}
        showHeader={true}
      />
    </div>
  );
}
```

## Seeding Test Data

To populate the database with test transactions for development:

```bash
# Using npm script
npm run seed:transactions

# Or directly with curl (development only)
curl -X POST http://localhost:3000/api/transactions/seed \
  -H "Content-Type: application/json" \
  -d '{"count": 50, "clearExisting": true}'
```

Test transactions use wallet addresses in the format `x0test...` for easy identification.

## Cleanup

Transactions older than 6 months are automatically cleaned up. You can manually trigger cleanup:

```bash
curl -X DELETE http://localhost:3000/api/transactions/cleanup \
  -H "Authorization: Bearer <CLEANUP_API_TOKEN>"
```

## Login Gate

Users must create or login to a wallet before accessing any features. The `LoginGate` component wraps the entire application and shows a login screen if the user is not authenticated.

## Features with Transaction Logging

- Transaction Builder
- Arbitrage Scanner
- Account Inspector
- Pump.fun Sniper
- Market Maker
- MEV Tools
- Token Launch
- Wallet Manager

