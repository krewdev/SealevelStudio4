import { NextRequest, NextResponse } from 'next/server';
import { TwitterApi } from 'twitter-api-v2';

export const dynamic = 'force-dynamic';

interface TwitterPost {
  id: string;
  content: string;
  scheduledFor?: string;
  postedAt?: string;
  status: 'draft' | 'scheduled' | 'posted' | 'failed';
}

/**
 * Get all posts
 */
export async function GET(request: NextRequest) {
  try {
    // In production, fetch from database
    // For now, return empty array or mock data
    
    const posts: TwitterPost[] = [];
    
    return NextResponse.json({
      success: true,
      posts,
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch posts',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Create new post or schedule post
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, scheduledFor } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: 'Post content is required', success: false },
        { status: 400 }
      );
    }

    if (content.length > 280) {
      return NextResponse.json(
        { error: 'Post exceeds 280 characters', success: false },
        { status: 400 }
      );
    }

    // Get access token from cookies
    const accessToken = request.cookies.get('twitter_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated. Please log in to Twitter first.', success: false },
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
      const post: TwitterPost = {
        id: `post_${Date.now()}`,
        content,
        status: 'scheduled',
        scheduledFor: scheduledFor,
      };

      return NextResponse.json({
        success: true,
        post,
        message: 'Post scheduled successfully',
      });
    }

    // Post immediately to Twitter
    try {
      // Validate token format (basic check)
      if (!accessToken || accessToken.length < 10) {
        throw new Error('Invalid access token format');
      }

      // TwitterApi with OAuth 2.0 access token
      // When using OAuth 2.0, pass the access token directly
      const client = new TwitterApi(accessToken);
      
      const tweet = await client.v2.tweet(content);

      const post: TwitterPost = {
        id: tweet.data.id,
        content,
        status: 'posted',
        postedAt: new Date().toISOString(),
      };

      return NextResponse.json({
        success: true,
        post,
        message: 'Post published successfully',
        tweetId: tweet.data.id,
        url: `https://twitter.com/i/status/${tweet.data.id}`,
      });
    } catch (error) {
      console.error('Twitter API error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to post to Twitter';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Check for common Twitter API errors
        if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Twitter authentication expired. Please log in again.';
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'Twitter API access denied. Check your app permissions.';
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
          errorMessage = 'Twitter rate limit exceeded. Please wait before posting again.';
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
  } catch (error) {
    console.error('Create post error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create post',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * Delete post
 */
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const postId = searchParams.get('id');

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required', success: false },
        { status: 400 }
      );
    }

    // In production, delete from database and cancel if scheduled

    return NextResponse.json({
      success: true,
      message: 'Post deleted successfully',
    });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete post',
        success: false,
      },
      { status: 500 }
    );
  }
}

