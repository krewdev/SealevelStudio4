# Server-Side Key Management Guide

## Overview

This document describes the server-side key management implementation for custodial wallets in Sealevel Studio. The system ensures that private keys never leave the server and are stored securely.

## Architecture

### Current Implementation

The custodial wallet system (`/api/wallet/create` and `/api/wallet/sign`) implements server-side key management with the following features:

1. **Key Generation**: Solana keypairs are generated server-side using `@solana/web3.js`
2. **Key Storage**: Private keys are encrypted and stored in:
   - HTTP-only cookies (default, session-based)
   - Database (if `DATABASE_URL` is configured, with email linking)
3. **Key Access**: Private keys are never returned to the client
4. **Transaction Signing**: All signing operations happen server-side via `/api/wallet/sign`

### Security Features

✅ **Private keys never exposed to client**
- Keys are stored in httpOnly cookies or database
- Keys are encrypted using AES-256-GCM encryption
- Keys are only decrypted server-side for signing operations

✅ **Rate limiting**
- Wallet creation: 20 requests per minute per IP
- Transaction signing: 20 requests per minute per IP

✅ **Session-based access control**
- Wallets are tied to session cookies
- Each wallet can only be accessed by the session that created it

✅ **Email-based recovery** (optional)
- Wallets can be linked to verified email addresses
- Enables wallet recovery via email verification

## Implementation Details

### Key Storage Methods

#### 1. HTTP-Only Cookies (Default)

```typescript
// Keys stored in httpOnly cookies
// Format: wallet_<walletId> = encrypted_key
// Session cookie: wallet_session = walletId
```

**Pros:**
- Simple to implement
- Automatically cleared when browser closes (if session cookie)
- Not accessible via JavaScript (httpOnly flag)

**Cons:**
- Lost if cookies are cleared
- Not shared across devices
- Limited storage size

#### 2. Database Storage (With Email)

```typescript
// Keys stored in database with email mapping
// Table: wallet_email_mappings
// Fields: email, wallet_address, encrypted_key, email_verified
```

**Pros:**
- Persistent across sessions
- Enables wallet recovery
- Can be accessed from multiple devices (after email verification)

**Cons:**
- Requires database setup
- Email verification required for security

### Encryption

Private keys are encrypted using AES-256-GCM encryption:

```typescript
// Encryption function (app/lib/wallet-recovery/encryption.ts)
encryptWalletKey(secretKey: Uint8Array): string
decryptWalletKey(encryptedKey: string): Uint8Array
```

The encryption uses:
- AES-256-GCM algorithm
- Server-side encryption key (from environment or generated)
- Authenticated encryption (prevents tampering)

## API Endpoints

### Create Wallet

```typescript
POST /api/wallet/create
Body: {
  email?: string,
  skipEmailVerification?: boolean,
  vanityPrefix?: string
}

Response: {
  wallet: {
    address: string,
    walletId: string,
    createdAt: string
  },
  requiresEmailVerification?: boolean
}
```

**Security:**
- Rate limited: 20 requests/minute per IP
- Private key stored server-side only
- Returns wallet address, never private key

### Sign Transaction

```typescript
POST /api/wallet/sign
Body: {
  transaction: string, // base64 encoded transaction
  walletId?: string    // optional, uses session cookie if not provided
}

Response: {
  success: boolean,
  signedTransaction: string, // base64 encoded signed transaction
  walletAddress: string
}
```

**Security:**
- Rate limited: 20 requests/minute per IP
- Validates wallet ownership via session cookie
- Private key never exposed
- Validates transaction format before signing

## Production Recommendations

### 1. Use a Key Management Service (KMS)

For production, consider using a dedicated KMS:

**Options:**
- **AWS KMS**: Managed key management service
- **HashiCorp Vault**: Self-hosted secrets management
- **Google Cloud KMS**: Managed key management
- **Azure Key Vault**: Managed key management

**Benefits:**
- Hardware Security Modules (HSM) for key storage
- Key rotation capabilities
- Audit logging
- Compliance certifications (SOC 2, PCI DSS, etc.)

### 2. Implement Key Rotation

Regularly rotate encryption keys:

```typescript
// Pseudo-code for key rotation
async function rotateEncryptionKeys() {
  // 1. Generate new encryption key
  const newKey = generateEncryptionKey();
  
  // 2. Re-encrypt all stored keys with new key
  const wallets = await getAllWallets();
  for (const wallet of wallets) {
    const decrypted = decryptWithOldKey(wallet.encryptedKey);
    const reEncrypted = encryptWithNewKey(decrypted);
    await updateWallet(wallet.id, reEncrypted);
  }
  
  // 3. Update environment variable
  process.env.WALLET_ENCRYPTION_KEY = newKey;
}
```

### 3. Add Audit Logging

Log all key access and signing operations:

