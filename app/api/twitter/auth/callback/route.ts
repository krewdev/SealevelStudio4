import { NextRequest, NextResponse } from 'next/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/**
 * Twitter OAuth callback
 * Step 2: Exchange request token for access token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const oauthToken = searchParams.get('oauth_token');
  const oauthVerifier = searchParams.get('oauth_verifier');
  const denied = searchParams.get('denied');

  if (denied) {
    redirect('/twitter-bot?error=access_denied');
  }

  if (!oauthToken || !oauthVerifier) {
    redirect('/twitter-bot?error=invalid_callback');
  }

  try {
    // Exchange request token for access token
    // In production, this would:
    // 1. Verify oauth_token matches stored request token
    // 2. Exchange with Twitter API
    // 3. Store access tokens securely
    // 4. Create session

    // For now, redirect back to bot page
    redirect('/twitter-bot?success=auth_complete');
  } catch (error) {
    console.error('Twitter OAuth callback error:', error);
    redirect('/twitter-bot?error=auth_failed');
  }
}

