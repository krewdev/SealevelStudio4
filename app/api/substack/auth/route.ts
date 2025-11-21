// Substack Authentication API
// Handles login and token management for Substack

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Login to Substack
 * POST /api/substack/auth
 * Body: { email, password } or { apiKey }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, apiKey } = body;

    const substackApiKey = apiKey || process.env.SUBSTACK_API_KEY;
    const substackEmail = email || process.env.SUBSTACK_EMAIL;
    const substackPassword = password || process.env.SUBSTACK_PASSWORD;

    if (!substackApiKey && (!substackEmail || !substackPassword)) {
      return NextResponse.json(
        { error: 'Substack credentials required (API key or email/password)', success: false },
        { status: 400 }
      );
    }

    // Authenticate with Substack
    let token: string;
    
    if (substackApiKey) {
      // Use API key authentication
      token = substackApiKey;
    } else {
      // Use email/password authentication
      // Substack doesn't have a public API for this, so we'll use their web interface
      // In production, you'd need to use Substack's actual API or web scraping
      // For now, we'll simulate authentication
      const response = await fetch('https://substack.com/api/v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: substackEmail,
          password: substackPassword,
        }),
      });

      if (!response.ok) {
        throw new Error('Substack authentication failed');
      }

      const data = await response.json();
      token = data.token || data.apiKey;
    }

    // Store token in secure cookie
    const nextResponse = NextResponse.json({
      success: true,
      authenticated: true,
      message: 'Successfully authenticated with Substack',
    });

    nextResponse.cookies.set('substack_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return nextResponse;
  } catch (error) {
    console.error('Substack auth error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to authenticate with Substack',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Check authentication status
 * GET /api/substack/auth
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('substack_token')?.value;

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    // Verify token by making API call
    try {
      const response = await fetch('https://substack.com/api/v1/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Token invalid');
      }

      const user = await response.json();

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          publicationId: user.publication_id,
        },
      });
    } catch (error) {
      // Token is invalid, clear cookie
      const response = NextResponse.json({
        authenticated: false,
        user: null,
        error: 'Token expired or invalid',
      });

      response.cookies.delete('substack_token');
      return response;
    }
  } catch (error) {
    console.error('Check Substack auth error:', error);
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

/**
 * Logout
 * DELETE /api/substack/auth
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  response.cookies.delete('substack_token');
  return response;
}

