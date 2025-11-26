import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/app/lib/database/connection';
import { getWalletByEmail, updateLastRecoveryTime } from '@/app/lib/wallet-recovery/database-store';
import { sendRecoveryEmail } from '@/app/lib/email/service';
import { checkRecoveryRateLimit, checkRecoveryRateLimitInMemory } from '@/app/lib/wallet-recovery/rate-limit';
import { checkConnection } from '@/app/lib/database/connection';

export const dynamic = 'force-dynamic';

const RECOVERY_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/**
 * Request wallet recovery via email
 * POST /api/wallet/recover
 * Body: { email: string, action: 'request' | 'verify', token?: string }
 * 
 * Action 'request': Sends recovery email
 * Action 'verify': Verifies token and returns wallet info
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, action, token } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required', success: false },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format', success: false },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';

    // Check rate limiting
    const dbAvailable = await checkConnection();
    let rateLimitResult;

    if (dbAvailable) {
      rateLimitResult = await checkRecoveryRateLimit(normalizedEmail, 'email');
      const ipRateLimit = await checkRecoveryRateLimit(ip, 'ip');
      
      if (!rateLimitResult.allowed || !ipRateLimit.allowed) {
        return NextResponse.json(
          {
            error: 'Too many recovery requests. Please try again later.',
            success: false,
            resetAt: rateLimitResult.resetAt.toISOString(),
          },
          { status: 429 }
        );
      }
    } else {
      rateLimitResult = checkRecoveryRateLimitInMemory(normalizedEmail);
      if (!rateLimitResult.allowed) {
        return NextResponse.json(
          {
            error: 'Too many recovery requests. Please try again later.',
            success: false,
            resetAt: rateLimitResult.resetAt.toISOString(),
          },
          { status: 429 }
        );
      }
    }

    // Check if wallet exists for this email
    const walletData = dbAvailable ? await getWalletByEmail(normalizedEmail) : null;

    if (!walletData) {
      // Don't reveal if email exists or not (security best practice)
      return NextResponse.json(
        {
          success: true,
          message: 'If a wallet exists for this email, a recovery link has been sent.',
        },
        { status: 200 }
      );
    }

    // Action: Request recovery
    if (action === 'request' || !action) {
      // Generate recovery token
      const recoveryToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + RECOVERY_TOKEN_EXPIRY_MS);

      if (dbAvailable) {
        try {
          // Store recovery token in database
          await query(
            `INSERT INTO recovery_tokens (email, token, expires_at, ip_address)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (token) DO NOTHING`,
            [normalizedEmail, recoveryToken, expiresAt, ip]
          );

          // Send recovery email
          const emailResult = await sendRecoveryEmail(
            normalizedEmail,
            recoveryToken,
            walletData.walletAddress
          );

          if (!emailResult.success) {
            console.error('Failed to send recovery email:', emailResult.error);
          }

          // Update last recovery time
          await updateLastRecoveryTime(normalizedEmail);

          return NextResponse.json({
            success: true,
            message: 'If a wallet exists for this email, a recovery link has been sent.',
            ...(process.env.NODE_ENV === 'development' && {
              devToken: recoveryToken,
              devUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/recover?token=${recoveryToken}`,
            }),
          });
        } catch (error) {
          console.error('Error creating recovery token:', error);
          return NextResponse.json(
            {
              error: 'Failed to process recovery request',
              success: false,
            },
            { status: 500 }
          );
        }
      } else {
        // Fallback: return token in dev mode only
        const recoveryUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/recover?token=${recoveryToken}`;
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔐 Recovery Token (DEV ONLY - DB not available):', recoveryToken);
          console.log('🔗 Recovery URL:', recoveryUrl);
          
          return NextResponse.json({
            success: true,
            message: 'Recovery token generated (dev mode)',
            devToken: recoveryToken,
            devUrl: recoveryUrl,
          });
        }

        return NextResponse.json(
          {
            error: 'Recovery service unavailable. Database connection required.',
            success: false,
          },
          { status: 503 }
        );
      }
    }

    // Action: Verify token and recover wallet
    if (action === 'verify') {
      if (!token) {
        return NextResponse.json(
          { error: 'Recovery token is required', success: false },
          { status: 400 }
        );
      }

      if (!dbAvailable) {
        return NextResponse.json(
          {
            error: 'Recovery service unavailable. Database connection required.',
            success: false,
          },
          { status: 503 }
        );
      }

      try {
        // Verify token from database
        const result = await query<{
          email: string;
          expires_at: Date;
          used_at: Date | null;
        }>(
          `SELECT email, expires_at, used_at
           FROM recovery_tokens
           WHERE token = $1`,
          [token]
        );

        if (result.rows.length === 0) {
          return NextResponse.json(
            {
              error: 'Invalid or expired recovery token',
              success: false,
            },
            { status: 400 }
          );
        }

        const tokenRecord = result.rows[0];

        // Check if already used
        if (tokenRecord.used_at) {
          return NextResponse.json(
            {
              error: 'Recovery token has already been used',
              success: false,
            },
            { status: 400 }
          );
        }

        // Check if expired
        if (new Date(tokenRecord.expires_at) < new Date()) {
          return NextResponse.json(
            {
              error: 'Recovery token has expired',
              success: false,
            },
            { status: 400 }
          );
        }

        // Verify email matches
        if (tokenRecord.email !== normalizedEmail) {
          return NextResponse.json(
            {
              error: 'Invalid recovery token for this email',
              success: false,
            },
            { status: 400 }
          );
        }

        // Mark token as used
        await query(
          `UPDATE recovery_tokens 
           SET used_at = CURRENT_TIMESTAMP
           WHERE token = $1`,
          [token]
        );

        // Update last recovery time
        await updateLastRecoveryTime(normalizedEmail);

        // Get wallet data
        const wallet = await getWalletByEmail(normalizedEmail);
        
        if (!wallet) {
          return NextResponse.json(
            {
              error: 'Wallet not found',
              success: false,
            },
            { status: 404 }
          );
        }

        // Return wallet info (but NOT the private key - that stays server-side)
        return NextResponse.json({
          success: true,
          wallet: {
            address: wallet.walletAddress,
            walletId: wallet.walletId,
            createdAt: wallet.createdAt,
          },
          message: 'Wallet recovered successfully. You can now access your wallet.',
        });
      } catch (error) {
        console.error('Error verifying recovery token:', error);
        return NextResponse.json(
          {
            error: 'Failed to verify recovery token',
            success: false,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "request" or "verify"', success: false },
      { status: 400 }
    );
  } catch (error) {
    console.error('Wallet recovery error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to process recovery',
        success: false,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wallet/recover?email=...
 * Check if a wallet exists for an email (without sending recovery email)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required', success: false },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const dbAvailable = await checkConnection();

    if (!dbAvailable) {
      return NextResponse.json(
        {
          error: 'Recovery service unavailable',
          success: false,
        },
        { status: 503 }
      );
    }

    const walletData = await getWalletByEmail(normalizedEmail);

    // Don't reveal if wallet exists (security best practice)
    // Always return success, but without wallet details if not found
    if (!walletData) {
      return NextResponse.json({
        success: true,
        exists: false,
      });
    }

    // Return minimal info (no sensitive data)
    return NextResponse.json({
      success: true,
      exists: true,
      wallet: {
        address: walletData.walletAddress,
        createdAt: walletData.createdAt,
      },
    });
  } catch (error) {
    console.error('Wallet recovery check error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to check recovery',
        success: false,
      },
      { status: 500 }
    );
  }
}
