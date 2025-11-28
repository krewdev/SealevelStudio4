import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@solana/web3.js';
import crypto from 'crypto';
import { storeWalletEmailMapping } from '@/app/lib/wallet-recovery/database-store';
import { createEmailVerificationToken, isEmailVerified } from '@/app/lib/wallet-recovery/email-verification';
import { checkConnection } from '@/app/lib/database/connection';
import { encryptWalletKey } from '@/app/lib/wallet-recovery/encryption';

export const dynamic = 'force-dynamic';

/**
 * Create a custodial wallet for a user
 * POST /api/wallet/create
 * Body: { userId?: string, sessionId?: string, email?: string, skipEmailVerification?: boolean }
 * 
 * Returns: { wallet: { address, walletId, createdAt }, requiresEmailVerification?: boolean }
 * 
 * ⚠️ DEVELOPMENT/MOCK IMPLEMENTATION:
 * - Creates real Solana keypairs and wallet addresses
 * - Stores encrypted keys in cookies (or database if DATABASE_URL is configured)
 * - Wallet can receive funds and check balance
 * - ✅ Supports transaction signing via /api/wallet/sign endpoint
 * - Note: For production, consider using a proper key management service
 * 
 * SECURITY: The secret key is NEVER returned to the client.
 * It is stored server-side only (in httpOnly cookies or database).
 * All signing operations must go through server-side API endpoints (/api/wallet/sign).
 * 
 * If email is provided:
 * - Email verification token will be sent (unless email already verified)
 * - Wallet will be linked to email for recovery (after verification)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, sessionId, email, skipEmailVerification, vanityPrefix } = body;

    // Generate a unique identifier for this wallet
    const walletId = userId || sessionId || crypto.randomBytes(16).toString('hex');

    // Generate a new Solana keypair
    // If vanityPrefix is provided, generate addresses until we find one that matches
    let keypair: Keypair | undefined;
    let publicKey: string | undefined;
    let secretKey: Uint8Array | undefined;
    let attempts = 0;
    const maxAttempts = vanityPrefix ? 100000 : 1; // Only try once if no vanity prefix

    if (vanityPrefix && typeof vanityPrefix === 'string' && vanityPrefix.trim().length > 0) {
      // Validate prefix format (Base58 characters only)
      const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
      const normalizedPrefix = vanityPrefix.toUpperCase().trim();

      if (!base58Regex.test(normalizedPrefix)) {
        return NextResponse.json(
          { error: 'Vanity prefix contains invalid characters. Use only Base58 characters (no 0, O, I, l).', success: false },
          { status: 400 }
        );
      }

      if (normalizedPrefix.length > 8) {
        return NextResponse.json(
          { error: 'Vanity prefix must be 8 characters or less', success: false },
          { status: 400 }
        );
      }

      // Generate keypairs until we find one that starts with the prefix
      while (attempts < maxAttempts) {
        attempts++;
        keypair = Keypair.generate();
        publicKey = keypair.publicKey.toBase58();

        if (publicKey.toUpperCase().startsWith(normalizedPrefix)) {
          secretKey = keypair.secretKey;
          break;
        }
      }

      // If we didn't find a match, return error
      if (!secretKey || !publicKey || attempts >= maxAttempts) {
        return NextResponse.json(
          { 
            error: `Could not generate address starting with "${normalizedPrefix}" after ${maxAttempts} attempts. Try a shorter prefix.`, 
            success: false 
          },
          { status: 400 }
        );
      }
    } else {
      // Generate a random keypair
      keypair = Keypair.generate();
      publicKey = keypair.publicKey.toBase58();
      secretKey = keypair.secretKey;
    }

    // Ensure both publicKey and secretKey are assigned (TypeScript guard)
    if (!publicKey || !secretKey) {
      return NextResponse.json(
        { error: 'Failed to generate wallet keypair', success: false },
        { status: 500 }
      );
    }

    // Encrypt the secret key using AES-256-GCM for secure storage in cookies
    // Note: Even with encryption, storing secrets in cookies is not ideal for production.
    // Consider using a secure key management service (AWS KMS, HashiCorp Vault, etc.)
    // or database storage with proper access controls.
    const encryptedKey = encryptWalletKey(secretKey);
    
    // Base wallet data
    const walletData = {
      success: true,
      wallet: {
        address: publicKey,
        walletId,
        createdAt: new Date().toISOString(),
      },
    };

    // Handle email-based wallet recovery (if email provided)
    let emailHandled = false;
    let emailResponseData = { ...walletData };

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

              emailHandled = true;
              emailResponseData = {
                ...walletData,
                requiresEmailVerification: true,
                message: 'Wallet created. Please verify your email to enable recovery.',
                ...(process.env.NODE_ENV === 'development' && verificationResult.token && {
                  devVerificationToken: verificationResult.token,
                }),
              };
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
            
            emailHandled = true;
            emailResponseData = {
              ...walletData,
              emailLinked: true,
              message: 'Wallet created and linked to your email for recovery.',
            };
          } catch (dbError) {
            console.error('Database storage failed, falling back to cookie-only storage:', dbError);
            // Continue with cookie-only storage
          }
        }
      } else {
        console.warn('Database not available. Wallet created but email recovery not available.');
      }
    }

    // Create response with appropriate data
    const response = NextResponse.json(emailHandled ? emailResponseData : walletData);

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
