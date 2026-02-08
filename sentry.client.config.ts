// This file configures the initialization of Sentry on the client (browser).
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://c8bb1edbf60f27a70a094defa8c32aad@o4510851817078784.ingest.us.sentry.io/4510851818651648",

  // Only enable Sentry in production to avoid noise during development
  enabled: process.env.NODE_ENV === 'production',

  // Integrations for enhanced tracking
  integrations: [
    // Log console messages to Sentry
    Sentry.consoleLoggingIntegration({
      levels: ["log", "warn", "error"],
    }),
    // Browser performance tracing
    Sentry.browserTracingIntegration(),
  ],

  // Sample 100% of traces in production
  // Adjust this value in production if you have high traffic
  tracesSampleRate: 1.0,

  // Set the environment based on NODE_ENV
  environment: process.env.NODE_ENV,

  // Set release to Git commit SHA for version tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Filter and sanitize events before sending to Sentry
  beforeSend(event, hint) {
    // 1. Filter sensitive data from URLs
    if (event.request?.url) {
      event.request.url = event.request.url
        .replace(/sessionId=[^&]*/gi, 'sessionId=[REDACTED]')
        .replace(/token=[^&]*/gi, 'token=[REDACTED]')
        .replace(/api_key=[^&]*/gi, 'api_key=[REDACTED]');
    }

    // 2. Filter sensitive data from breadcrumbs
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
        // Redact sensitive URL parameters in breadcrumb URLs
        if (breadcrumb.data?.url) {
          breadcrumb.data.url = breadcrumb.data.url
            .replace(/sessionId=[^&]*/gi, 'sessionId=[REDACTED]')
            .replace(/token=[^&]*/gi, 'token=[REDACTED]')
            .replace(/api_key=[^&]*/gi, 'api_key=[REDACTED]');
        }
        
        // Redact sensitive fields from breadcrumb data
        if (breadcrumb.data) {
          const sensitiveFields = ['api_key', 'apiKey', 'token', 'password'];
          sensitiveFields.forEach((field) => {
            if (field in breadcrumb.data!) {
              breadcrumb.data![field] = '[REDACTED]';
            }
          });
        }
        
        return breadcrumb;
      });
    }

    // 3. Partially redact email addresses (keep domain, hide username)
    const redactEmail = (str: string) => {
      return str.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@$2');
    };

    // Apply email redaction to request data
    if (event.request?.data && typeof event.request.data === 'string') {
      event.request.data = redactEmail(event.request.data);
    }

    // Apply email redaction to event message
    if (event.message) {
      event.message = redactEmail(event.message);
    }

    // 4. Filter sensitive data from extra context
    if (event.extra) {
      const sensitiveKeys = ['api_key', 'apiKey', 'token', 'password', 'secret', 'stripe_key'];
      Object.keys(event.extra).forEach((key) => {
        if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
          event.extra![key] = '[REDACTED]';
        }
        
        // Redact email addresses in extra data
        if (typeof event.extra![key] === 'string') {
          event.extra![key] = redactEmail(event.extra![key] as string);
        }
      });
    }

    // Filter out Firebase auth token expired errors (these are expected and handled)
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'auth/id-token-expired') {
        return null; // Don't send this error to Sentry
      }
    }

    // Check error message for auth/id-token-expired
    if (event.message?.includes('auth/id-token-expired')) {
      return null;
    }

    return event;
  },
});
