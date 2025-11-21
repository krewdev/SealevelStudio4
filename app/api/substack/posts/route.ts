// Substack Posts API
// Create and manage Substack posts

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SubstackPost {
  id: string;
  title: string;
  body: string;
  status: 'draft' | 'published' | 'scheduled';
  publishedAt?: string;
  scheduledFor?: string;
}

/**
 * Get all posts
 * GET /api/substack/posts
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('substack_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', success: false },
        { status: 401 }
      );
    }

    // Fetch posts from Substack API
    const publicationId = process.env.SUBSTACK_PUBLICATION_ID;
    const response = await fetch(`https://substack.com/api/v1/publications/${publicationId}/posts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch posts from Substack');
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      posts: data.posts || [],
    });
  } catch (error) {
    console.error('Get Substack posts error:', error);
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
 * Create new post
 * POST /api/substack/posts
 * Body: { title, body, status, scheduledFor? }
 */
export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { title, body, status = 'draft', scheduledFor } = requestBody;

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Title and body are required', success: false },
        { status: 400 }
      );
    }

    const token = request.cookies.get('substack_token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated', success: false },
        { status: 401 }
      );
    }

    const publicationId = process.env.SUBSTACK_PUBLICATION_ID;

    // Create post on Substack
    const response = await fetch(`https://substack.com/api/v1/publications/${publicationId}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title,
        body,
        status,
        scheduled_for: scheduledFor,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to create post on Substack');
    }

    const post = await response.json();

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        title: post.title,
        body: post.body,
        status: post.status,
        publishedAt: post.published_at,
        scheduledFor: post.scheduled_for,
      },
      message: status === 'published' ? 'Post published successfully' : 'Post created successfully',
    });
  } catch (error) {
    console.error('Create Substack post error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create post',
        success: false,
      },
      { status: 500 }
    );
  }
}

