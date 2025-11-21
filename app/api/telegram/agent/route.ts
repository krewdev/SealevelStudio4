// Autonomous Telegram Agent API
// Handles periodic messaging, mention monitoring, and auto-replies

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory storage for agent state (in production, use database)
const agentState = new Map<string, {
  isRunning: boolean;
  lastMessageTime: number;
  lastUpdateCheck: number;
  chatIds: string[]; // Channels/groups to post to
  activities: Array<{
    id: string;
    type: 'message' | 'reply' | 'mention_reply';
    message: string;
    timestamp: Date;
    success: boolean;
    error?: string;
    chatId?: string;
  }>;
  intervalId?: NodeJS.Timeout;
  webhookId?: string;
}>();

// Default intervals (in milliseconds)
const MESSAGE_INTERVAL = 2 * 60 * 60 * 1000; // 2 hours
const UPDATE_CHECK_INTERVAL = 1 * 60 * 1000; // 1 minute

/**
 * Get agent status or control agent
 * GET /api/telegram/agent?botId=<id>
 * POST /api/telegram/agent?action=start|stop&botId=<id>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const botId = searchParams.get('botId') || 'default';

    const state = agentState.get(botId) || {
      isRunning: false,
      lastMessageTime: 0,
      lastUpdateCheck: 0,
      chatIds: [],
      activities: [],
    };

    return NextResponse.json({
      success: true,
      isRunning: state.isRunning,
      activities: state.activities.slice(-50),
      lastMessageTime: state.lastMessageTime,
      lastUpdateCheck: state.lastUpdateCheck,
      chatIds: state.chatIds,
    });
  } catch (error) {
    console.error('Get Telegram agent status error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to get agent status',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Start or stop the agent
 */
export async function POST(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    const botId = searchParams.get('botId') || 'default';
    const body = await request.json().catch(() => ({}));
    const { chatIds } = body;

    const token = request.cookies.get('telegram_bot_token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', success: false },
        { status: 401 }
      );
    }

    let state = agentState.get(botId);
    if (!state) {
      state = {
        isRunning: false,
        lastMessageTime: 0,
        lastUpdateCheck: 0,
        chatIds: chatIds || [],
        activities: [],
      };
      agentState.set(botId, state);
    }

    if (chatIds && Array.isArray(chatIds)) {
      state.chatIds = chatIds;
    }

    if (action === 'start') {
      if (state.isRunning) {
        return NextResponse.json({
          success: true,
          message: 'Agent is already running',
          isRunning: true,
        });
      }

      if (state.chatIds.length === 0) {
        return NextResponse.json(
          { error: 'At least one chat ID is required. Provide chatIds in request body.', success: false },
          { status: 400 }
        );
      }

      state.isRunning = true;

      // Start periodic messaging
      const messageInterval = setInterval(async () => {
        try {
          await performPeriodicMessage(token, botId, state);
        } catch (error) {
          console.error('Periodic message error:', error);
          addActivity(state, 'message', 'Failed to send message', false, error instanceof Error ? error.message : 'Unknown error');
        }
      }, MESSAGE_INTERVAL);

      // Start update monitoring (for mentions, replies, etc.)
      const updateInterval = setInterval(async () => {
        try {
          await checkUpdates(token, botId, state);
        } catch (error) {
          console.error('Update check error:', error);
        }
      }, UPDATE_CHECK_INTERVAL);

      state.intervalId = messageInterval as any;

      // Set up webhook or long polling for real-time updates
      await setupWebhook(token, botId, state);

      // Perform initial checks
      await Promise.all([
        performPeriodicMessage(token, botId, state),
        checkUpdates(token, botId, state),
      ]);

      addActivity(state, 'message', 'Agent started successfully', true);

      return NextResponse.json({
        success: true,
        message: 'Agent started successfully',
        isRunning: true,
      });
    } else if (action === 'stop') {
      if (!state.isRunning) {
        return NextResponse.json({
          success: true,
          message: 'Agent is not running',
          isRunning: false,
        });
      }

      state.isRunning = false;
      if (state.intervalId) {
        clearInterval(state.intervalId);
      }

      // Remove webhook
      if (state.webhookId) {
        await removeWebhook(token);
      }

      addActivity(state, 'message', 'Agent stopped', true);

      return NextResponse.json({
        success: true,
        message: 'Agent stopped successfully',
        isRunning: false,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "stop"', success: false },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Telegram agent control error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to control agent',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Perform periodic message
 */
async function performPeriodicMessage(token: string, botId: string, state: any) {
  const now = Date.now();

  if (now - state.lastMessageTime < MESSAGE_INTERVAL) {
    return;
  }

  const messageTemplates = [
    '🚀 Building on Solana? Check out Sealevel Studio for advanced transaction building and arbitrage tools! #Solana #DeFi #Web3',
    '💡 New to Solana development? Sealevel Studio makes it easy to build, test, and deploy Solana programs. #SolanaDev #Blockchain',
    '⚡ Real-time arbitrage opportunities on Solana DEXs. Powered by Sealevel Studio. #Arbitrage #Solana #Trading',
    '🔧 Need help with Solana transactions? Sealevel Studio provides comprehensive tools for developers. #Solana #DeveloperTools',
    '🌊 Dive into Solana development with Sealevel Studio - your all-in-one platform for on-chain operations. #Solana #Web3',
  ];

  const randomTemplate = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];

  // Send to all configured chats
  for (const chatId of state.chatIds) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: randomTemplate,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.description || 'Failed to send message');
      }

      state.lastMessageTime = now;
      addActivity(state, 'message', `Posted to ${chatId}: ${randomTemplate.substring(0, 50)}...`, true, undefined, chatId);
    } catch (error) {
      addActivity(state, 'message', `Failed to send to ${chatId}`, false, error instanceof Error ? error.message : 'Unknown error', chatId);
    }
  }
}

