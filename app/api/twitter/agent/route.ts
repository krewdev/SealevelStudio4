// Autonomous Twitter Agent API
// Handles periodic posting, mention monitoring, and DM replies

import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

// In-memory storage for agent state (in production, use database)
const agentState = new Map<string, {
  isRunning: boolean;
  lastPostTime: number;
  lastMentionCheck: number;
  lastDMCheck: number;
  activities: Array<{
    id: string;
    type: 'post' | 'reply' | 'mention_reply' | 'dm_reply';
    message: string;
    timestamp: Date;
    success: boolean;
    error?: string;
  }>;
  intervalId?: NodeJS.Timeout;
}>();

// Default intervals (in milliseconds)
const POST_INTERVAL = 60 * 60 * 1000; // 1 hour
const MENTION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const DM_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Get agent status or control agent
 * GET /api/twitter/agent?userId=<username>
 * POST /api/twitter/agent?action=start|stop&userId=<username>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default';

    const state = agentState.get(userId) || {
      isRunning: false,
      lastPostTime: 0,
      lastMentionCheck: 0,
      lastDMCheck: 0,
      activities: [],
    };

    return NextResponse.json({
      success: true,
      isRunning: state.isRunning,
      activities: state.activities.slice(-50), // Last 50 activities
      lastPostTime: state.lastPostTime,
      lastMentionCheck: state.lastMentionCheck,
      lastDMCheck: state.lastDMCheck,
    });
  } catch (error) {
    console.error('Get agent status error:', error);
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
    const action = searchParams.get('action'); // 'start' or 'stop'
    const userId = searchParams.get('userId') || 'default';

    const accessToken = request.cookies.get('twitter_access_token')?.value;
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated', success: false },
        { status: 401 }
      );
    }

    let state = agentState.get(userId);
    if (!state) {
      state = {
        isRunning: false,
        lastPostTime: 0,
        lastMentionCheck: 0,
        lastDMCheck: 0,
        activities: [],
      };
      agentState.set(userId, state);
    }

    if (action === 'start') {
      if (state.isRunning) {
        return NextResponse.json({
          success: true,
          message: 'Agent is already running',
          isRunning: true,
        });
      }

      // Start agent
      state.isRunning = true;
      
      // Create Twitter client
      // Validate token before creating client
      if (!accessToken || accessToken.length < 10) {
        throw new Error('Invalid access token');
      }
      
      const client = new TwitterApi(accessToken);
      
      // Start periodic posting
      const postInterval = setInterval(async () => {
        try {
          await performPeriodicPost(client, userId, state);
        } catch (error) {
          console.error('Periodic post error:', error);
          addActivity(state, 'post', 'Failed to post', false, error instanceof Error ? error.message : 'Unknown error');
        }
      }, POST_INTERVAL);

      // Start mention monitoring
      const mentionInterval = setInterval(async () => {
        try {
          await checkMentions(client, userId, state);
        } catch (error) {
          console.error('Mention check error:', error);
        }
      }, MENTION_CHECK_INTERVAL);

      // Start DM monitoring
      const dmInterval = setInterval(async () => {
        try {
          await checkDMs(client, userId, state);
        } catch (error) {
          console.error('DM check error:', error);
        }
      }, DM_CHECK_INTERVAL);

      state.intervalId = postInterval as any; // Store for cleanup
      
      // Perform initial checks
      await Promise.all([
        performPeriodicPost(client, userId, state),
        checkMentions(client, userId, state),
        checkDMs(client, userId, state),
      ]);

      addActivity(state, 'post', 'Agent started successfully', true);
      
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

      // Stop agent
      state.isRunning = false;
      
      // Clear intervals (in production, store interval IDs properly)
      if (state.intervalId) {
        clearInterval(state.intervalId);
      }

      addActivity(state, 'post', 'Agent stopped', true);
      
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
    console.error('Agent control error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to control agent';
    if (error instanceof Error) {
      errorMessage = error.message;
      // Check for common Twitter API errors
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Twitter authentication expired. Please log in again.';
      } else if (error.message.includes('Invalid access token')) {
        errorMessage = 'Invalid Twitter access token. Please log in again.';
      }
    }
    
    return NextResponse.json(
      {
        error: errorMessage,
        success: false,
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : String(error)) : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * Perform periodic post
 */
async function performPeriodicPost(client: TwitterApi, userId: string, state: any) {
  const now = Date.now();
  
  // Check if enough time has passed since last post
  if (now - state.lastPostTime < POST_INTERVAL) {
    return;
  }

  // Generate post content (in production, use AI or predefined templates)
  const postTemplates = [
    '🚀 Building on Solana? Check out Sealevel Studio for advanced transaction building and arbitrage tools! #Solana #DeFi #Web3',
    '💡 New to Solana development? Sealevel Studio makes it easy to build, test, and deploy Solana programs. #SolanaDev #Blockchain',
    '⚡ Real-time arbitrage opportunities on Solana DEXs. Powered by Sealevel Studio. #Arbitrage #Solana #Trading',
    '🔧 Need help with Solana transactions? Sealevel Studio provides comprehensive tools for developers. #Solana #DeveloperTools',
    '🌊 Dive into Solana development with Sealevel Studio - your all-in-one platform for on-chain operations. #Solana #Web3',
  ];

  const randomTemplate = postTemplates[Math.floor(Math.random() * postTemplates.length)];
  
  try {
    const tweet = await client.v2.tweet(randomTemplate);
    state.lastPostTime = now;
    addActivity(state, 'post', `Posted: ${randomTemplate.substring(0, 50)}...`, true);
    return tweet;
  } catch (error) {
    addActivity(state, 'post', 'Failed to post', false, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Check for mentions and reply
 */
async function checkMentions(client: TwitterApi, userId: string, state: any) {
  const now = Date.now();
  
  try {
    // Get current user info to get username
    const me = await client.v2.me({
      'user.fields': ['username'],
    });
    const username = me.data.username;

    // Get recent mentions using search API
    // Search for tweets mentioning the user
    const mentions = await client.v2.search({
      query: `@${username} -is:retweet`,
      max_results: 10,
      'tweet.fields': ['created_at', 'author_id', 'in_reply_to_user_id', 'text'],
    });

    if (mentions.data?.data && mentions.data.data.length > 0) {
      for (const mention of mentions.data.data) {
        // Skip if we already replied (in production, track replied mentions)
        // For now, reply to all new mentions
        
        const replyText = generateReply(mention.text || '');
        
        try {
          // Reply to tweet using correct Twitter API v2 format
          await client.v2.tweet({
            text: replyText,
            reply: {
              in_reply_to_tweet_id: mention.id,
            },
          });
          
          addActivity(state, 'mention_reply', `Replied to mention from @${mention.author_id}`, true);
        } catch (error) {
          addActivity(state, 'mention_reply', `Failed to reply to mention`, false, error instanceof Error ? error.message : 'Unknown error');
        }
      }
    }

    state.lastMentionCheck = now;
  } catch (error) {
    console.error('Check mentions error:', error);
    // Don't fail completely - just log the error
    addActivity(state, 'mention_reply', 'Error checking mentions', false, error instanceof Error ? error.message : 'Unknown error');
    state.lastMentionCheck = now; // Still update timestamp to avoid spamming
  }
}

/**
 * Check for DMs and reply
 */
async function checkDMs(client: TwitterApi, userId: string, state: any) {
  const now = Date.now();
  
  try {
    // Note: Twitter API v2 doesn't support DMs directly
    // You need Twitter API v1.1 or Enterprise API for DMs
    // For now, we'll log that DM checking requires different API
    
    // In production, use Twitter API v1.1 for DMs:
    // const dms = await client.v1.listDmEvents({ count: 10 });
    
    state.lastDMCheck = now;
    addActivity(state, 'dm_reply', 'DM checking requires Twitter API v1.1 (not implemented in v2)', true);
  } catch (error) {
    console.error('Check DMs error:', error);
    addActivity(state, 'dm_reply', 'Error checking DMs', false, error instanceof Error ? error.message : 'Unknown error');
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
  return 'Thanks for the mention! Check out Sealevel Studio for advanced Solana development tools: https://sealevel.studio 🚀';
}

/**
 * Add activity to log
 */
function addActivity(
  state: any,
  type: 'post' | 'reply' | 'mention_reply' | 'dm_reply',
  message: string,
  success: boolean,
  error?: string
) {
  const activity = {
    id: `activity_${Date.now()}_${Math.random()}`,
    type,
    message,
    timestamp: new Date(),
    success,
    error,
  };
  
  state.activities.push(activity);
  
  // Keep only last 100 activities
  if (state.activities.length > 100) {
    state.activities = state.activities.slice(-100);
  }
}
