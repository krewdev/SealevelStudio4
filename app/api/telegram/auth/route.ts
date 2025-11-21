// Telegram Bot Authentication API
// Telegram uses Bot API tokens (not OAuth)

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Authenticate with Telegram Bot API
 * POST /api/telegram/auth
 * Body: { botToken }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botToken } = body;

    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json(
        { error: 'Telegram bot token is required', success: false },
        { status: 400 }
      );
    }

    // Verify token by getting bot info from Telegram API
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.description || 'Invalid bot token', success: false },
        { status: 401 }
      );
    }

    const botInfo = await response.json();

    if (!botInfo.ok) {
      return NextResponse.json(
        { error: 'Failed to verify bot token', success: false },
        { status: 401 }
      );
    }

    // Store token in secure cookie
    const nextResponse = NextResponse.json({
      success: true,
      authenticated: true,
      bot: {
        id: botInfo.result.id,
        username: botInfo.result.username,
        firstName: botInfo.result.first_name,
        isBot: botInfo.result.is_bot,
      },
      message: 'Successfully authenticated with Telegram',
    });

    nextResponse.cookies.set('telegram_bot_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return nextResponse;
  } catch (error) {
    console.error('Telegram auth error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to authenticate with Telegram',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Check authentication status
 * GET /api/telegram/auth
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('telegram_bot_token')?.value;

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        bot: null,
      });
    }

    // Verify token by making API call
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);

      if (!response.ok) {
        throw new Error('Token invalid');
      }

      const botInfo = await response.json();

      if (!botInfo.ok) {
        throw new Error('Token invalid');
      }

      return NextResponse.json({
        authenticated: true,
        bot: {
          id: botInfo.result.id,
          username: botInfo.result.username,
          firstName: botInfo.result.first_name,
          isBot: botInfo.result.is_bot,
        },
      });
    } catch (error) {
      // Token is invalid, clear cookie
      const response = NextResponse.json({
        authenticated: false,
        bot: null,
        error: 'Token expired or invalid',
      });

      response.cookies.delete('telegram_bot_token');
      return response;
    }
  } catch (error) {
    console.error('Check Telegram auth error:', error);
    return NextResponse.json(
      {
        authenticated: false,
        bot: null,
        error: error instanceof Error ? error.message : 'Failed to check auth status',
      },
      { status: 500 }
    );
  }
}

/**
 * Logout
 * DELETE /api/telegram/auth
 */
export async function DELETE(request: NextRequest) {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully',
  });

  response.cookies.delete('telegram_bot_token');
  return response;
}

