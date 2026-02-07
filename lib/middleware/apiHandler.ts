/**
 * API Handler Middleware Composition
 * 
 * Provides high-level wrapper functions that combine authentication and rate limiting
 * middleware for easy use in API routes.
 * 
 * This eliminates the need to manually check auth and rate limits in every route,
 * reducing code duplication and ensuring consistent security patterns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from './auth';
import {
  checkRateLimit,
  generalLimiter,
  type RateLimitHeaders,
} from './rateLimiting';
import type { Ratelimit } from '@upstash/ratelimit';

/**
 * API handler function type with authenticated context
 * The handler receives the request and a context object containing userId
 */
export type ApiHandler = (
  req: NextRequest,
  context: { params?: any; userId: string }
) => Promise<NextResponse>;

/**
 * Public API handler function type (no authentication required)
 * The handler only receives the request and optional params
 */
export type PublicApiHandler = (
  req: NextRequest,
  context?: { params?: any }
) => Promise<NextResponse>;

/**
 * Next.js route context type
 */
type RouteContext = {
  params?: any;
};

/**
 * Wraps an API handler with both rate limiting and authentication
 * 
 * Order of execution:
 * 1. Rate limiting check (fail fast if too many requests)
 * 2. Authentication check (verify user identity)
 * 3. Call the actual handler with userId
 * 
 * @param handler - The API route handler function
 * @param limiter - Optional rate limiter (defaults to generalLimiter)
 * @returns Wrapped handler function ready to be exported as POST/GET/etc.
 * 
 * @example
 * // app/api/stripe/cancel-subscription/route.ts
 * import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
 * import { generalLimiter } from '@/lib/middleware/rateLimiting';
 * 
 * export const POST = withAuthAndRateLimit(
 *   async (req, { userId }) => {
 *     // userId is automatically available and verified
 *     const { reason } = await req.json();
 *     // ... your business logic
 *     return NextResponse.json({ success: true });
 *   },
 *   generalLimiter // optional, defaults to generalLimiter
 * );
 */
export function withAuthAndRateLimit(
  handler: ApiHandler,
  limiter: Ratelimit | null = generalLimiter
) {
  return async (
    req: NextRequest,
    context: RouteContext = {}
  ): Promise<NextResponse> => {
    try {
      // Step 1: Check rate limit first (fail fast, cheaper than auth)
      const rateLimitError = await checkRateLimit(req, limiter);
      if (rateLimitError) {
        return NextResponse.json(rateLimitError.error, {
          status: rateLimitError.status,
          headers: rateLimitError.headers as any,
        });
      }

      // Step 2: Verify authentication
      const auth = await requireAuth(req);
      
      // If auth failed, it returns a NextResponse - return it
      if (isAuthError(auth)) {
        return auth;
      }

      // Step 3: Call the actual handler with userId
      const { userId } = auth;
      return await handler(req, { ...context, userId });

    } catch (error: any) {
      console.error('API handler error:', error);

      // Return generic error response (don't leak internal details)
      return NextResponse.json(
        {
          error: 'An unexpected error occurred. Please try again later.',
          ...(process.env.NODE_ENV === 'development' && {
            details: error.message,
          }),
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Wraps an API handler with only rate limiting (no authentication required)
 * 
 * Use this for public endpoints that need rate limiting but don't require authentication.
 * Examples: coupon validation, public data endpoints, webhooks
 * 
 * @param handler - The API route handler function
 * @param limiter - Rate limiter to use (required)
 * @returns Wrapped handler function ready to be exported as POST/GET/etc.
 * 
 * @example
 * // app/api/stripe/validate-coupon/route.ts
 * import { withRateLimit } from '@/lib/middleware/apiHandler';
 * import { couponLimiter } from '@/lib/middleware/rateLimiting';
 * 
 * export const POST = withRateLimit(
 *   async (req) => {
 *     const { couponCode } = await req.json();
 *     // ... validate coupon
 *     return NextResponse.json({ valid: true });
 *   },
 *   couponLimiter // 5 requests per minute
 * );
 */
export function withRateLimit(
  handler: PublicApiHandler,
  limiter: Ratelimit | null
) {
  return async (
    req: NextRequest,
    context: RouteContext = {}
  ): Promise<NextResponse> => {
    try {
      // Check rate limit
      const rateLimitError = await checkRateLimit(req, limiter);
      if (rateLimitError) {
        return NextResponse.json(rateLimitError.error, {
          status: rateLimitError.status,
          headers: rateLimitError.headers as any,
        });
      }

      // Call the handler
      return await handler(req, context);

    } catch (error: any) {
      console.error('API handler error:', error);

      // Return generic error response
      return NextResponse.json(
        {
          error: 'An unexpected error occurred. Please try again later.',
          ...(process.env.NODE_ENV === 'development' && {
            details: error.message,
          }),
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Wraps an API handler with only authentication (no rate limiting)
 * 
 * Use this for internal endpoints that need auth but not rate limiting,
 * or when rate limiting is handled elsewhere.
 * 
 * @param handler - The API route handler function
 * @returns Wrapped handler function ready to be exported as POST/GET/etc.
 * 
 * @example
 * // app/api/internal/user-data/route.ts
 * import { withAuth } from '@/lib/middleware/apiHandler';
 * 
 * export const GET = withAuth(
 *   async (req, { userId }) => {
 *     const userData = await getUserData(userId);
 *     return NextResponse.json(userData);
 *   }
 * );
 */
export function withAuth(handler: ApiHandler) {
  return async (
    req: NextRequest,
    context: RouteContext = {}
  ): Promise<NextResponse> => {
    try {
      // Verify authentication
      const auth = await requireAuth(req);
      
      if (isAuthError(auth)) {
        return auth;
      }

      // Call the handler with userId
      const { userId } = auth;
      return await handler(req, { ...context, userId });

    } catch (error: any) {
      console.error('API handler error:', error);

      return NextResponse.json(
        {
          error: 'An unexpected error occurred. Please try again later.',
          ...(process.env.NODE_ENV === 'development' && {
            details: error.message,
          }),
        },
        { status: 500 }
      );
    }
  };
}
