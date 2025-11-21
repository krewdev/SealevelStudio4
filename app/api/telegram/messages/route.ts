// Telegram Messages API
// Send messages to channels, groups, or users

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface TelegramMessage {
  id: string;
  chatId: string;
  chatType: 'channel' | 'group' | 'private';
  content: string;
  sentAt?: string;
  status: 'sent' | 'failed' | 'scheduled';
  scheduledFor?: string;
}

/**
 * Get message history
 * GET /api/telegram/messages
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('telegram_bot_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', success: false },
        { status: 401 }
      );
    }

    // In production, fetch from database
    // Telegram API doesn't provide a direct way to get all sent messages
    // You'd need to store them when sending
    
    return NextResponse.json({
      success: true,
      messages: [],
    });
  } catch (error) {
    console.error('Get Telegram messages error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch messages',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Send message
 * POST /api/telegram/messages
 * Body: { chatId, content, scheduledFor? }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chatId, content, scheduledFor } = body;

    if (!chatId || !content) {
      return NextResponse.json(
        { error: 'chatId and content are required', success: false },
        { status: 400 }
      );
    }

    const token = request.cookies.get('telegram_bot_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', success: false },
        { status: 401 }
      );
    }

    // If scheduled, store for later processing
    if (scheduledFor) {
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return NextResponse.json(
          { error: 'Scheduled time must be in the future', success: false },
          { status: 400 }
        );
      }

      // In production, store in database with scheduler
      const message: TelegramMessage = {
        id: `msg_${Date.now()}`,
        chatId,
        chatType: chatId.startsWith('@') ? 'channel' : 'group',
        content,
        status: 'scheduled',
        scheduledFor: scheduledFor,
      };

      return NextResponse.json({
        success: true,
        message: 'Message scheduled successfully',
      });
    }

    // Send immediately to Telegram
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: content,
          parse_mode: 'HTML', // Support HTML formatting
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.description || 'Failed to send message to Telegram');
      }

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.description || 'Failed to send message');
      }

      const message: TelegramMessage = {
        id: result.result.message_id.toString(),
        chatId,
        chatType: chatId.startsWith('@') ? 'channel' : 'group',
        content,
        status: 'sent',
        sentAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        message,
        messageId: result.result.message_id,
        chat: result.result.chat,
      });
    } catch (error) {
      console.error('Telegram API error:', error);
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Failed to send message to Telegram',
          success: false,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Send Telegram message error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send message',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Delete message
 * DELETE /api/telegram/messages?id=<messageId>&chatId=<chatId>
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const messageId = searchParams.get('id');
    const chatId = searchParams.get('chatId');

    if (!messageId || !chatId) {
      return NextResponse.json(
        { error: 'Message ID and Chat ID are required', success: false },
        { status: 400 }
      );
    }

    const token = request.cookies.get('telegram_bot_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', success: false },
        { status: 401 }
      );
    }

    // Delete message from Telegram
    const response = await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: parseInt(messageId, 10),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.description || 'Failed to delete message');
    }

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('Delete Telegram message error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete message',
        success: false,
      },
      { status: 500 }
    );
  }
}

