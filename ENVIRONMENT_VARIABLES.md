# Book Service — Environment Variables

This document supplements `docs/ENVIRONMENT_VARIABLES.md` with variables required for the **Book Service Site Fix** checkout flow.

## Book Service Stripe Price IDs

| Variable | Purpose | Where to find | Required |
|---|---|---|---|
| `STRIPE_PRICE_SPEED_FIX` | Stripe Price ID for Speed Fix ($799 one-time) | [Stripe Dashboard](https://dashboard.stripe.com/products) → Speed Fix product → Pricing | **Yes** (production) |
| `STRIPE_PRICE_SECURITY_FIX` | Stripe Price ID for Security Fix ($999 one-time) | Stripe Dashboard → Security Fix product → Pricing | **Yes** (production) |
| `STRIPE_PRICE_SEO_FIX` | Stripe Price ID for SEO & AI Visibility Fix ($679 one-time) | Stripe Dashboard → SEO Fix product → Pricing | **Yes** (production) |
| `STRIPE_PRICE_FULL_BUNDLE` | Stripe Price ID for Full Bundle (backend checkout only) | Stripe Dashboard → Full Bundle product → Pricing | **Yes** (production) |

All four prices must be **one-time** (`mode: payment`), not recurring subscriptions.

## Book Service Loops Email

| Variable | Purpose | Where to find | Required |
|---|---|---|---|
| `LOOPS_SITE_FIX_PAYMENT_CONFIRMED_TEMPLATE_ID` | Transactional email sent after Site Fix payment succeeds | [Loops Dashboard](https://app.loops.so) → Transactional → Site Fix Payment Confirmed template | **Yes** (production) |

**Merge fields used by the template:** `firstName`, `packageName`, `orderId`, `amount`, `signupUrl`

## Book Service Onboarding Loops Email

| Variable | Purpose | Where to find | Required |
|---|---|---|---|
| `LOOPS_SITE_FIX_ORDER_CONFIRMED_TEMPLATE_ID` | Sent after Site Fix account is created (post-signup) | Loops Dashboard → Transactional → Site Fix Order Confirmed | **Yes** (production) |
| `LOOPS_SITE_FIX_ACCESS_REMINDER_TEMPLATE_ID` | Reminder to submit website access (cron — not wired yet) | Loops Dashboard → Transactional → Site Fix Access Reminder | **Yes** (production) |
| `LOOPS_SITE_FIX_DELIVERY_READY_TEMPLATE_ID` | Sent when access is submitted and onboarding is complete | Loops Dashboard → Transactional → Site Fix Delivery Ready | **Yes** (production) |

**Merge fields — account created:** `firstName`, `orderId`, `packageNames`, `signupUrl` (confirm-details URL)

**Merge fields — access reminder:** `firstName`, `orderId`, `accessUrl`

**Merge fields — delivery ready:** `firstName`, `orderId`, `packageNames`

## Book Service Encryption

| Variable | Purpose | Where to find | Required |
|---|---|---|---|
| `SITE_FIX_ENCRYPTION_KEY` | 32-byte AES-256-GCM key (base64-encoded) for encrypting access credentials server-side | Generate with `openssl rand -base64 32` | **Yes** (production) |

## Related (existing)

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Server-side Stripe API (checkout session creation, webhooks) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_BASE_URL` | Success/cancel URLs and signup links |
| `LOOPS_API_KEY` | Loops API authentication (shared with subscription emails) |
