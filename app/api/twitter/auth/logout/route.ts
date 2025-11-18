import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Logout from Twitter (clear stored tokens)
 */
export async function POST(request: NextRequest) {
  try {
    // In production, clear session/cookies/database tokens
    // For now, just return success
    
    return NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to logout',
        success: false,
      },
      { status: 500 }
    );
  }
}

