/**
 * Transaction Seed API
 * POST /api/transactions/seed
 * Seeds the database with test transaction data
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/database/connection';

export const dynamic = 'force-dynamic';

// Generate a test wallet address in the format x0testttttt...
function generateTestAddress(prefix: string = 'x0test'): string {
  const randomSuffix = Math.random().toString(36).substring(2, 12).padEnd(12, '0');
  return `${prefix}${randomSuffix}`.substring(0, 44); // Solana addresses are 44 chars
}

// Generate a test transaction signature
function generateTestSignature(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 88; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const FEATURES = [
  'transaction-builder',
  'arbitrage-scanner',
  'account-inspector',
  'pumpfun-sniper',
  'market-maker',
  'mev-tools',
  'token-launch',
  'wallet-manager',
];

const TRANSACTION_TYPES = [
  'build',
  'send',
  'scan',
  'analyze',
  'execute',
  'create',
  'transfer',
  'swap',
];

const STATUSES: Array<'pending' | 'success' | 'failed' | 'cancelled'> = [
  'success',
  'success',
  'success',
  'pending',
  'failed',
  'success',
]; // More successes than failures for realistic data

export async function POST(request: NextRequest) {
  try {
    // Check for admin authorization (in production, add proper auth)
    // Allow in development without auth, require token in production
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization');
      const expectedToken = process.env.SEED_API_TOKEN;
      
      if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    const body = await request.json().catch(() => ({}));
    const { count = 50, clearExisting = false } = body;

    // Clear existing test data if requested
    if (clearExisting) {
      await query(
        `DELETE FROM feature_transactions 
         WHERE user_wallet_address LIKE 'x0test%'`
      );
    }

    // Generate test transactions
    const transactions = [];
    const now = new Date();

    for (let i = 0; i < count; i++) {
      const walletAddress = generateTestAddress();
      const walletId = `wallet_${i}_${Date.now()}`;
      const featureName = FEATURES[Math.floor(Math.random() * FEATURES.length)];
      const transactionType = TRANSACTION_TYPES[Math.floor(Math.random() * TRANSACTION_TYPES.length)];
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const network = 'devnet' as 'mainnet' | 'devnet' | 'testnet';
      
      // Create timestamp between 1 day ago and now
      const daysAgo = Math.random() * 7; // Last 7 days
      const createdAt = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

      const transactionSignature = status === 'success' ? generateTestSignature() : null;
      const errorMessage = status === 'failed' ? 'Transaction failed: Insufficient funds' : null;

      const transactionData = {
        feature: featureName,
        type: transactionType,
        amount: Math.random() * 10,
        token: ['SOL', 'USDC', 'USDT'][Math.floor(Math.random() * 3)],
        network,
        timestamp: createdAt.toISOString(),
      };

      transactions.push({
        user_wallet_address: walletAddress,
        user_wallet_id: walletId,
        feature_name: featureName,
        transaction_type: transactionType,
        transaction_signature: transactionSignature,
        transaction_data: JSON.stringify(transactionData),
        status,
        error_message: errorMessage,
        network,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    // Insert transactions one by one (simpler and more reliable)
    let inserted = 0;

    for (const tx of transactions) {
      try {
        await query(
          `INSERT INTO feature_transactions 
           (user_wallet_address, user_wallet_id, feature_name, transaction_type, transaction_signature, transaction_data, status, error_message, network, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            tx.user_wallet_address,
            tx.user_wallet_id,
            tx.feature_name,
            tx.transaction_type,
            tx.transaction_signature,
            tx.transaction_data,
            tx.status,
            tx.error_message,
            tx.network,
            tx.created_at,
            tx.updated_at,
          ]
        );
        inserted++;
      } catch (err) {
        console.error('Failed to insert transaction:', err);
        // Continue with next transaction
      }
    }

    return NextResponse.json({
      success: true,
      inserted,
      message: `Successfully seeded ${inserted} test transactions`,
    });
  } catch (error) {
    console.error('Transaction seed error:', error);
    
    // If database is not configured, return success (graceful degradation)
    if (error instanceof Error && error.message.includes('Database not configured')) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured. Please set DATABASE_URL environment variable.',
      }, { status: 503 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to seed transactions',
      },
      { status: 500 }
    );
  }
}

