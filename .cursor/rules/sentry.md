# Sentry Best Practices for TradeSiteGenie Dashboard

This guide covers how to properly implement Sentry monitoring across the TSG Dashboard.

---

## 1. Exception Catching

Always wrap error-prone code in try/catch blocks and use `Sentry.captureException()` to send errors to Sentry.

### Basic Pattern

```typescript
try {
  // Your code that might throw an error
  await someRiskyOperation();
} catch (error) {
  console.error('Error description:', error);
  Sentry.captureException(error);
  // Handle the error (show user message, return error response, etc.)
}
```

### With Tags and Context

```typescript
try {
  await processPayment(customerId);
} catch (error) {
  console.error('Payment processing failed:', error);
  
  Sentry.captureException(error, {
    tags: {
      component: 'PaymentProcessor',
      action: 'processPayment',
      stripe: 'true',
    },
    extra: {
      customerId: customerId.substring(0, 10) + '...',
      timestamp: new Date().toISOString(),
    },
    user: {
      id: userId,
      email: userEmail,
    },
  });
  
  return { success: false, error: 'Payment failed' };
}
```

### API Route Pattern

```typescript
export async function POST(req: NextRequest) {
  try {
    // API logic here
  } catch (error) {
    console.error('API error:', error);
    
    Sentry.captureException(error, {
      tags: {
        endpoint: 'api-route-name',
        method: 'POST',
      },
      extra: {
        userId: userId,
        // Add relevant request context
      },
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## 2. Tracing Examples

Use `Sentry.startSpan()` to track performance of meaningful actions. Spans help you understand where your app spends time.

### UI Action Example

```typescript
const handleButtonClick = async () => {
  return Sentry.startSpan(
    {
      op: 'ui.action',
      name: 'Update Payment Method',
    },
    async (span) => {
      try {
        // Set attributes for filtering and analysis
        span.setAttribute('userId', user.uid);
        span.setAttribute('component', 'PaymentSettings');
        
        const result = await updatePaymentMethod();
        
        span.setAttribute('success', true);
        return result;
      } catch (error) {
        span.setAttribute('success', false);
        Sentry.captureException(error);
        throw error;
      }
    }
  );
};
```

### API Call Example

```typescript
export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/stripe/create-subscription',
    },
    async (span) => {
      try {
        // Add attributes throughout the operation
        span.setAttribute('userId', userId);
        
        const subscription = await stripe.subscriptions.create({...});
        
        span.setAttribute('subscriptionId', subscription.id.substring(0, 10) + '...');
        span.setAttribute('tier', tier);
        span.setAttribute('amount', amount);
        
        return NextResponse.json({ success: true });
      } catch (error) {
        Sentry.captureException(error, {
          tags: { endpoint: 'create-subscription', stripe: 'true' }
        });
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
      }
    }
  );
}
```

### Webhook Processing Example

```typescript
export async function POST(req: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'webhook.stripe',
      name: 'Process Stripe Webhook',
    },
    async (span) => {
      const event = constructEvent(body, signature);
      
      // Set event type for filtering
      span.setAttribute('eventType', event.type);
      
      switch (event.type) {
        case 'checkout.session.completed':
          span.setAttribute('customerId', customerId.substring(0, 10) + '...');
          await handleCheckout(event, span);
          break;
      }
      
      return NextResponse.json({ received: true });
    }
  );
}
```

### Common Span Operations (`op` values)

- **`ui.action`** - User interactions (button clicks, form submissions)
- **`http.server`** - API route handlers
- **`http.client`** - Outgoing HTTP requests
- **`webhook.stripe`** - Webhook processing
- **`db.query`** - Database operations
- **`function.firestore`** - Firestore operations

---

## 3. Logs with Sentry Logger

Import Sentry with the wildcard import and use `Sentry.logger` for structured logging.

### Import Pattern

```typescript
import * as Sentry from '@sentry/nextjs';
```

### Logger Levels

```typescript
// TRACE - Very detailed debugging info
Sentry.logger.trace('Entering function with params:', { userId, action });

// DEBUG - Debugging information
Sentry.logger.debug('Fetching user data', { userId });

// INFO - General informational messages
Sentry.logger.info('User successfully logged in', { userId });

// WARN - Warning messages (potential issues)
Sentry.logger.warn('Payment method missing for subscription', { userId });

// ERROR - Error messages
Sentry.logger.error('Failed to process webhook', { error, eventType });

// FATAL - Critical errors that require immediate attention
Sentry.logger.fatal('Database connection lost', { error });
```

### Using Template Literals with logger.fmt

```typescript
// Use logger.fmt for template literals to get proper formatting
const userId = 'user_123';
const action = 'update_profile';

Sentry.logger.info(
  Sentry.logger.fmt`User ${userId} performed action ${action}`
);

// Complex example
const subscription = { id: 'sub_123', tier: 'professional', amount: 7900 };

Sentry.logger.info(
  Sentry.logger.fmt`Subscription ${subscription.id} upgraded to ${subscription.tier} for $${subscription.amount / 100}`
);
```

### Structured Logging with Context

```typescript
// Log with additional context object
Sentry.logger.info('Webhook received', {
  eventType: 'checkout.session.completed',
  customerId: customerId.substring(0, 10) + '...',
  amount: session.amount_total,
  timestamp: new Date().toISOString(),
});

