# API Handler Middleware - Complete Usage Guide

## Overview

The API handler middleware provides three composable wrapper functions that eliminate boilerplate code in API routes:

1. **`withAuthAndRateLimit`** - Full protection (auth + rate limiting)
2. **`withRateLimit`** - Rate limiting only (public endpoints)
3. **`withAuth`** - Authentication only (no rate limiting)

## Quick Comparison

### Before (Old Pattern)
```typescript
export async function POST(request: NextRequest) {
  try {
    // 15+ lines of auth boilerplate
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];
    if (!adminAuth) {
      return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
    }
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    // Finally, actual business logic
    const { reason } = await request.json();
    // ... 
  } catch (error: any) {
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Token expired' }, { status: 401 });
    }
    // ...
  }
}
```

### After (With Middleware)
```typescript
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    // userId is already verified and available!
    const { reason } = await req.json();
    // Your business logic here
    return NextResponse.json({ success: true });
  },
  generalLimiter
);
```

**Result:** 3 lines instead of 15+, cleaner code, consistent security.

---

## Use Case 1: Protected Routes (Auth + Rate Limiting)

**When to use:** Routes that require authentication and need abuse protection.

**Examples:** User subscriptions, payment operations, profile updates.

```typescript
// app/api/stripe/cancel-subscription/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { adminDb } from '@/lib/firebase/admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    // userId is already authenticated - no auth checks needed!
    const { reason } = await req.json();

    // Get user's subscription data
    if (!adminDb) {
      return NextResponse.json({ error: 'Firestore not initialized' }, { status: 500 });
    }
    
    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const subscriptionId = userData?.subscription?.stripeSubscriptionId;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    // Cancel subscription in Stripe
    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: { cancellation_reason: reason || 'No reason provided' },
    });

    const expirationDate = new Date(
      ((canceledSubscription as any).current_period_end as number) * 1000
    );

    // Update Firestore
    await adminDb.collection('users').doc(userId).update({
      'subscription.status': 'canceled',
      'subscription.canceledAt': new Date().toISOString(),
      'subscription.expiresAt': expirationDate.toISOString(),
      'subscription.cancellationReason': reason || 'No reason provided',
      'subscription.updatedAt': new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Subscription canceled successfully',
      expiresAt: expirationDate.toISOString(),
    });
  },
  generalLimiter // 60 requests per minute per IP
);
```

---

## Use Case 2: Public Routes (Rate Limiting Only)

**When to use:** Public endpoints that don't require authentication but need abuse protection.

**Examples:** Coupon validation, webhook endpoints, public data queries.

```typescript
// app/api/stripe/validate-coupon/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/middleware/apiHandler';
import { couponLimiter } from '@/lib/middleware/rateLimiting';
import Stripe from 'stripe';

export const POST = withRateLimit(
  async (req) => {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
    const { couponCode } = await req.json();

    // Validate required fields
    if (!couponCode || typeof couponCode !== 'string') {
      return NextResponse.json(
        { valid: false, error: 'Coupon code is required' },
        { status: 400 }
      );
    }

    try {
      // Retrieve the coupon from Stripe
      const coupon = await stripe.coupons.retrieve(couponCode.trim().toUpperCase());

      if (!coupon || coupon.valid === false) {
        return NextResponse.json({
          valid: false,
          error: 'This promo code is invalid or has expired',
        });
      }

      return NextResponse.json({
        valid: true,
        id: coupon.id,
        percentOff: coupon.percent_off || null,
        amountOff: coupon.amount_off || null,
        duration: coupon.duration,
        durationInMonths: coupon.duration_in_months || null,
        name: coupon.name || null,
      });
    } catch (stripeError: any) {
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json({
          valid: false,
          error: 'Invalid promo code',
        });
      }
      throw stripeError;
    }
  },
  couponLimiter // 5 requests per minute per IP (prevents brute force)
);
```

---

## Use Case 3: Checkout Routes (Custom Rate Limiter)

**When to use:** Critical operations that need specific rate limits.

