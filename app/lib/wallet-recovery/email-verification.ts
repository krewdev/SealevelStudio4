/**
 * Email Verification System
 * Handles email verification tokens before storing wallet mappings
 */

import { query } from '@/app/lib/database/connection';
import { sendVerificationEmail } from '@/app/lib/email/service';
import crypto from 'crypto';

const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Create and send email verification token
 */
export async function createEmailVerificationToken(email: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  const normalizedEmail = email.toLowerCase().trim();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRY_MS);

  try {
    // Store verification token in database
    await query(
      `INSERT INTO email_verification_tokens (email, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) 
       DO UPDATE SET 
         token = EXCLUDED.token,
         expires_at = EXCLUDED.expires_at,
         verified_at = NULL,
         created_at = CURRENT_TIMESTAMP`,
      [normalizedEmail, token, expiresAt]
    );

    // Send verification email
    const emailResult = await sendVerificationEmail(normalizedEmail, token);

    if (!emailResult.success) {
      return {
        success: false,
        error: emailResult.error || 'Failed to send verification email',
      };
    }

    // In development, return token for testing
    if (process.env.NODE_ENV === 'development') {
      return {
        success: true,
        token,
      };
    }

    return { success: true };
  } catch (error) {
    console.error('Error creating verification token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify email verification token
 */
export async function verifyEmailToken(token: string): Promise<{
  success: boolean;
  email?: string;
  error?: string;
}> {
  try {
    const result = await query<{ email: string; expires_at: Date; verified_at: Date | null }>(
      `SELECT email, expires_at, verified_at
       FROM email_verification_tokens
       WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return {
        success: false,
        error: 'Invalid verification token',
      };
    }

    const record = result.rows[0];

    // Check if already verified
    if (record.verified_at) {
      return {
        success: false,
        error: 'Email already verified',
      };
    }

    // Check if expired
    if (new Date(record.expires_at) < new Date()) {
      return {
        success: false,
        error: 'Verification token expired',
      };
    }

    // Mark as verified
    await query(
      `UPDATE email_verification_tokens 
       SET verified_at = CURRENT_TIMESTAMP
       WHERE token = $1`,
      [token]
    );

    // Mark email as verified in wallet_email_mappings if it exists
    await query(
      `UPDATE wallet_email_mappings 
       SET email_verified = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE email = $1`,
      [record.email]
    );

    return {
      success: true,
      email: record.email,
    };
  } catch (error) {
    console.error('Error verifying token:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if email is verified
 */
export async function isEmailVerified(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Check wallet_email_mappings first (faster)
    const walletResult = await query<{ email_verified: boolean }>(
      `SELECT email_verified
       FROM wallet_email_mappings
       WHERE email = $1`,
      [normalizedEmail]
    );

    if (walletResult.rows.length > 0) {
      return walletResult.rows[0].email_verified === true;
    }

    // Check verification tokens table
    const tokenResult = await query<{ verified_at: Date | null }>(
      `SELECT verified_at
       FROM email_verification_tokens
       WHERE email = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedEmail]
    );

    if (tokenResult.rows.length > 0) {
      return tokenResult.rows[0].verified_at !== null;
    }

    return false;
  } catch (error) {
    console.error('Error checking email verification:', error);
    return false;
  }
}

