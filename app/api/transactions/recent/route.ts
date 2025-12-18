/**
 * Get Recent Transactions API
 * GET /api/transactions/recent?feature=...&limit=...&walletAddress=...
 * Retrieves recent transactions for a user/feature
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const walletAddress = searchParams.get('walletAddress');
    const featureName = searchParams.get('feature');
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    let sql = `
      SELECT id, feature_name, transaction_type, transaction_signature, 
             transaction_data, status, error_message, network, created_at, updated_at
      FROM feature_transactions
      WHERE user_wallet_address = $1
    `;
    const params: any[] = [walletAddress];
    let paramIndex = 2;

    if (featureName) {
      sql += ` AND feature_name = $${paramIndex++}`;
      params.push(featureName);
    }

    sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // Parse JSONB transaction_data
    const transactions = result.rows.map(row => ({
      id: row.id,
      featureName: row.feature_name,
      transactionType: row.transaction_type,
      transactionSignature: row.transaction_signature,
      transactionData: row.transaction_data,
      status: row.status,
      errorMessage: row.error_message,
      network: row.network,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('Get recent transactions error:', error);
    
    // If database is not configured, return empty array (graceful degradation)
    if (error instanceof Error && error.message.includes('Database not configured')) {
      return NextResponse.json({
        success: true,
        transactions: [],
        count: 0,
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get transactions',
      },
      { status: 500 }
    );
  }
}

