# Wallet Recovery System Setup Guide

This guide explains how to set up the production-ready email-based wallet recovery system.

## Overview

The wallet recovery system provides:
- **Email-based wallet recovery** - Users can recover wallets via email
- **Email verification** - Requires email verification before enabling recovery
- **Database-backed storage** - Secure, encrypted storage in PostgreSQL
- **Rate limiting** - Prevents abuse of recovery endpoints
- **Email notifications** - Professional email templates via Resend

## Prerequisites

1. PostgreSQL database (local or cloud-hosted)
2. Resend account for email sending
3. Environment variables configured

## Setup Steps

### 1. Install Dependencies

```bash
npm install pg resend @types/pg
```

### 2. Set Up PostgreSQL Database

#### Option A: Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb sealevelstudio

# Create user (optional)
createuser sealeveluser --pwprompt
```

#### Option B: Cloud Database (Recommended for Production)

- **Supabase**: https://supabase.com (Free tier available)
- **Neon**: https://neon.tech (Serverless PostgreSQL)
- **Railway**: https://railway.app (Easy deployment)
- **AWS RDS**: https://aws.amazon.com/rds/

### 3. Run Database Schema

Connect to your database and run the schema:

```bash
psql -d sealevelstudio -f app/lib/database/schema.sql
```

Or using a database client (pgAdmin, DBeaver, etc.), execute the contents of `app/lib/database/schema.sql`.

### 4. Set Up Resend (Email Service)

1. Sign up at https://resend.com
2. Get your API key from https://resend.com/api-keys
3. Verify your domain (or use Resend's test domain for development)
4. Add the API key to your `.env.local`:

```env
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_NAME=Sealevel Studio
```

### 5. Configure Environment Variables

Add these to your `.env.local`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/sealevelstudio

# Wallet Encryption (generate with: openssl rand -hex 32)
WALLET_ENCRYPTION_KEY=your_64_character_hex_key_here

# Email Service
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=noreply@yourdomain.com
NEXT_PUBLIC_APP_NAME=Sealevel Studio
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Generate Encryption Key

```bash
# Generate a secure 32-byte (64 hex characters) encryption key
openssl rand -hex 32
```

Copy the output and set it as `WALLET_ENCRYPTION_KEY`.

### 7. Test the System

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Create a wallet with email:**
   ```bash
   curl -X POST http://localhost:3000/api/wallet/create \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com"}'
   ```

3. **Check your email** for verification link (or console in dev mode)

4. **Verify email** using the token from email

5. **Request recovery:**
   ```bash
   curl -X POST http://localhost:3000/api/wallet/recover \
     -H "Content-Type: application/json" \
     -d '{"email": "test@example.com", "action": "request"}'
   ```

6. **Recover wallet** using the token from recovery email

## Security Considerations

### Encryption Key Storage

- **Never commit** `WALLET_ENCRYPTION_KEY` to git
- Store in environment variables or secret manager (AWS Secrets Manager, Vercel Env, etc.)
- Rotate keys periodically (requires re-encrypting all wallet keys)

### Database Security

- Use SSL connections in production (`ssl: { rejectUnauthorized: false }`)
- Restrict database access to application servers only
- Regularly backup database
- Enable database-level encryption if available

### Rate Limiting

- Default: 5 recovery requests per hour per email/IP
- Adjust in `app/lib/wallet-recovery/rate-limit.ts`
- Database-backed rate limiting prevents bypass attempts

### Email Security

- Always verify email ownership before allowing recovery
- Recovery tokens expire after 1 hour
- Tokens are single-use only
- Use HTTPS for all recovery links

## API Endpoints

### Create Wallet
```
POST /api/wallet/create
Body: { email?: string, userId?: string, sessionId?: string }

Response: {
  success: boolean,
  wallet: { address, walletId, createdAt },
  requiresEmailVerification?: boolean
}
```

### Request Recovery
```
POST /api/wallet/recover
Body: { email: string, action: "request" }

Response: {
  success: boolean,
  message: string
}
```

### Verify Recovery Token
```
POST /api/wallet/recover
Body: { email: string, action: "verify", token: string }

Response: {
  success: boolean,
  wallet: { address, walletId, createdAt }
}
```

### Verify Email
```
POST /api/wallet/verify-email
Body: { token: string }

Response: {
  success: boolean,
  email: string
}
```

## Troubleshooting

### Database Connection Issues

- Check `DATABASE_URL` format: `postgresql://user:pass@host:port/db`
- Verify database is running: `pg_isready`
- Check firewall rules allow connections

### Email Not Sending

- Verify `RESEND_API_KEY` is correct
- Check Resend dashboard for errors
- Ensure `RESEND_FROM_EMAIL` is verified in Resend
- In development, check console for dev tokens

### Encryption Errors

- Verify `WALLET_ENCRYPTION_KEY` is exactly 64 hex characters
- Ensure key hasn't changed (would break decryption)
- Check for special characters in key (use hex only)

## Production Checklist

- [ ] Database configured and schema applied
- [ ] `WALLET_ENCRYPTION_KEY` set and secure
- [ ] `RESEND_API_KEY` configured
- [ ] Email domain verified in Resend
- [ ] `DATABASE_URL` uses SSL in production
- [ ] Environment variables set in production platform
- [ ] Rate limiting tested
- [ ] Email verification flow tested
- [ ] Recovery flow tested end-to-end
- [ ] Database backups configured

## Migration from In-Memory Storage

If you have existing wallets stored in-memory or cookies:

1. Wallets in cookies will continue to work (backward compatible)
2. To migrate to database:
   - Users must create new wallets with email
   - Or implement a migration script to extract keys from cookies

## Support

For issues or questions:
- Check logs in console/server logs
- Verify all environment variables are set
- Test database connection independently
- Check Resend dashboard for email delivery status

