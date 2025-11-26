/**
 * Database-backed Rate Limiting for Wallet Recovery
 * Prevents abuse of recovery endpoints
 */

import { query } from '@/app/lib/database/connection';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 5, // Max 5 recovery requests
  windowMs: 60 * 60 * 1000, // Per hour
};

/**
 * Check if recovery request is allowed (database-backed)
 */
export async function checkRecoveryRateLimit(
  identifier: string,
  identifierType: 'email' | 'ip',
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  try {
    const windowStart = new Date(Date.now() - config.windowMs);

    // Get or create rate limit record
    const result = await query(
      `INSERT INTO recovery_rate_limits (identifier, identifier_type, request_count, window_start, last_request_at)
       VALUES ($1, $2, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (identifier, identifier_type)
       DO UPDATE SET
         request_count = CASE 
           WHEN recovery_rate_limits.window_start < $3 THEN 1
           ELSE recovery_rate_limits.request_count + 1
         END,
         window_start = CASE 
           WHEN recovery_rate_limits.window_start < $3 THEN CURRENT_TIMESTAMP
           ELSE recovery_rate_limits.window_start
         END,
         last_request_at = CURRENT_TIMESTAMP
       RETURNING request_count, window_start`,
      [identifier, identifierType, windowStart]
    );

    const record = result.rows[0];
    const requestCount = parseInt(record.request_count, 10);
    const windowStartTime = new Date(record.window_start);
    const resetAt = new Date(windowStartTime.getTime() + config.windowMs);

    const allowed = requestCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - requestCount);

    return { allowed, remaining, resetAt };
  } catch (error) {
    // If database fails, allow the request (fail open)
    // In production, you might want to fail closed instead
    console.error('Rate limit check failed:', error);
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetAt: new Date(Date.now() + config.windowMs),
    };
  }
}

/**
 * Clean up old rate limit records (should be run periodically)
 */
export async function cleanupRateLimits(): Promise<void> {
  try {
    const cutoffTime = new Date(Date.now() - DEFAULT_CONFIG.windowMs * 2);
    await query(
      `DELETE FROM recovery_rate_limits 
       WHERE window_start < $1`,
      [cutoffTime]
    );
  } catch (error) {
    console.error('Error cleaning up rate limits:', error);
  }
}

/**
 * In-memory fallback rate limiter (for when database is unavailable)
 */
const inMemoryRateLimits = new Map<string, { count: number; resetTime: number }>();

export function checkRecoveryRateLimitInMemory(
  identifier: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now();
  const key = identifier;
  const record = inMemoryRateLimits.get(key);

  if (!record || now > record.resetTime) {
    inMemoryRateLimits.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: new Date(now + config.windowMs),
    };
  }

  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(record.resetTime),
    };
  }

  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: new Date(record.resetTime),
  };
}

