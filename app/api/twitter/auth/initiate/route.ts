// Twitter OAuth 2.0 Initiation
// Uses OAuth 2.0 which is simpler and more secure than OAuth 1.0a

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

/**
 * Initiate Twitter OAuth 2.0 flow or direct authentication
 * POST /api/twitter/auth/initiate
 * Body: { useDirectAuth?: boolean } - optional, defaults to OAuth
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { useDirectAuth = false } = body;

    // Check for direct access token first
    const accessToken = process.env.TWITTER_ACCESS_TOKEN;
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;

    if (useDirectAuth && accessToken) {
      // Direct authentication using access token
      const client = new TwitterApi(accessToken);

      try {
        // Verify the token works by getting user info
        const user = await client.v2.me({
          'user.fields': ['username', 'name', 'profile_image_url'],
        });

        // Store token in secure cookie
        const response = NextResponse.json({
          success: true,
          authenticated: true,
          user: {
            id: user.data.id,
            username: user.data.username,
            name: user.data.name,
          },
          message: 'Successfully authenticated with direct access token',
        });

        response.cookies.set('twitter_access_token', accessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });

        response.cookies.set('twitter_user_id', user.data.id, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        });

        response.cookies.set('twitter_username', user.data.username || '', {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7,
        });

        return response;
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Invalid access token',
            success: false,
            details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
          },
          { status: 401 }
        );
      }
    }

    // Standard OAuth 2.0 flow
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const callbackUrl = process.env.TWITTER_CALLBACK_URL ||
                       `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/twitter/auth/callback`;

    if (!clientId || !clientSecret) {
      const errorMsg = accessToken
        ? 'Twitter OAuth credentials not configured, but direct access token is available. Try setting useDirectAuth=true.'
        : 'Twitter API credentials not configured. Please set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in your environment variables.';

      return NextResponse.json(
        {
          error: errorMsg,
          success: false,
          directAuthAvailable: !!accessToken,
        },
        { status: 500 }
      );
    }

    // Create OAuth 2.0 client
    const client = new TwitterApi({
      clientId,
      clientSecret,
    });

    // Generate authorization URL
    const { url, codeVerifier, state } = await client.generateOAuth2AuthLink(callbackUrl, {
      scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    });

    // Store codeVerifier and state in session/cookie
    const response = NextResponse.json({
      success: true,
      authUrl: url,
      state,
      codeVerifier, // In production, store server-side
      authMethod: 'oauth',
    });

    // Set secure cookie for codeVerifier (httpOnly, secure in production)
    response.cookies.set('twitter_code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    response.cookies.set('twitter_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error('Twitter OAuth initiation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to initiate Twitter login',
        success: false,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}
