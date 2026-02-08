import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export async function GET() {
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

        // Return a helpful response
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
          { status: 500 }
        );
      }
    }
  );
}
