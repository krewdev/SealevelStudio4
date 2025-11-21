import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Logout from Twitter (clear stored tokens)
 */
export async function POST(request: NextRequest) {
  try {
    // Clear all Twitter auth cookies
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully',
    });

    // Clear all Twitter-related cookies
    response.cookies.delete('twitter_access_token');
    response.cookies.delete('twitter_refresh_token');
    response.cookies.delete('twitter_user_id');
    response.cookies.delete('twitter_username');
    response.cookies.delete('twitter_code_verifier');
    response.cookies.delete('twitter_oauth_state');

    // In production, also clear from database/session storage
    
    return response;
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

