// Autonomous Substack Agent API
// Handles periodic posting and comment monitoring

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// In-memory storage for agent state (in production, use database)
const agentState = new Map<string, {
  isRunning: boolean;
  lastPostTime: number;
  lastCommentCheck: number;
  activities: Array<{
    id: string;
    type: 'post' | 'comment_reply';
    message: string;
    timestamp: Date;
    success: boolean;
    error?: string;
  }>;
  postIntervalId?: NodeJS.Timeout;
  commentIntervalId?: NodeJS.Timeout;
}>();

// Default intervals (in milliseconds)
const POST_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours
const COMMENT_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

/**
 * Get agent status or control agent
 * GET /api/substack/agent?userId=<id>
 * POST /api/substack/agent?action=start|stop&userId=<id>
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId') || 'default';

    const state = agentState.get(userId) || {
      isRunning: false,
      lastPostTime: 0,
      lastCommentCheck: 0,
      activities: [],
    };

    return NextResponse.json({
      success: true,
      isRunning: state.isRunning,
      activities: state.activities.slice(-50),
      lastPostTime: state.lastPostTime,
      lastCommentCheck: state.lastCommentCheck,
    });
  } catch (error) {
    console.error('Get Substack agent status error:', error);
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
    const userId = searchParams.get('userId') || 'default';

    const token = request.cookies.get('substack_token')?.value;
    if (!token) {
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
        lastCommentCheck: 0,
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

      state.isRunning = true;

      // Start periodic posting
      const postInterval = setInterval(async () => {
        try {
          await performPeriodicPost(token, userId, state);
        } catch (error) {
          console.error('Periodic post error:', error);
          addActivity(state, 'post', 'Failed to post', false, error instanceof Error ? error.message : 'Unknown error');
        }
      }, POST_INTERVAL);

      // Start comment monitoring
      const commentInterval = setInterval(async () => {
        try {
          await checkComments(token, userId, state);
        } catch (error) {
          console.error('Comment check error:', error);
        }
      }, COMMENT_CHECK_INTERVAL);

      // Store both interval IDs to prevent resource leaks
      state.postIntervalId = postInterval as any;
      state.commentIntervalId = commentInterval as any;

      // Perform initial checks
      await Promise.all([
        performPeriodicPost(token, userId, state),
        checkComments(token, userId, state),
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

      state.isRunning = false;
      
      // Clear both intervals to prevent resource leaks
      if (state.postIntervalId) {
        clearInterval(state.postIntervalId);
        state.postIntervalId = undefined;
      }
      if (state.commentIntervalId) {
        clearInterval(state.commentIntervalId);
        state.commentIntervalId = undefined;
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
    console.error('Substack agent control error:', error);
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
 * Perform periodic post
 */
async function performPeriodicPost(token: string, userId: string, state: any) {
  const now = Date.now();

  if (now - state.lastPostTime < POST_INTERVAL) {
    return;
  }

  const postTemplates = [
    {
      title: 'Solana Development Tips',
      body: '🚀 Building on Solana? Here are some tips for efficient transaction building and program development. Check out Sealevel Studio for advanced tools! #Solana #DeFi',
    },
    {
      title: 'Arbitrage Opportunities on Solana',
      body: '⚡ Real-time arbitrage scanning across multiple DEXs. Learn how to identify and execute profitable opportunities on Solana. Powered by Sealevel Studio.',
    },
    {
      title: 'Solana Transaction Building Guide',
      body: '🔧 Comprehensive guide to building complex Solana transactions. From simple transfers to multi-step DeFi operations. #SolanaDev',
    },
  ];

  const randomTemplate = postTemplates[Math.floor(Math.random() * postTemplates.length)];

  try {
    const publicationId = process.env.SUBSTACK_PUBLICATION_ID;
    const response = await fetch(`https://substack.com/api/v1/publications/${publicationId}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: randomTemplate.title,
        body: randomTemplate.body,
        status: 'published',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create post');
    }

    state.lastPostTime = now;
    addActivity(state, 'post', `Posted: ${randomTemplate.title}`, true);
  } catch (error) {
    addActivity(state, 'post', 'Failed to post', false, error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
}

/**
 * Check for comments and reply
 */
async function checkComments(token: string, userId: string, state: any) {
  const now = Date.now();

  try {
    const publicationId = process.env.SUBSTACK_PUBLICATION_ID;
    // Fetch recent posts and check comments
    const response = await fetch(`https://substack.com/api/v1/publications/${publicationId}/posts?limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch posts');
    }

    const data = await response.json();
    // In production, check comments for each post and reply
    // Substack API may require different endpoints for comments

    state.lastCommentCheck = now;
    addActivity(state, 'comment_reply', 'Checked for comments', true);
  } catch (error) {
    console.error('Check comments error:', error);
    addActivity(state, 'comment_reply', 'Error checking comments', false, error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Add activity to log
 */
function addActivity(
  state: any,
  type: 'post' | 'comment_reply',
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

  if (state.activities.length > 100) {
    state.activities = state.activities.slice(-100);
  }
}
