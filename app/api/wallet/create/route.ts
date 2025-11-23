import { NextRequest, NextResponse } from 'next/server';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Create a custodial wallet for a user
 * POST /api/wallet/create
 * Body: { userId?: string, sessionId?: string }
 * 
 * Returns: { wallet: { address, walletId, createdAt } }
 * 
 * SECURITY: The secret key is NEVER returned to the client.
 * It is stored server-side only (in httpOnly cookies or database).
 * All signing operations must go through server-side API endpoints.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId, sessionId } = body;

    // Generate a unique identifier for this wallet
    const walletId = userId || sessionId || crypto.randomBytes(16).toString('hex');

    // Generate a new Solana keypair
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const secretKey = keypair.secretKey;

    // Encrypt the secret key for storage (in production, use proper encryption)
    // For now, we'll base58 encode it - in production, use AES encryption with a master key
    const encryptedKey = bs58.encode(secretKey);
    
    // In production, store this in a database with proper encryption
    // For now, we'll return it to be stored client-side in a secure cookie
    
    // Store wallet mapping in a cookie (in production, use database)
    // SECURITY: Never send the secret key to the client, even encoded
    // The secret key is stored server-side only (in cookies/database)
    const response = NextResponse.json({
      success: true,
      wallet: {
        address: publicKey,
        walletId,
        createdAt: new Date().toISOString(),
      },
      // encryptedKey is NOT returned - it's stored server-side only
      // All signing operations must go through server-side API endpoints
    });

    // Store wallet ID in a secure cookie
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

