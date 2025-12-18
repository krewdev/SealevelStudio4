/**
 * Transaction Logging API
 * POST /api/transactions/log
 * Logs a user transaction for a specific feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/database/connection';

export const dynamic = 'force-dynamic';

export interface TransactionLog {
  userWalletAddress: string;
  userWalletId: string;
  featureName: string;
  transactionType: string;
  transactionSignature?: string;
  transactionData?: any;
  status?: 'pending' | 'success' | 'failed' | 'cancelled';
  errorMessage?: string;
  network?: 'mainnet' | 'devnet' | 'testnet';
}

export async function POST(request: NextRequest) {
  try {
    const body: TransactionLog = await request.json();

    // Validate required fields
    if (!body.userWalletAddress || !body.userWalletId || !body.featureName || !body.transactionType) {
      return NextResponse.json(
        { error: 'Missing required fields: userWalletAddress, userWalletId, featureName, transactionType' },
        { status: 400 }
      );
    }

    // Insert transaction log
    const result = await query(
      `INSERT INTO feature_transactions 
       (user_wallet_address, user_wallet_id, feature_name, transaction_type, transaction_signature, transaction_data, status, error_message, network)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, created_at`,
      [
        body.userWalletAddress,
        body.userWalletId,
        body.featureName,
        body.transactionType,
        body.transactionSignature || null,
        body.transactionData ? JSON.stringify(body.transactionData) : null,
        body.status || 'pending',
        body.errorMessage || null,
        body.network || 'devnet',
      ]
    );

    return NextResponse.json({
      success: true,
      transactionId: result.rows[0].id,
      createdAt: result.rows[0].created_at,
    });
  } catch (error) {
    console.error('Transaction logging error:', error);
    
    // If database is not configured, silently fail (graceful degradation)
    if (error instanceof Error && error.message.includes('Database not configured')) {
      return NextResponse.json({
        success: false,
        error: 'Transaction logging unavailable (database not configured)',
      }, { status: 503 });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to log transaction',
      },
      { status: 500 }
    );
  }
}

/**
 * Update transaction status
 * PATCH /api/transactions/log
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { transactionId, status, transactionSignature, errorMessage } = body;

    if (!transactionId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: transactionId, status' },
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    updates.push(`status = $${paramIndex++}`);
    params.push(status);

    if (transactionSignature) {
      updates.push(`transaction_signature = $${paramIndex++}`);
      params.push(transactionSignature);
    }

    if (errorMessage) {
      updates.push(`error_message = $${paramIndex++}`);
      params.push(errorMessage);
    }

    params.push(transactionId);

    await query(
      `UPDATE feature_transactions 
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex}`,
      params
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Transaction update error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update transaction',
      },
      { status: 500 }
    );
  }
}