// Log error with full context
Sentry.logger.error('Subscription creation failed', {
  error: error.message,
  userId,
  tier,
  billingCycle,
  attemptNumber: 3,
});
```

---

## 4. Configuration

Sentry initialization happens in **three configuration files only**. Never initialize Sentry elsewhere.

### Client Configuration (`sentry.client.config.ts`)

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  
  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',
  
  // Integrations
  integrations: [
    Sentry.consoleLoggingIntegration({
      levels: ["log", "warn", "error"],
    }),
    Sentry.browserTracingIntegration(),
  ],
  
  // Sample 100% of traces
  tracesSampleRate: 1.0,
  
  // Environment tracking
  environment: process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  
  // Filter sensitive data before sending
  beforeSend(event, hint) {
    // Redact sessionId from URLs
    if (event.request?.url) {
      event.request.url = event.request.url.replace(
        /sessionId=[^&]*/gi,
        'sessionId=[REDACTED]'
      );
    }
    
    // Filter out expected errors
    if (hint.originalException?.code === 'auth/id-token-expired') {
      return null;
    }
    
    return event;
  },
});
```

### Server Configuration (`sentry.server.config.ts`)

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  
  enabled: process.env.NODE_ENV === 'production',
  
  integrations: [
    Sentry.consoleLoggingIntegration({
      levels: ["warn", "error"],
    }),
  ],
  
  tracesSampleRate: 1.0,
  
  environment: process.env.NODE_ENV,
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  
  beforeSend(event, hint) {
    // Redact sensitive data
    if (event.request?.data) {
      const data = event.request.data;
      if (typeof data === 'object' && data !== null) {
        const dataObj = data as Record<string, any>;
        if ('stripeCustomerId' in dataObj) {
          dataObj.stripeCustomerId = '[REDACTED]';
        }
        if ('email' in dataObj) {
          dataObj.email = '[REDACTED]';
        }
      }
    }
    
    return event;
  },
});
```

### Edge Configuration (`sentry.edge.config.ts`)

```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  
  tracesSampleRate: 1.0,
  
  environment: process.env.NODE_ENV,
});
```

---

## 5. Important Notes

### ✅ DO

- **Import properly**: Always use `import * as Sentry from '@sentry/nextjs'`
- **Add meaningful attributes**: Use `span.setAttribute()` to add context
- **Truncate sensitive data**: Use `.substring(0, 10) + '...'` for IDs
- **Use tags for filtering**: Add tags like `{ stripe: 'true', component: 'PaymentModal' }`
- **Include user context**: Add `user: { id, email }` when available
- **Structure logs**: Use logger with context objects, not just strings
- **Capture success events**: Use `captureMessage` with `level: 'info'` for important successes
- **One span per action**: Wrap entire operations in a single span

### ❌ DON'T

- **Don't initialize Sentry in components**: Only in `sentry.*.config.ts` files
- **Don't use `require()`**: Always use ES6 `import` syntax
- **Don't send full IDs**: Always truncate sensitive identifiers
- **Don't over-log**: Avoid trace/debug logs in production (they're expensive)
- **Don't nest spans unnecessarily**: Keep span hierarchy flat when possible
- **Don't forget catch blocks**: Always wrap Sentry calls in try/catch
- **Don't log passwords/tokens**: Never include sensitive auth data

### When to Use Each Tool

**`captureException()`** - When catching errors
```typescript
catch (error) {
  Sentry.captureException(error, { tags, extra });
}
```

**`captureMessage()`** - For warnings or notable events
```typescript
Sentry.captureMessage('User attempted to downgrade from Safety Net', {
  level: 'warning',
  extra: { userId }
});
```

**`startSpan()`** - For performance tracking
```typescript
Sentry.startSpan({ op: 'ui.action', name: 'Submit Form' }, async (span) => {
  // Tracked code
});
```

**`logger.*`** - For structured logging
```typescript
Sentry.logger.info('Operation completed', { userId, duration });
```

---

## Privacy & Security

Always protect user data when sending to Sentry:

```typescript
// ✅ GOOD - Truncated ID
span.setAttribute('customerId', customerId.substring(0, 10) + '...');

// ❌ BAD - Full ID exposed
span.setAttribute('customerId', customerId);

// ✅ GOOD - Redacted email
extra: { email: '[REDACTED]' }

// ❌ BAD - Email exposed
extra: { email: user.email }

// ✅ GOOD - No sensitive data
extra: { hasPaymentMethod: true }

// ❌ BAD - Payment details exposed
extra: { cardNumber: '4242424242424242' }
```

---

## Quick Reference

```typescript
// Import
import * as Sentry from '@sentry/nextjs';

// Exception
Sentry.captureException(error, { tags, extra, user });

// Message
Sentry.captureMessage('Event description', { level: 'info', extra });

// Span
Sentry.startSpan({ op: 'operation.type', name: 'Action Name' }, async (span) => {
  span.setAttribute('key', 'value');
  // Your code
});

// Logger
Sentry.logger.info('Message', { contextObject });
Sentry.logger.error(Sentry.logger.fmt`User ${userId} failed action ${action}`);
```

---

## Testing

Visit `/sentry-example-page` to test your Sentry integration with:
- Client-side errors
- Server-side errors
- Custom messages
- Performance tracking

Check your dashboard at https://tradesitegenie.sentry.io
