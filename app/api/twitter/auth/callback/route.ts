// Twitter OAuth 2.0 Callback
// Exchanges authorization code for access token

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

/**
 * Twitter OAuth callback
 * GET /api/twitter/auth/callback?code=<code>&state=<state>
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL(`/twitter-bot?error=${encodeURIComponent(error)}`, request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/twitter-bot?error=missing_parameters', request.url));
  }

  try {
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const callbackUrl = process.env.TWITTER_CALLBACK_URL || 
                       `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/twitter/auth/callback`;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/twitter-bot?error=server_configuration', request.url));
    }

    // Verify state matches stored state
    const storedState = request.cookies.get('twitter_oauth_state')?.value;
    if (state !== storedState) {
      return NextResponse.redirect(new URL('/twitter-bot?error=invalid_state', request.url));
    }

    // Get code verifier from cookie
    const codeVerifier = request.cookies.get('twitter_code_verifier')?.value;
    if (!codeVerifier) {
      return NextResponse.redirect(new URL('/twitter-bot?error=missing_code_verifier', request.url));
    }

    // Create OAuth 2.0 client
    const client = new TwitterApi({
      clientId,
      clientSecret,
    });

    // Exchange code for access token
    const { client: loggedClient, accessToken, refreshToken, expiresIn } = await client.loginWithOAuth2({
      code,
      codeVerifier,
      redirectUri: callbackUrl,
    });

    // Get user info
    const user = await loggedClient.v2.me({
      'user.fields': ['username', 'name', 'profile_image_url'],
    });

    // In production, store tokens securely in database with user ID
    // For now, we'll store in a secure cookie (in production, use database)
    const response = NextResponse.redirect(new URL('/twitter-bot?success=auth_complete', request.url));
    
    // Store tokens in secure cookies (in production, use database)
    response.cookies.set('twitter_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn || 7200, // Default 2 hours
    });

    if (refreshToken) {
      response.cookies.set('twitter_refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Store user info
    response.cookies.set('twitter_user_id', user.data.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    response.cookies.set('twitter_username', user.data.username || '', {
      httpOnly: false, // Can be accessed client-side for display
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Clear OAuth cookies
    response.cookies.delete('twitter_code_verifier');
    response.cookies.delete('twitter_oauth_state');

    return response;
  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    return NextResponse.redirect(new URL(`/twitter-bot?error=${encodeURIComponent(error instanceof Error ? error.message : 'auth_failed')}`, request.url));
  }
}
