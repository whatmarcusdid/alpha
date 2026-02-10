# API Index

## Overview

This document catalogs all API routes in the TradeSiteGenie Dashboard, including authentication requirements, rate limiting, and request/response shapes. Routes are organized by domain (Stripe, Delivery Scout, Webhooks, etc.).

---

## Stripe & Subscription Management APIs

| Route | Method | Purpose | Auth Type | Rate Limiting | Source File |
|-------|--------|---------|-----------|---------------|-------------|
| `/api/stripe/upgrade-subscription` | POST | Upgrade user to higher subscription tier | Firebase Token | checkoutLimiter (10/min) | `/app/api/stripe/upgrade-subscription/route.ts` |
| `/api/stripe/downgrade-subscription` | POST | Downgrade user to lower subscription tier | Firebase Token | generalLimiter (60/min) | `/app/api/stripe/downgrade-subscription/route.ts` |
| `/api/stripe/cancel-subscription` | POST | Cancel user's subscription (at period end) | Firebase Token | generalLimiter (60/min) | `/app/api/stripe/cancel-subscription/route.ts` |
| `/api/stripe/reactivate-subscription` | POST | Reactivate a canceled subscription | Firebase Token | generalLimiter (60/min) | `/app/api/stripe/reactivate-subscription/route.ts` |
| `/api/stripe/downgrade-to-safety-net` | POST | Downgrade to minimal Safety Net plan | Firebase Token | generalLimiter (60/min) | `/app/api/stripe/downgrade-to-safety-net/route.ts` |
| `/api/stripe/switch-to-safety-net` | POST | Switch to Safety Net plan | Firebase Token | checkoutLimiter (10/min) | `/app/api/stripe/switch-to-safety-net/route.ts` |
| `/api/stripe/preview-proration` | POST | Preview upgrade/downgrade cost before applying | Firebase Token | generalLimiter (60/min) | `/app/api/stripe/preview-proration/route.ts` |

### Upgrade Subscription

**Request Schema:**
```typescript
{
  newTier: 'essential' | 'advanced' | 'premium'  // Required
}
```

**Response (Success):**
```typescript
{
  success: true,
  message: string,
  newTier: string,
  renewalDate: string  // ISO timestamp
}
```

**Response (Error):**
```typescript
{
  success: false,
  error: string
}
```

**Detailed docs:** [PRD-IMPLEMENTATION-STATUS.md](./PRD-IMPLEMENTATION-STATUS.md)

---

### Preview Proration

**Request Schema:**
```typescript
{
  newTier: 'essential' | 'advanced' | 'premium'  // Required
}
```

**Response (Success):**
```typescript
{
  success: true,
  preview: {
    amountDue: number,        // Amount charged today (or 0 for downgrades)
    credit: number,           // Credit applied (for downgrades)
    subtotal: number,         // New plan price
    prorationCredit: number,  // Credit from unused current plan
    tax: number,              // Tax if applicable
    isUpgrade: boolean,
    isDowngrade: boolean,
    renewalDate: string,      // ISO timestamp
    lineItems: Array<{
      description: string,
      amount: number
    }>
  }
}
```

**Detailed docs:** [preview-proration-api.md](./preview-proration-api.md)

---

## Payment Method Management APIs

| Route | Method | Purpose | Auth Type | Rate Limiting | Source File |
|-------|--------|---------|-----------|---------------|-------------|
| `/api/stripe/create-setup-intent` | POST | Create Stripe SetupIntent for payment form | Firebase Token | checkoutLimiter (10/min) | `/app/api/stripe/create-setup-intent/route.ts` |
| `/api/stripe/attach-payment-method` | POST | Attach payment method to customer and store in Firestore | Firebase Token | checkoutLimiter (10/min) | `/app/api/stripe/attach-payment-method/route.ts` |

### Create Setup Intent

**Request:** No body required (userId from auth token)

**Response (Success):**
```typescript
{
  clientSecret: string  // Stripe SetupIntent client secret
}
```

**Response (Error - No Subscription):**
```typescript
{
  error: 'No active subscription found. Please subscribe to a plan first.',
  code: 'NO_SUBSCRIPTION'
}
```

**Detailed docs:** [create-setup-intent-cleanup.md](./create-setup-intent-cleanup.md)

---

### Attach Payment Method

**Request Schema:**
```typescript
{
  paymentMethodId: string  // Required - Stripe payment method ID (pm_xxx)
}
```

