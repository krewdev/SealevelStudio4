// Twitter OAuth callback for UserProfileWidget
// This endpoint handles OAuth callbacks and updates the user profile

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Twitter OAuth callback for profile linking
 * GET /api/auth/twitter/callback?code=<code>&state=<state>
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const walletAddress = searchParams.get('wallet');

  // Create a response that will close the popup and notify parent
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  if (error) {
    // Return HTML that closes popup and sends error to parent
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Twitter OAuth</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'TWITTER_OAUTH_ERROR',
              error: '${error}'
            }, '${baseUrl}');
            window.close();
          </script>
          <p>Authentication failed. This window will close automatically.</p>
        </body>
      </html>
    `;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  }

  if (!code || !state) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Twitter OAuth</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'TWITTER_OAUTH_ERROR',
              error: 'missing_parameters'
            }, '${baseUrl}');
            window.close();
          </script>
          <p>Missing parameters. This window will close automatically.</p>
        </body>
      </html>
    `;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    // Import TwitterApi to handle OAuth callback
    const { TwitterApi } = await import('twitter-api-v2');
    
    const clientId = process.env.TWITTER_CLIENT_ID;
    const clientSecret = process.env.TWITTER_CLIENT_SECRET;
    const callbackUrl = `${baseUrl}/api/auth/twitter/callback${walletAddress ? `?wallet=${encodeURIComponent(walletAddress)}` : ''}`;

    if (!clientId || !clientSecret) {
      throw new Error('Twitter OAuth credentials not configured');
    }

    // Verify state matches stored state
    const storedState = request.cookies.get('twitter_oauth_state')?.value;
    if (state !== storedState) {
      throw new Error('Invalid state parameter');
    }

    // Get code verifier from cookie
    const codeVerifier = request.cookies.get('twitter_code_verifier')?.value;
    if (!codeVerifier) {
      throw new Error('Missing code verifier');
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

    const username = user.data.username || '';

    // Create HTML response with cookies
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Twitter OAuth</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'TWITTER_OAUTH_SUCCESS',
              username: '${username || ''}',
              walletAddress: '${walletAddress || ''}'
            }, '${baseUrl}');
            window.close();
          </script>
          <p>Authentication successful! This window will close automatically.</p>
        </body>
      </html>
    `;
    
    const response = new NextResponse(html, { 
      headers: { 'Content-Type': 'text/html' } 
    });

    // Store tokens in secure cookies (for Twitter bot functionality)
    response.cookies.set('twitter_access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: expiresIn || 7200,
    });

    if (refreshToken) {
      response.cookies.set('twitter_refresh_token', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    response.cookies.set('twitter_user_id', user.data.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    response.cookies.set('twitter_username', username, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    // Clear OAuth cookies
    response.cookies.delete('twitter_code_verifier');
    response.cookies.delete('twitter_oauth_state');

    return response;
  } catch (error) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Twitter OAuth</title>
        </head>
        <body>
          <script>
            window.opener.postMessage({
              type: 'TWITTER_OAUTH_ERROR',
              error: '${error instanceof Error ? error.message : 'auth_failed'}'
            }, '${baseUrl}');
            window.close();
          </script>
          <p>Authentication failed. This window will close automatically.</p>
        </body>
      </html>
    `;
    return new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
  }
}

