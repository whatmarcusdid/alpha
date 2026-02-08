// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://c8bb1edbf60f27a70a094defa8c32aad@o4510851817078784.ingest.us.sentry.io/4510851818651648",

  // Only enable Sentry in production to avoid noise during development
  enabled: process.env.NODE_ENV === 'production',

  // Integrations for server-side tracking
  integrations: [
    // Log console warnings and errors to Sentry
    Sentry.consoleLoggingIntegration({
      levels: ["warn", "error"],
    }),
  ],

  // Sample 100% of traces in production
  // Adjust this value in production if you have high traffic
  tracesSampleRate: 1.0,

  // Set the environment based on NODE_ENV
  environment: process.env.NODE_ENV,

  // Set release to Git commit SHA for version tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,

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
          const sensitiveFields = ['api_key', 'apiKey', 'token', 'password', 'stripeCustomerId', 'email'];
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
    if (event.request?.data) {
      if (typeof event.request.data === 'string') {
        event.request.data = redactEmail(event.request.data);
      } else if (typeof event.request.data === 'object' && event.request.data !== null) {
        const dataObj = event.request.data as Record<string, any>;
        if ('email' in dataObj && typeof dataObj.email === 'string') {
          dataObj.email = redactEmail(dataObj.email);
        }
      }
    }

    // Apply email redaction to event message
    if (event.message) {
      event.message = redactEmail(event.message);
    }

    // 4. Filter sensitive data from extra context
    if (event.extra) {
      const sensitiveKeys = ['api_key', 'apiKey', 'token', 'password', 'secret', 'stripe_key', 'stripeCustomerId'];
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

    // Filter out Stripe test mode errors that are expected
    const error = hint.originalException;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = String(error.message || '');
      
      // Don't send "No such customer" errors in test mode (these are expected during testing)
      if (message.includes('No such customer') && message.includes('test mode')) {
        return null;
      }
    }

    // Check event message for Stripe test mode errors
    if (event.message?.includes('No such customer') && event.message?.includes('test mode')) {
      return null;
    }

    return event;
  },
});
