import { NextRequest, NextResponse } from 'next/server';
import { 
  usageRecords, 
  freeTrials,
  getUsageStats,
  getUserUsageRecords 
} from '@/app/lib/usage-tracking/tracker';

export const dynamic = 'force-dynamic';

/**
 * Admin Analytics API
 * Returns analytics for all users
 * 
 * SECURITY: Requires admin authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Check for admin authentication
    const adminToken = request.headers.get('x-admin-token') || request.cookies.get('admin_token')?.value;
    const expectedAdminToken = process.env.ADMIN_API_TOKEN;
    
    // If no admin token is configured, deny access in production
    if (!expectedAdminToken) {
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { error: 'Admin access not configured. This endpoint is disabled in production.' },
          { status: 503 }
        );
      }
      // In development, allow access but log warning
      console.warn('⚠️  WARNING: Admin analytics endpoint accessed without authentication in development mode');
    } else {
      // Verify admin token
      if (!adminToken || adminToken !== expectedAdminToken) {
        return NextResponse.json(
          { error: 'Unauthorized. Admin authentication required.' },
          { status: 401 }
        );
      }
    }

    const searchParams = request.nextUrl.searchParams;
    const period = (searchParams.get('period') as 'daily' | 'weekly' | 'monthly' | 'all_time') || 'all_time';

    // Get all users
    const allUserIds = Array.from(new Set([
      ...Array.from(usageRecords.keys()),
      ...Array.from(freeTrials.keys())
    ]));

    // Aggregate statistics
    const userAnalytics = allUserIds.map(userId => {
      const trial = freeTrials.get(userId);
      const records = getUserUsageRecords(userId);
      const stats = getUsageStats(userId, period);

      return {
        userId,
        trialStatus: trial ? {
          isActive: trial.isActive,
          startDate: trial.startDate,
          endDate: trial.endDate,
          remainingDays: trial.remainingDays,
          totalUsage: trial.totalUsage,
          featuresUsed: trial.featuresUsed,
        } : null,
        usageStats: stats,
        totalRecords: records.length,
        recentActivity: records
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, 10)
          .map(r => ({
            feature: r.feature,
            timestamp: r.timestamp,
            cost: r.cost,
          })),
      };
    });

    // Overall statistics
    const totalUsers = allUserIds.length;
    const activeTrials = userAnalytics.filter(u => u.trialStatus?.isActive).length;
    const totalUsage = userAnalytics.reduce((sum, u) => sum + (u.trialStatus?.totalUsage || 0), 0);
    const totalCost = userAnalytics.reduce((sum, u) => sum + u.usageStats.totalCost, 0);
    const totalPaid = userAnalytics.reduce((sum, u) => sum + u.usageStats.totalPaid, 0);

    // Feature usage breakdown
    const featureUsage: Record<string, number> = {};
    userAnalytics.forEach(user => {
      Object.entries(user.usageStats.features).forEach(([feature, count]) => {
        featureUsage[feature] = (featureUsage[feature] || 0) + count;
      });
    });

    // Daily usage trend (last 30 days)
    const dailyUsage: Record<string, number> = {};
    const now = new Date();
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyUsage[dateKey] = 0;
    }

    allUserIds.forEach(userId => {
      const records = getUserUsageRecords(userId);
      records.forEach(record => {
        const dateKey = record.timestamp.toISOString().split('T')[0];
        if (dailyUsage[dateKey] !== undefined) {
          dailyUsage[dateKey]++;
        }
      });
    });

    return NextResponse.json({
      summary: {
        totalUsers,
        activeTrials,
        expiredTrials: totalUsers - activeTrials,
        totalUsage,
        totalCost,
        totalPaid,
        period,
      },
      featureUsage,
      dailyUsage: Object.entries(dailyUsage)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      users: userAnalytics.sort((a, b) => {
        // Sort by most recent activity
        const aRecent = a.recentActivity[0]?.timestamp.getTime() || 0;
        const bRecent = b.recentActivity[0]?.timestamp.getTime() || 0;
        return bRecent - aRecent;
      }),
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

