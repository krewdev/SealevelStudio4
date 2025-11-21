// Check Twitter authentication status
// GET /api/twitter/auth/status

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

/**
 * Check Twitter authentication status
 */
export async function GET(request: NextRequest) {
  try {
    const accessToken = request.cookies.get('twitter_access_token')?.value;
    const userId = request.cookies.get('twitter_user_id')?.value;
    const username = request.cookies.get('twitter_username')?.value;

    if (!accessToken || !userId) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    // Verify token is still valid by making an API call
    try {
      const client = new TwitterApi(accessToken);
      const user = await client.v2.me({
        'user.fields': ['username', 'name', 'profile_image_url'],
      });

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.data.id,
          username: user.data.username,
          name: user.data.name,
          profileImageUrl: user.data.profile_image_url,
        },
      });
    } catch (error) {
      // Token is invalid, clear cookies
      const response = NextResponse.json({
        authenticated: false,
        user: null,
        error: 'Token expired or invalid',
      });

      response.cookies.delete('twitter_access_token');
      response.cookies.delete('twitter_refresh_token');
      response.cookies.delete('twitter_user_id');
      response.cookies.delete('twitter_username');

      return response;
    }
  } catch (error) {
    console.error('Check auth status error:', error);
    return NextResponse.json(
      {
        authenticated: false,
        user: null,
        error: error instanceof Error ? error.message : 'Failed to check auth status',
      },
      { status: 500 }
    );
  }
}