/**
 * Check for updates (mentions, replies, etc.)
 */
async function checkUpdates(token: string, botId: string, state: any) {
  const now = Date.now();

  try {
    // Get updates (mentions, replies, etc.)
    const offset = state.lastUpdateCheck > 0 ? Math.floor(state.lastUpdateCheck / 1000) : 0;
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=10`);

    if (!response.ok) {
      throw new Error('Failed to get updates');
    }

    const data = await response.json();

    if (data.ok && data.result) {
      for (const update of data.result) {
        // Handle mentions in groups/channels
        if (update.message) {
          const message = update.message;
          
          // Check if bot is mentioned
          if (message.text && message.text.includes('@')) {
            const botUsername = state.botUsername || 'your_bot_username';
            if (message.text.includes(`@${botUsername}`)) {
              // Reply to mention
              const replyText = generateReply(message.text);
              
              try {
                await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    chat_id: message.chat.id,
                    text: replyText,
                    reply_to_message_id: message.message_id,
                    parse_mode: 'HTML',
                  }),
                });
                
                addActivity(state, 'mention_reply', `Replied to mention in ${message.chat.id}`, true);
              } catch (error) {
                addActivity(state, 'mention_reply', 'Failed to reply to mention', false, error instanceof Error ? error.message : 'Unknown error');
              }
            }
          }

          // Handle direct messages (private chats)
          if (message.chat.type === 'private') {
            const replyText = generateReply(message.text || '');
            
            try {
              await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  chat_id: message.chat.id,
                  text: replyText,
                  parse_mode: 'HTML',
                }),
              });
              
              addActivity(state, 'reply', `Replied to DM from ${message.from?.username || message.chat.id}`, true);
            } catch (error) {
              addActivity(state, 'reply', 'Failed to reply to DM', false, error instanceof Error ? error.message : 'Unknown error');
            }
          }
        }
      }
    }

    state.lastUpdateCheck = now;
  } catch (error) {
    console.error('Check updates error:', error);
    addActivity(state, 'reply', 'Error checking updates', false, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Set up webhook for real-time updates
 */
async function setupWebhook(token: string, botId: string, state: any) {
  try {
    // In production, set up webhook URL
    // For now, we'll use long polling (getUpdates)
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || 
                      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/telegram/webhook`;
    
    // Uncomment to use webhook instead of polling:
    // const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ url: webhookUrl }),
    // });
    
    // For now, we use getUpdates (long polling) which is simpler
  } catch (error) {
    console.error('Setup webhook error:', error);
  }
}

/**
 * Remove webhook
 */
async function removeWebhook(token: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
  } catch (error) {
    console.error('Remove webhook error:', error);
  }
}

/**
 * Generate reply text
 */
function generateReply(originalText: string): string {
  const lowerText = originalText.toLowerCase();
  
  if (lowerText.includes('hello') || lowerText.includes('hi') || lowerText.includes('hey')) {
    return 'Hello! Thanks for reaching out. How can I help you with Sealevel Studio? 🚀';
  }
  
  if (lowerText.includes('help') || lowerText.includes('support')) {
    return 'I\'m here to help! Check out https://sealevel.studio for documentation and guides. What specific question do you have?';
  }
  
  if (lowerText.includes('arbitrage') || lowerText.includes('trading')) {
    return 'Sealevel Studio offers real-time arbitrage scanning across multiple Solana DEXs. Try it out at https://sealevel.studio! ⚡';
  }
  
  if (lowerText.includes('solana') || lowerText.includes('dev')) {
    return 'Sealevel Studio is the all-in-one platform for Solana development. Build, test, and deploy with ease! 🌊';
  }
  
  // Default reply
  return 'Thanks for the message! Check out Sealevel Studio for advanced Solana development tools: https://sealevel.studio 🚀';
}

/**
 * Add activity to log
 */
function addActivity(
  state: any,
  type: 'message' | 'reply' | 'mention_reply',
  message: string,
  success: boolean,
  error?: string,
  chatId?: string
) {
  const activity = {
    id: `activity_${Date.now()}_${Math.random()}`,
    type,
    message,
    timestamp: new Date(),
    success,
    error,
    chatId,
  };

  state.activities.push(activity);

  if (state.activities.length > 100) {
    state.activities = state.activities.slice(-100);
  }
}