```typescript
// Log wallet creation
await auditLog({
  action: 'wallet_created',
  walletId: wallet.id,
  walletAddress: wallet.address,
  ip: request.ip,
  timestamp: new Date(),
});

// Log transaction signing
await auditLog({
  action: 'transaction_signed',
  walletId: wallet.id,
  transactionHash: transaction.hash,
  ip: request.ip,
  timestamp: new Date(),
});
```

### 4. Implement Multi-Factor Authentication (MFA)

For sensitive operations, require additional authentication:

```typescript
// Require MFA for large transactions
if (transactionAmount > LARGE_TRANSACTION_THRESHOLD) {
  const mfaVerified = await verifyMFA(userId, mfaToken);
  if (!mfaVerified) {
    return NextResponse.json({ error: 'MFA required' }, { status: 403 });
  }
}
```

### 5. Use Hardware Wallets for High-Value Wallets

For high-value wallets, consider using hardware wallet integration:

- Ledger integration
- Trezor integration
- Hardware Security Modules (HSM)

### 6. Database Security

If using database storage:

- Use encrypted database connections (TLS)
- Encrypt database at rest
- Implement database access controls
- Regular security audits
- Backup encryption

### 7. Environment Variables

Store encryption keys securely:

```bash
# Production: Use secrets management service
WALLET_ENCRYPTION_KEY=<from-secrets-manager>

# Development: Generate random key
# openssl rand -hex 32
```

**Never:**
- Commit encryption keys to version control
- Use default or weak encryption keys
- Share encryption keys across environments

## Migration Path

### From Client-Side to Server-Side

If migrating from client-side wallet storage:

1. **Phase 1**: Implement server-side wallet creation alongside existing system
2. **Phase 2**: Migrate users to custodial wallets (optional)
3. **Phase 3**: Deprecate client-side wallet storage
4. **Phase 4**: Remove client-side wallet code

### From Cookie Storage to Database

If migrating from cookie storage to database:

1. **Phase 1**: Add database storage option alongside cookies
2. **Phase 2**: Migrate existing wallets to database (with user consent)
3. **Phase 3**: Make database storage the default
4. **Phase 4**: Remove cookie storage (keep for session-only wallets)

## Security Checklist

- [x] Private keys never exposed to client
- [x] Keys encrypted at rest
- [x] Rate limiting implemented
- [x] Session-based access control
- [x] Email verification for recovery
- [ ] Key rotation implemented
- [ ] Audit logging implemented
- [ ] MFA for sensitive operations
- [ ] KMS integration (production)
- [ ] Database encryption at rest
- [ ] Regular security audits

## Testing

### Unit Tests

```typescript
// Test key encryption/decryption
test('encryptWalletKey and decryptWalletKey', () => {
  const keypair = Keypair.generate();
  const encrypted = encryptWalletKey(keypair.secretKey);
  const decrypted = decryptWalletKey(encrypted);
  expect(decrypted).toEqual(keypair.secretKey);
});

// Test wallet creation
test('POST /api/wallet/create', async () => {
  const response = await fetch('/api/wallet/create', {
    method: 'POST',
    body: JSON.stringify({ email: 'test@example.com' }),
  });
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.wallet.address).toBeDefined();
  expect(data.wallet.privateKey).toBeUndefined(); // Never returned
});
```

### Security Tests

```typescript
// Test rate limiting
test('rate limiting on wallet creation', async () => {
  const requests = Array(25).fill(null).map(() =>
    fetch('/api/wallet/create', { method: 'POST' })
  );
  const responses = await Promise.all(requests);
  const rateLimited = responses.filter(r => r.status === 429);
  expect(rateLimited.length).toBeGreaterThan(0);
});

// Test private key not exposed
test('private key never returned', async () => {
  const response = await fetch('/api/wallet/create', {
    method: 'POST',
  });
  const data = await response.json();
  expect(data.wallet.privateKey).toBeUndefined();
  expect(data.privateKey).toBeUndefined();
});
```

## Troubleshooting

### Wallet Not Found

**Issue**: `Wallet not found in session`

**Solutions:**
1. Check if cookies are enabled
2. Verify session cookie exists
3. Check if wallet was created in same session
4. For database storage, verify email is linked

### Decryption Failed

**Issue**: `Failed to decrypt wallet key`

**Solutions:**
1. Verify `WALLET_ENCRYPTION_KEY` environment variable is set
2. Check if encryption key changed (keys are not compatible)
3. Verify cookie value is not corrupted
4. Check database encryption key if using database storage

### Rate Limit Exceeded

**Issue**: `Rate limit exceeded`

**Solutions:**
1. Wait for rate limit window to reset
2. Check rate limit configuration
3. For production, consider increasing limits or using Redis for distributed rate limiting

## References

- [Solana Web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [OWASP Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [NIST Key Management Guidelines](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)

