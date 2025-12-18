/**
 * Transaction Cleanup API
 * DELETE /api/transactions/cleanup
 * Deletes transactions older than 6 months
 * Should be called by a cron job or scheduled task
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function DELETE(request: NextRequest) {
  try {
    // Check for admin authorization (in production, add proper auth)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_API_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Call the cleanup function
    const result = await query('SELECT cleanup_old_transactions() as deleted_count');
    const deletedCount = result.rows[0]?.deleted_count || 0;

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `Deleted ${deletedCount} transactions older than 6 months`,
    });
  } catch (error) {
    console.error('Transaction cleanup error:', error);
    
    // If database is not configured, return success (graceful degradation)
    if (error instanceof Error && error.message.includes('Database not configured')) {
      return NextResponse.json({
        success: true,
        deletedCount: 0,
        message: 'Database not configured, cleanup skipped',
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup transactions',
      },
      { status: 500 }
    );
  }
}

