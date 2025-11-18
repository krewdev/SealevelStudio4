import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Initiate Twitter OAuth 1.0a flow
 * Step 1: Request token
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.TWITTER_API_KEY;
    const apiSecret = process.env.TWITTER_API_SECRET;
    const callbackUrl = process.env.TWITTER_CALLBACK_URL || 
                       `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/twitter/auth/callback`;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Twitter API credentials not configured' },
        { status: 500 }
      );
    }

    // Generate OAuth 1.0a request token
    const oauthParams = {
      oauth_callback: callbackUrl,
      oauth_consumer_key: apiKey,
      oauth_nonce: crypto.randomBytes(16).toString('hex'),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
      oauth_version: '1.0',
    };

    // Create signature (simplified - full implementation would use proper OAuth signing)
    const baseString = Object.keys(oauthParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(oauthParams[key as keyof typeof oauthParams])}`)
      .join('&');

    const signatureKey = `${encodeURIComponent(apiSecret)}&`;
    const signature = crypto
      .createHmac('sha1', signatureKey)
      .update(baseString)
      .digest('base64');

    // Request token from Twitter
    const response = await fetch('https://api.twitter.com/oauth/request_token', {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${Object.entries(oauthParams).map(([k, v]) => `${k}="${encodeURIComponent(v)}"`).join(', ')}, oauth_signature="${encodeURIComponent(signature)}"`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get request token');
    }

    const responseText = await response.text();
    const params = new URLSearchParams(responseText);
    const oauthToken = params.get('oauth_token');
    const oauthTokenSecret = params.get('oauth_token_secret');

    if (!oauthToken) {
      throw new Error('No oauth token received');
    }

    // Store token secret in session (in production, use secure session storage)
    // For now, we'll return it to be stored client-side temporarily
    const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${oauthToken}`;

    return NextResponse.json({
      success: true,
      authUrl,
      oauthToken,
      oauthTokenSecret, // In production, store securely server-side
    });
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

