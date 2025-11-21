// Twitter OAuth 2.0 Initiation
// Uses OAuth 2.0 which is simpler and more secure than OAuth 1.0a

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

/**
 * Initiate Twitter OAuth 2.0 flow
 * POST /api/twitter/auth/initiate
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const callbackUrl = process.env.TWITTER_CALLBACK_URL || 
                       `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/twitter/auth/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { 
          error: 'Twitter API credentials not configured. Please set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in your environment variables.',
          success: false,
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
    // In production, use secure session storage (Redis, database, etc.)
    // For now, we'll return them to be stored client-side temporarily
    const response = NextResponse.json({
      success: true,
      authUrl: url,
      state,
      codeVerifier, // In production, store server-side
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
