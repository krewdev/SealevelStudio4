/**
 * Email Service
 * Handles sending emails using Resend (or other providers)
 */

import { Resend } from 'resend';

let resend: Resend | null = null;

/**
 * Initialize email service
 */
function getEmailService(): Resend | null {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.warn('⚠️  RESEND_API_KEY not configured. Email sending will be disabled.');
      return null;
    }

    resend = new Resend(apiKey);
  }

  return resend;
}

/**
 * Send wallet recovery email
 */
export async function sendRecoveryEmail(
  email: string,
  recoveryToken: string,
  walletAddress: string
): Promise<{ success: boolean; error?: string }> {
  const emailService = getEmailService();

  if (!emailService) {
    // In development, log the token instead
    if (process.env.NODE_ENV === 'development') {
      const recoveryUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/recover?token=${recoveryToken}`;
      console.log('📧 Recovery Email (DEV MODE):');
      console.log(`   To: ${email}`);
      console.log(`   URL: ${recoveryUrl}`);
      console.log(`   Token: ${recoveryToken}`);
      return { success: true };
    }
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Sealevel Studio';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sealevelstudio.com';
    const recoveryUrl = `${appUrl}/recover?token=${recoveryToken}`;

    await emailService.emails.send({
      from: fromEmail,
      to: email,
      subject: `Recover Your ${appName} Wallet`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Recover Your Wallet</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Wallet Recovery</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="font-size: 16px; margin-bottom: 20px;">
              We received a request to recover your wallet associated with this email address.
            </p>
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
              <p style="margin: 0; font-size: 14px; color: #666;"><strong>Wallet Address:</strong></p>
              <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 12px; color: #333; word-break: break-all;">${walletAddress}</p>
            </div>
            <p style="font-size: 16px; margin-bottom: 30px;">
              Click the button below to recover your wallet. This link will expire in 1 hour.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${recoveryUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Recover Wallet
              </a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-family: monospace; font-size: 12px; color: #667eea; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">
              ${recoveryUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              If you didn't request this recovery, please ignore this email. Your wallet is secure.
            </p>
            <p style="font-size: 12px; color: #999; margin: 10px 0 0 0;">
              This link expires in 1 hour for security reasons.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Recover Your ${appName} Wallet

Hello,

We received a request to recover your wallet associated with this email address.

Wallet Address: ${walletAddress}

Click the link below to recover your wallet. This link will expire in 1 hour.

${recoveryUrl}

If you didn't request this recovery, please ignore this email. Your wallet is secure.

This link expires in 1 hour for security reasons.
      `.trim(),
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send recovery email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string
): Promise<{ success: boolean; error?: string }> {
  const emailService = getEmailService();

  if (!emailService) {
    // In development, log the token instead
    if (process.env.NODE_ENV === 'development') {
      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      console.log('📧 Verification Email (DEV MODE):');
      console.log(`   To: ${email}`);
      console.log(`   URL: ${verificationUrl}`);
      console.log(`   Token: ${verificationToken}`);
      return { success: true };
    }
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Sealevel Studio';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@sealevelstudio.com';
    const verificationUrl = `${appUrl}/verify-email?token=${verificationToken}`;

    await emailService.emails.send({
      from: fromEmail,
      to: email,
      subject: `Verify Your Email for ${appName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✉️ Verify Your Email</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="font-size: 16px; margin-bottom: 30px;">
              Please verify your email address to complete wallet setup. This helps us secure your wallet recovery process.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                Verify Email
              </a>
            </div>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-family: monospace; font-size: 12px; color: #667eea; word-break: break-all; background: #f0f0f0; padding: 10px; border-radius: 4px;">
              ${verificationUrl}
            </p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
            <p style="font-size: 12px; color: #999; margin: 0;">
              This verification link will expire in 24 hours.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Verify Your Email for ${appName}

Hello,

Please verify your email address to complete wallet setup. This helps us secure your wallet recovery process.

Click the link below to verify your email:

${verificationUrl}

This verification link will expire in 24 hours.
      `.trim(),
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