```typescript
// app/api/checkout/create-subscription/route.ts
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { checkoutLimiter } from '@/lib/middleware/rateLimiting';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { PRICING } from '@/lib/stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    // Check if Firebase Admin is initialized
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // userId is already verified by middleware
    const { email, tier, billingCycle, couponCode, paymentMethodId } = await req.json();

    // Validate required fields
    if (!email || !tier || !billingCycle) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get Stripe price ID for the tier
    const pricingData = PRICING[tier as keyof typeof PRICING];
    if (!pricingData) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier' },
        { status: 400 }
      );
    }

    // ... rest of your subscription creation logic
    
    return NextResponse.json({ success: true, subscriptionId: 'sub_123' });
  },
  checkoutLimiter // 10 requests per minute (stricter limit for checkout)
);
```

---

## Use Case 4: Auth Only (No Rate Limiting)

**When to use:** Internal endpoints or when rate limiting is handled elsewhere.

```typescript
// app/api/user/profile/route.ts
import { withAuth } from '@/lib/middleware/apiHandler';
import { adminDb } from '@/lib/firebase/admin';

export const GET = withAuth(
  async (req, { userId }) => {
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: userDoc.data() });
  }
);
```

---

## Available Rate Limiters

Import from `@/lib/middleware/rateLimiting`:

| Limiter | Rate | Use Case |
|---------|------|----------|
| `checkoutLimiter` | 10/min | Stripe checkout, subscription creation |
| `couponLimiter` | 5/min | Coupon validation (prevent brute force) |
| `webhookLimiter` | 20/min | Webhook endpoints |
| `generalLimiter` | 60/min | Default for all other routes |

---

## Error Responses

### Rate Limit Exceeded (429)
```json
{
  "error": "Too many requests. Please try again in 45 seconds.",
  "retryAfter": 45
}
```

Headers included:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds until retry (only when exceeded)

### Authentication Failed (401)
```json
{
  "error": "Unauthorized - No authentication token provided"
}
```

### Server Error (500)
```json
{
  "error": "An unexpected error occurred. Please try again later."
}
```

In development mode, includes `details` field with error message.

---

## Migration Checklist

When migrating an existing route:

1. **Identify the route type:**
   - [ ] Needs auth + rate limiting? → Use `withAuthAndRateLimit`
   - [ ] Public but needs rate limiting? → Use `withRateLimit`
   - [ ] Only needs auth? → Use `withAuth`

2. **Remove old auth code:**
   - [ ] Remove `authHeader` extraction
   - [ ] Remove `adminAuth.verifyIdToken()` call
   - [ ] Remove auth error handling
   - [ ] Remove `userId` extraction

3. **Choose appropriate rate limiter:**
   - [ ] Checkout operations → `checkoutLimiter`
   - [ ] Coupon validation → `couponLimiter`
   - [ ] Webhooks → `webhookLimiter`
   - [ ] Everything else → `generalLimiter`

4. **Update handler signature:**
   - [ ] Change from `export async function POST(request)` to `export const POST = withAuthAndRateLimit(...)`
   - [ ] Update function to receive `(req, { userId })` instead of `(request)`
   - [ ] Remove try-catch wrapper (middleware handles it)

5. **Test the route:**
   - [ ] Verify authentication works
   - [ ] Verify rate limiting works
   - [ ] Verify business logic unchanged

---

## Environment Variables Required

Add to `.env.local`:

```bash
# Upstash Redis for rate limiting
UPSTASH_REDIS_REST_URL=https://your-redis-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

**Note:** If these are not set, rate limiting will be disabled (requests will be allowed). The app will log a warning but continue to function.

---

## Benefits

✅ **Less Code:** 3 lines instead of 15+ per route
✅ **Consistent Security:** Same auth/rate limiting logic everywhere
✅ **Better Error Handling:** Centralized error responses
✅ **Type Safety:** Full TypeScript support
✅ **Composable:** Mix and match auth, rate limiting, or both
✅ **Maintainable:** Change security logic in one place
✅ **Production Ready:** Handles edge cases, provides clear errors