**Response (Success):**
```typescript
{
  success: true,
  message: string,
  brand: string,   // e.g., "visa"
  last4: string    // e.g., "4242"
}
```

**Detailed docs:** [ATTACH_PAYMENT_METHOD_API.md](../ATTACH_PAYMENT_METHOD_API.md)

---

## Billing & Invoice APIs

| Route | Method | Purpose | Auth Type | Rate Limiting | Source File |
|-------|--------|---------|-----------|---------------|-------------|
| `/api/stripe/get-invoices` | GET | Retrieve user's billing history from Stripe | Firebase Token | generalLimiter (60/min) | `/app/api/stripe/get-invoices/route.ts` |
| `/api/stripe/get-session-details` | POST | Get Stripe checkout session details | Firebase Token | generalLimiter (60/min) | `/app/api/stripe/get-session-details/route.ts` |
| `/api/stripe/get-subscription-details` | GET | Get current subscription details | Firebase Token | generalLimiter (60/min) | `/app/api/stripe/get-subscription-details/route.ts` |
| `/api/stripe/validate-coupon` | POST | Validate promo/coupon code | Public | couponLimiter (5/min) | `/app/api/stripe/validate-coupon/route.ts` |

### Get Invoices

**Request:** No body required (userId from auth token)

**Response (Success):**
```typescript
{
  invoices: Array<{
    id: string,
    orderId: string,           // e.g., "#TSG-12345"
    description: string,
    date: string,              // MM-DD-YYYY
    amount: string,            // e.g., "$2,999.00"
    status: 'completed' | 'pending' | 'failed',
    paymentMethod: string,     // e.g., "•••• 4242"
    invoiceUrl: string         // Stripe hosted invoice URL
  }>
}
```

**Detailed docs:** [get-invoices-api.md](./get-invoices-api.md)

---

### Validate Coupon

**Request Schema:**
```typescript
{
  couponCode: string  // Required
}
```

**Response (Valid Coupon):**
```typescript
{
  valid: true,
  id: string,
  percentOff: number | null,
  amountOff: number | null,
  duration: 'once' | 'repeating' | 'forever',
  durationInMonths: number | null,
  name: string | null
}
```

**Response (Invalid Coupon):**
```typescript
{
  valid: false,
  error: string
}
```

**Note:** This is a **public** endpoint with aggressive rate limiting (5/min) to prevent brute force enumeration of coupon codes.

---

## Checkout & Subscription Creation

| Route | Method | Purpose | Auth Type | Rate Limiting | Source File |
|-------|--------|---------|-----------|---------------|-------------|
| `/api/checkout/create-subscription` | POST | Create new Stripe subscription | Firebase Token | checkoutLimiter (10/min) | `/app/api/checkout/create-subscription/route.ts` |
| `/api/checkout` | POST | Create Stripe checkout session | TBD | checkoutLimiter (10/min) | `/app/api/checkout/route.ts` |

### Create Subscription

**Request Schema:**
```typescript
{
  email: string,                         // Required
  tier: 'essential' | 'advanced' | 'premium',  // Required
  billingCycle: 'monthly' | 'yearly',    // Required
  couponCode?: string,                   // Optional
  paymentMethodId?: string               // Optional
}
```

**Response (Success):**
```typescript
{
  success: true,
  subscriptionId: string  // Stripe subscription ID
}
```

---

## Pending Subscriptions API

| Route | Method | Purpose | Auth Type | Rate Limiting | Source File |
|-------|--------|---------|-----------|---------------|-------------|
| `/api/stripe/claim-pending-subscription` | POST | Claim subscription created before signup | Firebase Token | generalLimiter (60/min) | `/app/api/stripe/claim-pending-subscription/route.ts` |

### Claim Pending Subscription

**Request Schema:**
```typescript
{
  email: string  // Required - normalized (lowercase, trimmed)
}
```

**Response (Found & Claimed):**
```typescript
{
  success: true,
  subscription: {
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    tier: string,
    billingCycle: string,
    amount: number
  }
}
```

**Response (Not Found or Already Claimed):**
```typescript
{
  success: false,
  message: string,
  subscription: null
}
```

**Detailed docs:** [claim-pending-subscription-api.md](./claim-pending-subscription-api.md), [PENDING-SUBSCRIPTIONS-COMPLETE.md](./PENDING-SUBSCRIPTIONS-COMPLETE.md)

---

## Delivery Scout API

