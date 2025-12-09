/**
 * Centralized Rate Limiting Middleware
 * 
 * This middleware provides rate limiting for all API endpoints.
 * In production, consider using Redis for distributed rate limiting.
 * 
 * Usage:
 * ```typescript
 * import { withRateLimit } from '@/app/lib/security/rate-limit-middleware';
 * 
 * export async function GET(request: NextRequest) {
 *   const rateLimitResponse = withRateLimit(request, { limit: 100, windowMs: 60000 });
 *   if (rateLimitResponse) return rateLimitResponse;
 *   // ... rest of handler
 * }
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';

export interface RateLimitConfig {
  limit: number;        // Maximum requests
  windowMs: number;     // Time window in milliseconds
  identifier?: 'ip' | 'ip-and-path'; // How to identify requests
}

// In-memory rate limit stores
// In production, replace with Redis or similar distributed store
const rateLimitStores = new Map<string, Map<string, { count: number; resetTime: number }>>();

/**
 * Get or create a rate limit store for a specific configuration
 */
function getStore(config: RateLimitConfig): Map<string, { count: number; resetTime: number }> {
  const storeKey = `${config.limit}-${config.windowMs}-${config.identifier || 'ip'}`;
  
  if (!rateLimitStores.has(storeKey)) {
    rateLimitStores.set(storeKey, new Map());
  }
  
  return rateLimitStores.get(storeKey)!;
}

/**
 * Get identifier for rate limiting
 */
function getIdentifier(request: NextRequest, config: RateLimitConfig): string {
  const ip = request.ip || 
             request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  if (config.identifier === 'ip-and-path') {
    const path = request.nextUrl.pathname;
    return `${ip}:${path}`;
  }
  
  return ip;
}

/**
 * Check if request is within rate limit
 */
function checkRateLimit(
  identifier: string,
  store: Map<string, { count: number; resetTime: number }>,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record) {
    store.set(identifier, { count: 1, resetTime: now + config.windowMs });
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Reset if window expired
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + config.windowMs;
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Check if limit exceeded
  if (record.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment count
  record.count++;
  return {
    allowed: true,
    remaining: config.limit - record.count,
    resetTime: record.resetTime,
  };
}

/**
 * Rate limiting middleware wrapper
 * 
 * @param request - Next.js request object
 * @param config - Rate limit configuration
 * @returns NextResponse if rate limited, null if allowed
 */
export function withRateLimit(
  request: NextRequest,
  config: RateLimitConfig = { limit: 100, windowMs: 60000 }
): NextResponse | null {
  const store = getStore(config);
  const identifier = getIdentifier(request, config);
  const result = checkRateLimit(identifier, store, config);

  if (!result.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again after ${new Date(result.resetTime).toISOString()}`,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': config.limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  // Add rate limit headers to successful responses
  // Note: These will need to be added manually to the response in the handler
  return null;
}

/**
 * Get rate limit info without blocking (for logging/monitoring)
 */
export function getRateLimitInfo(
  request: NextRequest,
  config: RateLimitConfig = { limit: 100, windowMs: 60000 }
): { remaining: number; resetTime: number; limit: number } {
  const store = getStore(config);
  const identifier = getIdentifier(request, config);
  const result = checkRateLimit(identifier, store, config);
  
  return {
    remaining: result.remaining,
    resetTime: result.resetTime,
    limit: config.limit,
  };
}

/**
 * Cleanup old rate limit records to prevent memory leaks
 */
setInterval(() => {
  const now = Date.now();
  for (const store of rateLimitStores.values()) {
    for (const [key, record] of Array.from(store.entries())) {
      // Delete records that are well past their reset time (2x window to be safe)
      if (now > record.resetTime + 120000) { // 2 minutes past reset
        store.delete(key);
      }
    }
  }
}, 60000); // Run every minute

// Default configurations for different endpoint types
export const RATE_LIMIT_CONFIGS = {
  // Standard API endpoints
  standard: { limit: 100, windowMs: 60000 }, // 100 requests per minute
  
  // Proxy endpoints (external API calls)
  proxy: { limit: 50, windowMs: 60000 }, // 50 requests per minute
  
  // Expensive operations
  expensive: { limit: 10, windowMs: 60000 }, // 10 requests per minute
  
  // Authentication endpoints
  auth: { limit: 5, windowMs: 60000 }, // 5 requests per minute
  
  // Wallet operations
  wallet: { limit: 20, windowMs: 60000 }, // 20 requests per minute
} as const;

