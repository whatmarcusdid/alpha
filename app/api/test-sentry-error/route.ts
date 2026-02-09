import * as Sentry from '@sentry/nextjs';
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

export async function GET(request: NextRequest) {
  // Extract IP address from request headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : 'anonymous';

  // Check rate limit
  const { success, limit, remaining, reset } = await checkRateLimit(ip);

  // If rate limit exceeded, return 429
  if (!success) {
    return NextResponse.json(
      {
        error: 'Too many requests. Please try again later.',
        limit,
        remaining: 0,
        reset,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': reset.toString(),
        },
      }
    );
  }

  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'GET /api/test-sentry-error',
    },
    async (span) => {
      try {
        // Set span attribute to identify this as a test
        span.setAttribute('test', true);

        // Throw a test error
        throw new Error('🧪 Test server error from TSG Dashboard API!');
      } catch (error) {
        // Capture the error in Sentry with additional context
        Sentry.captureException(error, {
          tags: {
            endpoint: '/api/test-sentry-error',
            test: 'true',
          },
          extra: {
            timestamp: new Date().toISOString(),
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        // Return a helpful response with rate limit headers
        return NextResponse.json(
          {
            success: false,
            message: '✅ Server error successfully captured by Sentry!',
            error: error instanceof Error ? error.message : 'Unknown error',
            nextSteps: [
              'Check your Sentry dashboard at https://tradesitegenie.sentry.io',
              'Navigate to Issues to see the error',
              'Look for the 🧪 emoji in the issue title',
              'Click the issue to see full context, tags, and breadcrumbs',
            ],
          },
          {
            status: 500,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
            },
          }
        );
      }
    }
  );
}