| Route | Method | Purpose | Auth Type | Rate Limiting | Source File |
|-------|--------|---------|-----------|---------------|-------------|
| `/api/delivery-scout` | POST | Automated customer data updates from Lindy AI | API Key | None (TBD) | `/app/api/delivery-scout/route.ts` |

### Delivery Scout

**Authentication:** Bearer token with `DELIVERY_SCOUT_API_KEY` environment variable.

**Request Schema:**
```typescript
{
  action: 'update_meeting' | 'update_metrics' | 'update_company_info' | 
          'update_site' | 'update_ticket' | 'add_site' | 'add_report' | 
          'create_ticket' | 'create_user',  // Required
  userId: string,                            // Required
  data: object                               // Required - shape varies by action
}
```

**Supported Actions:**

| Action | Purpose | Idempotent | Returns ID |
|--------|---------|------------|------------|
| `update_meeting` | Update next meeting info | ✅ Yes | No |
| `update_metrics` | Update dashboard metrics | ✅ Yes | No |
| `update_company_info` | Update company details | ✅ Yes | No |
| `update_site` | Update existing site | ✅ Yes | No |
| `update_ticket` | Update existing ticket | ✅ Yes | No |
| `add_site` | Create new site | ❌ No | ✅ siteId |
| `add_report` | Create new report | ❌ No | ✅ reportId |
| `create_ticket` | Create new support ticket | ❌ No | ✅ ticketId |
| `create_user` | Create new user account | ❌ No | ✅ userId |

**Response (Success):**
```typescript
{
  success: true,
  message: string,
  [id]: string  // For add/create actions: siteId, reportId, ticketId, or userId
}
```

**Response (Error):**
```typescript
{
  success: false,
  error: string
}
```

**Detailed docs:** [delivery-scout-api.md](./delivery-scout-api.md), [delivery-scout-handlers.md](./delivery-scout-handlers.md)

---

## Webhook Endpoints

| Route | Method | Purpose | Auth Type | Rate Limiting | Source File |
|-------|--------|---------|-----------|---------------|-------------|
| `/api/webhooks/stripe` | POST | Receive Stripe webhook events | Stripe Signature | webhookLimiter (20/min) | `/app/api/webhooks/stripe/route.ts` |

### Stripe Webhook

**Authentication:** Stripe webhook signature verification using `STRIPE_WEBHOOK_SECRET`.

**Handled Events:**
- `checkout.session.completed` - New subscription created
- `customer.subscription.created` - Subscription created
- `customer.subscription.updated` - Subscription modified
- `customer.subscription.deleted` - Subscription ended

**Request:** Standard Stripe webhook payload (verified by signature)

**Response:**
- `200 OK` - Event processed successfully
- `400 Bad Request` - Invalid signature
- `500 Internal Server Error` - Processing error (Stripe will retry)

**Special behavior:** If user not found during `checkout.session.completed`, creates pending subscription in `pending_subscriptions` collection.

**Detailed docs:** [pending-subscriptions-system.md](./pending-subscriptions-system.md)

---

## Notification Endpoints

| Route | Method | Purpose | Auth Type | Rate Limiting | Source File |
|-------|--------|---------|-----------|---------------|-------------|
| `/api/notifications/new-user` | POST | Send Slack notification for new user signup | Internal (no auth) | None | `/app/api/notifications/new-user/route.ts` |

### New User Notification

**Request Schema:**
```typescript
{
  userId: string,       // Required
  email: string,        // Required
  displayName: string,  // Required
  tier: 'essential' | 'advanced' | 'premium',  // Required
  billingCycle: 'monthly' | 'yearly',          // Required
  amount: number        // Required
}
```

**Response (Success):**
```typescript
{
  success: true,
  message: string
}
```

**Slack Channel:** `#tsg-support`

**Detailed docs:** [slack-notification-api.md](./slack-notification-api.md)

---

## Test/Debug Endpoints

| Route | Method | Purpose | Auth Type | Rate Limiting | Source File |
|-------|--------|---------|-----------|---------------|-------------|
| `/api/hello` | GET | Health check endpoint | Public | None | `/app/api/hello/route.ts` |
| `/api/test-sentry-error` | GET | Test Sentry error tracking | Public | None | `/app/api/test-sentry-error/route.ts` |
| `/api/sentry-example-api` | GET | Example Sentry integration | Public | None | `/app/api/sentry-example-api/route.ts` |
| `/api/get-og-image` | GET | Generate Open Graph image | Public | None | `/app/api/get-og-image/route.ts` |

