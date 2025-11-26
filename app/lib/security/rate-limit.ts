import { NextRequest } from 'next/server';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const ipRateLimit = new Map<string, { count: number; resetTime: number }>();
const walletRateLimit = new Map<string, { count: number; resetTime: number }>();

/**
 * Generic rate limiter
 */
function checkRateLimit(
  key: string,
  store: Map<string, { count: number; resetTime: number }>,
  config: RateLimitConfig
): boolean {
  const now = Date.now();
  const record = store.get(key);

  if (!record) {
    store.set(key, { count: 1, resetTime: now + config.windowMs });
    return true;
  }

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + config.windowMs;
    return true;
  }

  if (record.count >= config.limit) {
    return false;
  }

  record.count++;
  return true;
}

/**
 * Rate limit by IP address
 */
export function rateLimitByIp(request: NextRequest, config: RateLimitConfig = { limit: 10, windowMs: 60000 }): boolean {
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  return checkRateLimit(ip, ipRateLimit, config);
}

/**
 * Rate limit by Wallet address
 */
export function rateLimitByWallet(wallet: string, config: RateLimitConfig = { limit: 5, windowMs: 60000 }): boolean {
  return checkRateLimit(wallet, walletRateLimit, config);
}

/**
 * Cleanup old rate limit records to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  [ipRateLimit, walletRateLimit].forEach(store => {
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  });
}, 60000); // Run every minute

