/**
 * Email Verification Endpoint
 * POST /api/wallet/verify-email
 * Body: { token: string }
 * 
 * Verifies email verification token and marks email as verified
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailToken } from '@/app/lib/wallet-recovery/email-verification';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required', success: false },
        { status: 400 }
      );
    }

    const result = await verifyEmailToken(token);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to verify email',
          success: false,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully',
      email: result.email,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to verify email',
        success: false,
      },
      { status: 500 }
    );
  }
}

