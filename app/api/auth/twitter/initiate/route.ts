// Twitter OAuth initiation for UserProfileWidget
// This endpoint initiates OAuth flow with proper callback URL

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

/**
 * Initiate Twitter OAuth flow for profile linking
 * POST /api/auth/twitter/initiate
 * Body: { walletAddress?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { walletAddress } = body;

    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/auth/twitter/callback${walletAddress ? `?wallet=${encodeURIComponent(walletAddress)}` : ''}`;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error: 'Twitter OAuth credentials not configured. Please set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET in your environment variables (.env.local file).\n\nTo get these credentials:\n1. Go to https://developer.twitter.com/en/portal/dashboard\n2. Create a new app or use an existing one\n3. Navigate to "Keys and tokens"\n4. Copy the Client ID and Client Secret',
          success: false,
          requiresConfiguration: true,
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

    // Store codeVerifier and state in secure cookies
    const response = NextResponse.json({
      success: true,
      authUrl: url,
      state,
      authMethod: 'oauth',
    });

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
      },
      { status: 500 }
    );
  }
}

