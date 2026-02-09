/**
 * Rate Limiting Middleware
 * 
 * Provides IP-based rate limiting for API routes using Upstash Redis.
 * Prevents abuse, brute force attacks, and API spam.
 * 
 * Environment variables required:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

import { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limit result type
 */
export type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  pending: Promise<unknown>;
};

/**
 * Rate limit response headers
 */
export type RateLimitHeaders = {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
};

// Initialize Upstash Redis client (conditional based on env vars)
let redis: Redis | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    console.log('✅ Upstash Redis initialized for rate limiting');
  } catch (error) {
    console.error('❌ Failed to initialize Upstash Redis:', error);
    redis = null;
  }
} else {
  console.warn(
    '⚠️ Rate limiting disabled - Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN'
  );
}

/**
 * Create rate limiter instances
 * If Redis is not available, these will be null and rate limiting will be bypassed
 */

// Stripe checkout: 10 requests per minute per IP
export const checkoutLimiter = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(10, '1 m'),
      analytics: true,
      prefix: 'ratelimit:checkout',
    })
  : null;

// Coupon validation: 5 requests per minute per IP (prevent brute force)
export const couponLimiter = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      analytics: true,
      prefix: 'ratelimit:coupon',
    })
  : null;

// Zapier webhook: 20 requests per minute per IP
export const webhookLimiter = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(20, '1 m'),
      analytics: true,
      prefix: 'ratelimit:webhook',
    })
  : null;

// General API: 60 requests per minute per IP (fallback for all other routes)
export const generalLimiter = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      analytics: true,
      prefix: 'ratelimit:general',
    })
  : null;

// Delivery Scout (Lindy AI): 100 requests per hour per IP
// Lindy AI automation endpoint - prevents abuse while allowing reasonable automation
export const deliveryScoutLimiter = redis
  ? new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(100, '1 h'),
      analytics: true,
      prefix: 'ratelimit:delivery-scout',
    })
  : null;

/**
 * Extract client identifier (IP address) from request
 * 
 * Checks multiple headers in order of preference:
 * 1. x-forwarded-for (most common in production behind proxies)
 * 2. x-real-ip (alternative header)
 * 3. request IP (fallback)
 * 
 * @param req - Next.js request object
 * @returns IP address or 'unknown' if not found
 */
export function getClientIdentifier(req: NextRequest): string {
  // Check x-forwarded-for header (standard for proxies/load balancers)
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  // Check x-real-ip header (alternative)
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  // Last resort fallback
  console.warn('⚠️ Could not determine client IP address from headers');
  return 'unknown';
}

/**
 * Apply rate limit check for a given identifier
 * 
 * @param limiter - Ratelimit instance to use
 * @param identifier - Client identifier (usually IP address)
 * @returns Rate limit result with success status and metadata
 * 
 * @example
 * const result = await applyRateLimit(couponLimiter, '192.168.1.1');
 * if (!result.success) {
 *   return NextResponse.json(
 *     { error: 'Too many requests' },
 *     { status: 429, headers: getRateLimitHeaders(result) }
 *   );
 * }
 */
export async function applyRateLimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<RateLimitResult> {
  // If rate limiting is not configured, allow the request
  if (!limiter) {
    console.warn('⚠️ Rate limiter not configured - request allowed without limit check');
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      pending: Promise.resolve(),
    };
  }

  try {
    // Check rate limit
    const result = await limiter.limit(identifier);
    
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
      pending: result.pending,
    };
  } catch (error) {
    console.error('❌ Rate limit check failed:', error);
    
    // On error, allow the request (fail open for availability)
    // In production, you might want to fail closed for security
    return {
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
      pending: Promise.resolve(),
    };
  }
}

/**
 * Convert rate limit result to HTTP headers
 * 
 * @param result - Rate limit result from applyRateLimit
 * @returns HTTP headers object ready to be added to response
 */
export function getRateLimitHeaders(result: RateLimitResult): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };

  // Add Retry-After header if rate limit exceeded
  if (!result.success && result.reset) {
    const retryAfterSeconds = Math.ceil((result.reset - Date.now()) / 1000);
    headers['Retry-After'] = Math.max(retryAfterSeconds, 1).toString();
  }

  return headers;
}

/**
 * Check rate limit and return error response if exceeded
 * Convenience function that combines applyRateLimit and error response generation
 * 
 * @param req - Next.js request object
 * @param limiter - Rate limiter to use
 * @returns null if rate limit passed, error object if exceeded
 * 
 * @example
 * const rateLimitError = await checkRateLimit(request, couponLimiter);
 * if (rateLimitError) {
 *   return NextResponse.json(
 *     rateLimitError.error,
 *     { status: rateLimitError.status, headers: rateLimitError.headers }
 *   );
 * }
 */
export async function checkRateLimit(
  req: NextRequest,
  limiter: Ratelimit | null
): Promise<{
  error: { error: string; retryAfter?: number };
  status: number;
  headers: RateLimitHeaders;
} | null> {
  const identifier = getClientIdentifier(req);
  const result = await applyRateLimit(limiter, identifier);

  if (!result.success) {
    const headers = getRateLimitHeaders(result);
    const retryAfterSeconds = headers['Retry-After']
      ? parseInt(headers['Retry-After'])
      : 60;

    return {
      error: {
        error: `Too many requests. Please try again in ${retryAfterSeconds} seconds.`,
        retryAfter: retryAfterSeconds,
      },
      status: 429,
      headers,
    };
  }

  return null;
}