**Note:** Test endpoints should be disabled or protected in production.

---

## Legacy/Deprecated Endpoints

| Route | Status | Notes |
|-------|--------|-------|
| `/api/zapier-webhook` | ⚠️ Security Risk | Completely open, no authentication. Recommend removal or signature verification. |

---

## How to Add a New API Endpoint

### Planning Checklist

- [ ] **Define purpose:** What does this endpoint do?
- [ ] **Choose auth type:** Firebase token, API key, public, or webhook signature?
- [ ] **Determine rate limit:** Which limiter applies (checkout, coupon, general)?
- [ ] **Design request schema:** Use Zod for validation
- [ ] **Design response schema:** Success and error shapes
- [ ] **Identify external calls:** Stripe, Firebase, Firestore, Sentry?

### Implementation Checklist

#### 1. Create Route File

```bash
# Create new route
touch app/api/[domain]/[operation]/route.ts
```

#### 2. Implement with Middleware

```typescript
// app/api/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import * as Sentry from '@sentry/nextjs';

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    return await Sentry.startSpan(
      {
        op: 'http.server',
        name: 'POST /api/example',
        attributes: { userId }
      },
      async () => {
        try {
          const body = await req.json();
          
          // Validate with Zod (optional but recommended)
          // const validated = schema.parse(body);
          
          // Your business logic here
          
          return NextResponse.json({ success: true });
        } catch (error) {
          Sentry.captureException(error);
          return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
          );
        }
      }
    );
  },
  generalLimiter
);
```

#### 3. Add Zod Validation (Optional)

```typescript
// lib/validation/schemas.ts (or create if needed)
import { z } from 'zod';

export const exampleSchema = z.object({
  field1: z.string().min(1),
  field2: z.number().positive(),
});
```

#### 4. Update This Index

- [ ] Add route to appropriate table above
- [ ] Document request/response schemas
- [ ] Link to detailed docs if creating separate file

#### 5. Add Tests

```typescript
// scripts/test-example.ts (if needed)
// Or add to existing test suite
```

#### 6. Update Related Docs

- [ ] Update `ARCHITECTURE.md` if new component/pattern
- [ ] Update `DATA_MODELS.md` if new Firestore fields
- [ ] Update `SECURITY_MODEL.md` if new auth pattern
- [ ] Update `CHANGELOG.md` with new endpoint

---

## API Response Standards

### Success Response Pattern

```typescript
{
  success: true,
  message?: string,      // Optional success message
  data?: any,            // Optional response data
  [key]?: any            // Additional fields as needed
}
```

### Error Response Pattern

```typescript
{
  success: false,
  error: string,         // User-friendly error message
  code?: string,         // Error code (e.g., 'NO_SUBSCRIPTION')
  details?: any          // Additional error details (dev mode only)
}
```

### HTTP Status Codes

- `200 OK` - Success
- `400 Bad Request` - Invalid request (validation failure, missing required fields)
- `401 Unauthorized` - Authentication failed (no token, invalid token, expired token)
- `403 Forbidden` - Authorization failed (user not allowed to perform action)
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error (logged to Sentry)

---

## Rate Limiting Details

All rate limits are IP-based and use sliding window algorithm via Upstash Redis.

**If Redis unavailable:** Rate limiting is **disabled** (allows all requests, logs warning).

**Headers included in rate-limited responses:**
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining in window
- `X-RateLimit-Reset` - Unix timestamp when limit resets
- `Retry-After` - Seconds until retry (only when limit exceeded)

**Configuration:** See `/lib/middleware/rateLimiting.ts`

---

## Cross-References

- **Middleware usage:** [/lib/middleware/USAGE.md](../lib/middleware/USAGE.md)
- **Middleware implementation:** [/lib/middleware/IMPLEMENTATION_STATUS.md](../lib/middleware/IMPLEMENTATION_STATUS.md)
- **Security model:** [SECURITY_MODEL.md](./SECURITY_MODEL.md)
- **Data models:** [DATA_MODELS.md](./DATA_MODELS.md)
- **Architecture:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **Troubleshooting:** [ERRORS_AND_TROUBLESHOOTING.md](./ERRORS_AND_TROUBLESHOOTING.md)

---

**Last Updated:** February 2026  
**API Version:** 1.0  
**Next Review:** When adding new API domains or changing auth patterns
