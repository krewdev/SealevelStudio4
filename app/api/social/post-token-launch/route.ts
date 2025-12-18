import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Social Media Token Launch Announcer
 * Posts token launch announcements with images to Twitter and Telegram
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tokenSymbol,
      tokenName,
      tokenMintAddress,
      transactionSignature,
      imageUrl,
      totalSupply,
      liquidityAmount,
      platforms = ['twitter', 'telegram'],
      customMessage,
    } = body;

    if (!tokenSymbol || !tokenName) {
      return NextResponse.json(
        { error: 'Token symbol and name are required' },
        { status: 400 }
      );
    }

    const results: any = {};

    // Generate announcement message
    const defaultMessage = generateLaunchMessage({
      tokenName,
      tokenSymbol,
      tokenMintAddress,
      transactionSignature,
      totalSupply,
      liquidityAmount,
    });

    const message = customMessage || defaultMessage;

    // Post to Twitter
    if (platforms.includes('twitter')) {
      try {
        const twitterResult = await postToTwitter({
          message,
          imageUrl,
          tokenSymbol,
        });
        results.twitter = twitterResult;
      } catch (error) {
        console.error('Twitter post failed:', error);
        results.twitter = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Post to Telegram
    if (platforms.includes('telegram')) {
      try {
        const telegramResult = await postToTelegram({
          message,
          imageUrl,
          tokenSymbol,
        });
        results.telegram = telegramResult;
      } catch (error) {
        console.error('Telegram post failed:', error);
        results.telegram = {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    const allSuccessful = Object.values(results).every(
      (result: any) => result.success
    );

    return NextResponse.json({
      success: allSuccessful,
      message: allSuccessful
        ? 'Launch announcement posted successfully'
        : 'Some posts failed',
      results,
    });
  } catch (error) {
    console.error('Social media post error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to post',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Generate professional launch announcement message
 */
function generateLaunchMessage(params: {
  tokenName: string;
  tokenSymbol: string;
  tokenMintAddress?: string;
  transactionSignature?: string;
  totalSupply?: number;
  liquidityAmount?: number;
}): string {
  const { tokenName, tokenSymbol, tokenMintAddress, transactionSignature, totalSupply, liquidityAmount } = params;

  let message = `🚀 ${tokenName} ($${tokenSymbol}) is now LIVE on Solana!\n\n`;

  if (totalSupply) {
    message += `📊 Total Supply: ${totalSupply.toLocaleString()}\n`;
  }

  if (liquidityAmount) {
    message += `💧 Initial Liquidity: ${liquidityAmount} SOL\n`;
  }

  message += `✅ Rugless Launch Protection Enabled\n`;
  message += `🔒 Liquidity Locked for 7 Days\n\n`;

  if (tokenMintAddress) {
    message += `📍 Mint: ${tokenMintAddress}\n`;
  }

  if (transactionSignature) {
    const solscanUrl = `https://solscan.io/tx/${transactionSignature}`;
    message += `🔗 Transaction: ${solscanUrl}\n\n`;
  }

  message += `Built with Sealevel Studio 🌊\n`;
  message += `#Solana #DeFi #${tokenSymbol} #TokenLaunch`;

  return message;
}

/**
 * Post to Twitter with image
 */
async function postToTwitter(params: {
  message: string;
  imageUrl?: string;
  tokenSymbol: string;
}): Promise<any> {
  const { message, imageUrl, tokenSymbol } = params;

  // Twitter API configuration
  const twitterApiKey = process.env.TWITTER_API_KEY;
  const twitterApiSecret = process.env.TWITTER_API_SECRET;
  const twitterAccessToken = process.env.TWITTER_ACCESS_TOKEN;
  const twitterAccessSecret = process.env.TWITTER_ACCESS_TOKEN_SECRET;

  if (!twitterApiKey || !twitterAccessToken) {
    console.warn('Twitter API credentials not configured');
    return {
      success: false,
      error: 'Twitter API not configured',
    };
  }

  // Call existing Twitter API endpoint
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/twitter/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: message,
      imageUrl,
      hashtags: ['Solana', 'DeFi', tokenSymbol],
    }),
  });

  if (!response.ok) {
    throw new Error(`Twitter API error: ${response.status}`);
  }

  const result = await response.json();
  return {
    success: true,
    tweetId: result.tweetId,
    url: result.url,
  };
}

/**
 * Post to Telegram with image
 */
async function postToTelegram(params: {
  message: string;
  imageUrl?: string;
  tokenSymbol: string;
}): Promise<any> {
  const { message, imageUrl } = params;

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChannelId = process.env.TELEGRAM_CHANNEL_ID;

  if (!telegramBotToken || !telegramChannelId) {
    console.warn('Telegram bot credentials not configured');
    return {
      success: false,
      error: 'Telegram bot not configured',
    };
  }

  // Call existing Telegram API endpoint
  const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/telegram/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: message,
      imageUrl,
      chatId: telegramChannelId,
    }),
  });

  if (!response.ok) {
    throw new Error(`Telegram API error: ${response.status}`);
  }

  const result = await response.json();
  return {
    success: true,
    messageId: result.messageId,
  };
}
