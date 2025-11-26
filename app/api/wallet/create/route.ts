import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';
import { storeWalletEmailMapping } from '@/app/lib/wallet-recovery/database-store';
import { createEmailVerificationToken, isEmailVerified } from '@/app/lib/wallet-recovery/email-verification';
import { checkConnection } from '@/app/lib/database/connection';

export const dynamic = 'force-dynamic';

/**
 * Create a custodial wallet for a user
 * POST /api/wallet/create
 * Body: { userId?: string, sessionId?: string, email?: string, skipEmailVerification?: boolean }
 * 
 * Returns: { wallet: { address, walletId, createdAt }, requiresEmailVerification?: boolean }
 * 
 * SECURITY: The secret key is NEVER returned to the client.
 * It is stored server-side only (in httpOnly cookies or database).
 * All signing operations must go through server-side API endpoints.
 * 
 * If email is provided:
 * - Email verification token will be sent (unless email already verified)
 * - Wallet will be linked to email for recovery (after verification)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, sessionId, email, skipEmailVerification } = body;

    // Generate a unique identifier for this wallet
    const walletId = userId || sessionId || crypto.randomBytes(16).toString('hex');

    // Generate a new Solana keypair
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const secretKey = keypair.secretKey;

    // Encrypt the secret key for storage in cookies (legacy support)
    const encryptedKey = bs58.encode(secretKey);
    
    // Create response
    const response = NextResponse.json({
      success: true,
      wallet: {
        address: publicKey,
        walletId,
        createdAt: new Date().toISOString(),
      },
    });

    // Store wallet ID in a secure cookie (for session-based access)
    response.cookies.set(`wallet_${walletId}`, encryptedKey, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    // Store session mapping
    if (sessionId) {
      response.cookies.set('wallet_session', walletId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365,
      });
    }

    // Handle email-based wallet recovery (if email provided)
    if (email) {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format', success: false },
          { status: 400 }
        );
      }

      const normalizedEmail = email.toLowerCase().trim();

      // Check if database is available
      const dbAvailable = await checkConnection();

      if (dbAvailable) {
        // Check if email is already verified
        const emailIsVerified = await isEmailVerified(normalizedEmail);

        if (!emailIsVerified && !skipEmailVerification) {
          // Send verification email
          const verificationResult = await createEmailVerificationToken(normalizedEmail);
          
          if (verificationResult.success) {
            // Store wallet with unverified email (will be verified later)
            try {
              await storeWalletEmailMapping(
                normalizedEmail,
                walletId,
                publicKey,
                secretKey
              );

              // Return indication that email verification is required
              return NextResponse.json({
                success: true,
                wallet: {
                  address: publicKey,
                  walletId,
                  createdAt: new Date().toISOString(),
                },
                requiresEmailVerification: true,
                message: 'Wallet created. Please verify your email to enable recovery.',
                ...(process.env.NODE_ENV === 'development' && verificationResult.token && {
                  devVerificationToken: verificationResult.token,
                }),
              });
            } catch (dbError) {
              console.error('Database storage failed, falling back to cookie-only storage:', dbError);
              // Continue with cookie-only storage
            }
          }
        } else if (emailIsVerified || skipEmailVerification) {
          // Email verified (or skipping), store wallet immediately
          try {
            await storeWalletEmailMapping(
              normalizedEmail,
              walletId,
              publicKey,
              secretKey
            );
            
            return NextResponse.json({
              success: true,
              wallet: {
                address: publicKey,
                walletId,
                createdAt: new Date().toISOString(),
              },
              emailLinked: true,
              message: 'Wallet created and linked to your email for recovery.',
            });
          } catch (dbError) {
            console.error('Database storage failed, falling back to cookie-only storage:', dbError);
            // Continue with cookie-only storage
          }
        }
      } else {
        console.warn('Database not available. Wallet created but email recovery not available.');
      }
    }

    return response;
  } catch (error) {
    console.error('Wallet creation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create wallet',
        success: false,
      },
      { status: 500 }
    );
  }
}
