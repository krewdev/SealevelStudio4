// Telegram Webhook Handler
// Receives real-time updates from Telegram

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Telegram webhook endpoint
 * POST /api/telegram/webhook
 */
export async function POST(request: NextRequest) {
  try {
    const update = await request.json();

    // Handle different update types
    if (update.message) {
      const message = update.message;
      
      // Process message (reply, forward, etc.)
      // In production, this would trigger the agent's reply logic
      
      console.log('Received message:', {
        chatId: message.chat.id,
        text: message.text,
        from: message.from?.username,
      });
    }

    if (update.edited_message) {
      // Handle edited messages
    }

    if (update.channel_post) {
      // Handle channel posts
    }

    // Always return OK to acknowledge receipt
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    return NextResponse.json({ ok: true }); // Still return OK to prevent retries
  }
}

