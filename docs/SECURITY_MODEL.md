# Security Model

## Overview

TradeSiteGenie Dashboard implements defense-in-depth security with multiple layers: authentication, authorization, rate limiting, input validation, webhook verification, and monitoring. This document defines the security model, trust boundaries, and security review process.

---

## Authentication Model

### By Endpoint Type

| Endpoint Type | Authentication Method | Token Format | Enforcement |
|---------------|----------------------|--------------|-------------|
| **Protected User APIs** | Firebase ID Token | `Authorization: Bearer <token>` | Required via middleware |
| **Delivery Scout API** | API Key | `Authorization: Bearer <api-key>` | Manual check in route |
| **Stripe Webhooks** | Webhook Signature | `Stripe-Signature` header | Verified with Stripe SDK |
| **Public APIs** | None | N/A | Rate-limited only |
| **Auth APIs** (password reset) | None | N/A | In-memory: 5 req/hour per email |

---

### Firebase ID Token Authentication

**Used for:** All user-facing API operations (subscriptions, profile, payment methods)

**Implementation:**
```typescript
// Via middleware
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    // userId is verified and available
    // User can only access their own data
  },
  generalLimiter
);
```

**Token lifecycle:**
1. User signs in → Firebase issues JWT token
2. Frontend stores token in memory
3. Token sent with each API request: `Authorization: Bearer <token>`
4. Server verifies token with Firebase Admin SDK
5. Extracts `userId` from verified token
6. Token expires after 1 hour → Frontend refreshes automatically

**Security guarantees:**
- ✅ Token is cryptographically signed by Firebase
- ✅ Cannot be forged without Firebase private key
- ✅ Includes user ID in claims (verified, not user-supplied)
- ✅ Expires after 1 hour (limits damage if stolen)
- ✅ Can be revoked by Firebase Admin SDK

**Vulnerabilities:**
- ⚠️ Tokens stored in browser memory (XSS risk if present)
- ⚠️ Tokens sent over network (use HTTPS only)

---

### API Key Authentication (Delivery Scout)

**Used for:** `/api/delivery-scout` endpoint (Lindy AI integration)

**Implementation:**
```typescript
const authHeader = req.headers.get('authorization');
if (!authHeader?.startsWith('Bearer ')) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

const providedKey = authHeader.split('Bearer ')[1];
const validKey = process.env.DELIVERY_SCOUT_API_KEY;

if (providedKey !== validKey) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

**Key management:**
- Generated with: `crypto.randomBytes(32).toString('hex')` (64 chars)
- Stored in environment variable (not in database)
- Single key for all Delivery Scout requests
- No expiration (rotate manually if compromised)

**Security guarantees:**
- ✅ 64-character random key (high entropy)
- ✅ Simple comparison (no timing attacks)
- ✅ Environment variable (not hardcoded)

**Vulnerabilities:**
- ⚠️ Single shared key (compromise affects all agents)
- ⚠️ No automatic rotation
- ⚠️ No per-agent keys (all Lindy AI instances use same key)

**Future improvement:** Implement per-agent API keys with database storage and automatic rotation.

---

### Webhook Signature Verification

**Used for:** `/api/webhooks/stripe` (Stripe event notifications)

**Implementation:**
```typescript
const signature = req.headers.get('stripe-signature');
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

const event = stripe.webhooks.constructEvent(
  rawBody,
  signature!,
  webhookSecret!
);
// Event is verified - safe to process
```

**Security guarantees:**
- ✅ Cryptographic signature by Stripe
- ✅ Cannot be forged without webhook secret
- ✅ Prevents replay attacks (timestamp validation)
- ✅ Ensures event came from Stripe, not attacker

**Vulnerabilities:**
- ⚠️ If `STRIPE_WEBHOOK_SECRET` leaked, attacker can forge events
- ⚠️ No additional rate limiting on webhook endpoint currently

**Prevention:**
- Keep webhook secret in secure environment variables
- Rotate webhook secret if compromised (update in Stripe Dashboard and server)

---

## Authorization Model

### Principle: User Data Isolation

**Rule:** Users can ONLY access their own data.

**Enforcement:**
1. API extracts `userId` from verified Firebase token (not request body)
2. All Firestore queries scoped to that `userId`:
   ```typescript
   const userDoc = await adminDb.collection('users').doc(userId).get();
   // Can only access document matching token's userId
   ```

**Violation example (NEVER DO THIS):**
```typescript
// ❌ WRONG - userId from request body
const { userId } = await req.json();
const userDoc = await adminDb.collection('users').doc(userId).get();
// Attacker can read any user's data by changing userId!
```

**Correct pattern (ALWAYS DO THIS):**
```typescript
// ✅ CORRECT - userId from verified token
export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {  // userId from middleware, verified
    const userDoc = await adminDb.collection('users').doc(userId).get();
    // Can only access own data
  },
  generalLimiter
);
```

---

### Admin Operations

**Current state:** No admin panel or elevated privileges implemented.

**Future consideration:** 
- Add `isAdmin` flag to user documents
- Create admin middleware that checks for admin role
- Limit admin operations to specific IP ranges

**TBD:** Admin authentication and authorization model.

---

## Rate Limiting Strategy

### Implementation

**Technology:** Upstash Redis with sliding window algorithm

**Key:** IP address (extracted from `x-forwarded-for` or `x-real-ip` headers)

**Limiters and rationale:**

| Limiter | Rate | Rationale |
|---------|------|-----------|
| `checkoutLimiter` | 10/min | Prevents subscription spam, checkout abuse |
| `couponLimiter` | 5/min | Prevents brute force enumeration of coupon codes |
| `webhookLimiter` | 20/min | Allows Stripe burst traffic but prevents abuse |
| `generalLimiter` | 60/min | Default rate for authenticated operations |

---

### Rate Limit Bypass Scenarios

**If Upstash Redis unavailable:**
- Rate limiting is **disabled**
- Warning logged to console
- All requests allowed through

**Reason:** Graceful degradation for development, but unacceptable in production.

**Mitigation:**
- ✅ Monitor Upstash Redis availability
- ✅ Alert on rate limiting disabled warning
- ⚠️ TBD: Fail-closed mode (reject all requests if Redis down)

---

### Rate Limiting Exemptions

**No exemptions currently implemented.**

**Future consideration:**
- Whitelist internal IP addresses
- Whitelist specific user IDs (for testing/admin)
- Higher limits for premium tier users

---

## Secrets Management

### Environment Variables

**Storage:**
- **Local development:** `.env.local` file (git-ignored)
- **Production:** Vercel Environment Variables (encrypted at rest)

**Access control:**
- Vercel environment variables: Team members with deploy permission
- Local .env.local: Developer's machine (protect with disk encryption)

**Secrets categories:**

**Highly sensitive (rotate if exposed):**
- `STRIPE_SECRET_KEY`
- `FIREBASE_PRIVATE_KEY`
- `DELIVERY_SCOUT_API_KEY`
- `UPSTASH_REDIS_REST_TOKEN`

**Moderately sensitive:**
- `STRIPE_WEBHOOK_SECRET`
- `FIREBASE_CLIENT_EMAIL`

**Public (safe to expose):**
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- All `NEXT_PUBLIC_FIREBASE_*` variables

---

### Secret Rotation Procedure

**When to rotate:**
- Secret potentially compromised (leaked in logs, committed to git)
- Quarterly rotation for high-security secrets (Stripe secret key)
- Team member leaves with access to secrets

**Steps:**

1. **Generate new secret** in service provider dashboard
2. **Add to environment variables** in Vercel (don't delete old yet)
3. **Deploy with new secret**
4. **Verify deployment works**
5. **Delete old secret** from service provider
6. **Remove old secret** from Vercel

**Downtime:** Zero if done correctly (both old and new work during transition).

---

## Input Validation Strategy

### Validation Layers

**Layer 1: Client-Side (UI)**
- HTML5 validation attributes
- React form validation
- User-friendly error messages
- Real-time feedback

**Purpose:** UX improvement, not security (can be bypassed)

---

**Layer 2: Server-Side Schema Validation**

**Implementation:** Zod schemas for runtime validation

**Location:** `/lib/validation` (where implemented)

**Example:**
```typescript
import { z } from 'zod';

const upgradeSchema = z.object({
  newTier: z.enum(['essential', 'advanced', 'premium']),
});

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    const body = await req.json();
    const validated = upgradeSchema.parse(body); // Throws if invalid
    // Use validated.newTier (guaranteed type-safe)
  },
  generalLimiter
);
```

**Coverage:**
- ✅ Delivery Scout API (all actions)
- ⚠️ Some Stripe endpoints (partial coverage)
- ❌ Many endpoints lack validation (rely on type checking only)

**Future improvement:** Add Zod validation to all POST/PUT endpoints.

---

**Layer 3: Type System (TypeScript)**

**Purpose:** Compile-time type safety

**Enforcement:** `npx tsc --noEmit` before deployment

**Limitations:**
- Only catches type errors at compile time
- Runtime data (API responses, user input) not guaranteed
- Can be bypassed with `any` type (avoid)

---

### Validation Best Practices

**DO:**
- ✅ Validate ALL user inputs on server
- ✅ Use Zod schemas for complex objects
- ✅ Whitelist allowed values (enums)
- ✅ Sanitize strings (trim, lowercase where appropriate)
- ✅ Validate numeric ranges (positive numbers, max values)
- ✅ Validate email format
- ✅ Reject unexpected fields (strict parsing)

**DON'T:**
- ❌ Trust client-side validation alone
- ❌ Use `any` type to bypass validation
- ❌ Accept arbitrary JSON without schema
- ❌ Trust user-supplied IDs (use token-derived userId)

---

## Webhook Security

### Stripe Webhook Protection

**Layer 1: Signature Verification**
```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,
  signature!,
  webhookSecret!
);
// Verified - safe to process
```

**Layer 2: Rate Limiting**
- 20 requests per minute per IP
- Prevents abuse if signature secret leaked

**Layer 3: Idempotency**
- Process same event multiple times safely
- Use event ID to track processed events (TBD - not implemented)

**Future improvement:** Track processed event IDs in Redis/Firestore to prevent duplicate processing.

---

### Webhook Event Validation

**After signature verification, validate event data:**
```typescript
// Check event type is expected
const allowedEvents = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];

if (!allowedEvents.includes(event.type)) {
  return NextResponse.json({ received: false }, { status: 400 });
}

// Check required fields exist
if (!event.data.object.customer) {
  console.error('Missing customer ID in webhook event');
  return NextResponse.json({ error: 'Invalid event' }, { status: 400 });
}
```

---

## Security Review Checklist

Use this checklist when adding new features or reviewing code:

### API Route Security

- [ ] **Authentication required?** If yes, use `withAuthAndRateLimit` or `withAuth`
- [ ] **Rate limiting applied?** Choose appropriate limiter
- [ ] **Input validation?** Add Zod schema if accepting complex input
- [ ] **Authorization check?** Verify user can only access own data
- [ ] **Error handling?** Catch exceptions, log to Sentry, return safe errors
- [ ] **Sensitive data?** Never log secrets, PII, or full credit card numbers
- [ ] **Sentry tracking?** Wrap in `Sentry.startSpan` for observability

---

### Frontend Security

- [ ] **API token included?** Protected routes need `Authorization` header
- [ ] **XSS prevention?** Use React's built-in escaping (don't use `dangerouslySetInnerHTML`)
- [ ] **CSRF protection?** Next.js provides CSRF protection for POST requests
- [ ] **Sensitive data in logs?** Never console.log tokens, API keys, passwords
- [ ] **Environment variables?** Use `NEXT_PUBLIC_` prefix only for truly public values

---

### Data Security

- [ ] **User data isolation?** Queries scoped to verified userId
- [ ] **Firestore rules?** Verify Firebase Console rules match expectations
- [ ] **Encryption at rest?** Firebase/Stripe handle this automatically
- [ ] **Encryption in transit?** HTTPS enforced (Vercel provides SSL)
- [ ] **PII handling?** Minimize collection, redact in logs, comply with regulations

---

### Webhook Security

- [ ] **Signature verification?** Use provider's SDK to verify (Stripe, etc.)
- [ ] **Rate limiting?** Apply appropriate limiter
- [ ] **Idempotency?** Handle duplicate events safely
- [ ] **Event validation?** Verify event type and required fields

---

### Dependency Security

- [ ] **Audit dependencies:** Run `npm audit` before deployment
- [ ] **Update regularly:** Monthly dependency updates (security patches)
- [ ] **Lock file committed:** Ensure `package-lock.json` is in git
- [ ] **Review new dependencies:** Check GitHub stars, maintenance, security history

---

## Common Security Vulnerabilities (Prevented)

### ✅ SQL Injection

**Status:** Not applicable (using Firestore, no SQL)

**Prevention:** Firestore uses NoSQL with parameterized queries.

---

### ✅ CSRF (Cross-Site Request Forgery)

**Status:** Protected by Next.js

**Prevention:**
- Next.js App Router enforces CSRF protection on POST requests
- API routes check for valid origin

**Additional protection:**
- Firebase tokens are user-specific (can't be used cross-site)
- Rate limiting prevents automated CSRF attacks

---

### ✅ XSS (Cross-Site Scripting)

**Status:** Protected by React

**Prevention:**
- React automatically escapes all rendered content
- No use of `dangerouslySetInnerHTML` in codebase

**Additional protection:**
- Content Security Policy headers (managed in Cloudflare — see [Security Headers](#security-headers))
- Input sanitization on server

---

### ✅ Authentication Bypass

**Status:** Prevented via middleware

**Prevention:**
- All protected routes use `withAuthAndRateLimit` or `withAuth`
- Token verification via Firebase Admin SDK
- No routes accept userId from request body

**Historical vulnerability (FIXED):**
- `/api/stripe/upgrade-subscription` previously accepted userId in body
- **Fixed:** Now uses userId from verified token only

**Documentation:** [SECURITY_FIXES_APPLIED.md](../SECURITY_FIXES_APPLIED.md)

---

### ✅ Rate Limiting Bypass

**Status:** Prevented via Upstash Redis

**Prevention:**
- IP-based rate limiting on all sensitive endpoints
- Sliding window algorithm (harder to bypass)
- Different limits for different endpoint sensitivity

**Vulnerability if Redis unavailable:**
- ⚠️ Rate limiting disabled (all requests allowed)
- Warning logged but requests proceed
- **Mitigation:** Monitor Redis availability, alert on downtime

---

### ✅ Brute Force Attacks

**Status:** Prevented via aggressive rate limiting

**Coupon enumeration:**
- Limited to 5 requests/minute
- 10-character minimum coupon codes (large keyspace)
- Invalid coupons don't reveal valid patterns

**Password guessing:**
- Handled by Firebase Auth (built-in protections)
- Account lockout after failed attempts
- CAPTCHA for suspicious activity

---

### ⚠️ Information Disclosure

**Status:** Partially protected

**Prevented:**
- ✅ Errors don't expose stack traces (production mode)
- ✅ Sensitive fields truncated in logs
- ✅ Environment variables not exposed in client bundle

**Remaining risks:**
- ⚠️ Error messages sometimes too descriptive (e.g., "User not found" vs "Invalid credentials")
- ⚠️ API enumeration possible (valid endpoints return different errors)

**Future improvement:** Standardize error messages to avoid information leakage.

---

### ⚠️ Pending Subscription Takeover

**Scenario:** Attacker pays with victim's email, signs up with that email, claims subscription.

**Current mitigation:**
- Single-claim protection (can't claim twice)
- Audit trail (claimedBy, claimedAt)
- Sentry logging of claims

**Remaining risk:**
- ⚠️ Attacker who knows victim's email can create pending subscription
- ⚠️ If victim signs up first, attacker's payment creates unclaimed subscription

**Future improvement:**
- Email verification before claiming pending subscriptions
- Alert user if subscription exists for their email before signup
- Admin dashboard to review suspicious claims

---

## Secrets and PII Protection

### PII Categories

**PII collected:**
- Email addresses (required for authentication)
- Full names (user-provided)
- Billing addresses (Stripe checkout)
- Phone numbers (optional, if collected)

**PII storage:**
- Firestore: User documents (encrypted at rest by Google)
- Stripe: Customer data (encrypted at rest by Stripe)
- Logs: **Should never contain PII** (see redaction rules)

---

### Redaction Rules

**In Sentry/logs:**

```typescript
// ✅ CORRECT - Truncate customer IDs
Sentry.captureMessage('User updated', {
  extra: {
    customerId: customerId.substring(0, 10) + '...'  // Only first 10 chars
  }
});

// ✅ CORRECT - Don't log emails
console.log('User signed up'); // No email in log

// ❌ WRONG - Full customer ID
Sentry.captureMessage('User updated', {
  extra: { customerId }  // Full ID exposed
});

// ❌ WRONG - Email in log
console.log('User signed up:', email);  // Email exposed
```

**Automatic redaction (in Sentry config):**
- Emails replaced with `[REDACTED]`
- Customer IDs truncated to 10 characters
- Stripe test mode errors filtered out

**Configuration:** See `sentry.server.config.ts` and `sentry.client.config.ts`

---

### Password Storage

**Method:** Handled entirely by Firebase Auth

**Security:**
- ✅ Bcrypt hashing by Firebase (not stored in our database)
- ✅ Salted hashes
- ✅ Password complexity enforced by Firebase

**Our responsibility:**
- Never store passwords in Firestore
- Never log passwords
- Use HTTPS only for password transmission

**Password reset tokens (`passwordResets` collection):**
- Tokens stored server-side only; Firestore rules block all client access (`allow read, write: if false`)
- Prevents token enumeration, manipulation, and rate limit bypass
- All operations via Admin SDK in API routes

---

### WordPress Credentials Storage

**Current implementation:**
```typescript
wordpressCredentials: {
  siteUrl: string,
  adminUsername: string,
  password: string  // ⚠️ Stored in plain text
}
```

**Security concern:** WordPress passwords stored unencrypted in Firestore.

**Mitigation:**
- Firestore encrypts at rest (Google manages keys)
- Access limited to authenticated user
- Not exposed in client-side queries

**Future improvement:** Encrypt WordPress passwords with user-specific key or use password manager integration.

---

## Security Headers

### Current Headers (Next.js defaults)

**Provided by Next.js:**
- `X-Frame-Options: DENY` - Prevents clickjacking
- `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
- `X-XSS-Protection: 1; mode=block` - XSS filter (legacy browsers)

### Content Security Policy

CSP is managed at the network edge via **Cloudflare**, not in this codebase.

- **Where:** Cloudflare dashboard → `bookservice.tech` zone → Rules → Transform Rules → "Security Headers"
- **Why:** Applied before traffic reaches Vercel; edits don't require a deploy.
- **Do not add a CSP header in `next.config.js`, `middleware.ts`, or `vercel.json`.** A duplicate app-level policy can silently conflict with or override the Cloudflare policy, causing hard-to-diagnose failures (see: signup sign-in blocked in production, 2026-07-17, root cause took ~2 hours to trace to this).
- **To change the policy:** edit the Transform Rule directly in Cloudflare, then purge cache (Caching → Purge Everything) since Cloudflare can serve stale headers from cache after a rule change.
- **Current `connect-src` allowlist should include:**
  - Firebase Auth: `identitytoolkit.googleapis.com`, `securetoken.googleapis.com`, `www.googleapis.com`
  - Firestore: `firestore.googleapis.com`
  - Firebase Storage: `firebasestorage.googleapis.com`, `storage.googleapis.com`
  - Mixpanel: `api-js.mixpanel.com`, `api.mixpanel.com`, `decide.mixpanel.com`
  - Stripe.js: `api.stripe.com`, `m.stripe.com`, `q.stripe.com`, `r.stripe.com`

**HSTS (Strict-Transport-Security):**
- Enforces HTTPS only
- Provided by Vercel automatically

---

## Vulnerability Disclosure

### Reporting Security Issues

**Contact:** TBD (set up security@tradesitegenie.com or similar)

**Process:**
1. Reporter sends email with vulnerability details
2. Team acknowledges within 24 hours
3. Team investigates and develops fix
4. Patch deployed within 7 days (or sooner for critical)
5. Reporter notified when fixed
6. Public disclosure after 90 days (if appropriate)

**Bounty program:** TBD (not yet implemented)

---

## Security Audit History

### Phase 1: Critical Security Fixes (February 2026)

**Issues found:**
- 🔴 CRITICAL: `/api/stripe/upgrade-subscription` accepted userId from body
- 🔴 CRITICAL: `/api/zapier-webhook` completely open (no auth)
- 🟡 IMPORTANT: `/api/stripe/validate-coupon` had no rate limiting

**Fixes applied:**
- ✅ Implemented middleware infrastructure (auth + rate limiting)
- ✅ Fixed upgrade-subscription route (now uses token-derived userId)
- ✅ Added rate limiting to validate-coupon (5/min)

**Remaining:**
- ⚠️ `/api/zapier-webhook` still open (low priority, not currently used)

**Documentation:** [SECURITY_FIXES_APPLIED.md](../SECURITY_FIXES_APPLIED.md)

---

### Phase 2: Firebase Browser-Only Pattern (February 2026)

**Issues found:**
- Firebase client SDK initialized at top level (SSR errors)
- Firebase functions called on server (null reference errors)

**Fixes applied:**
- ✅ Refactored `/lib/firebase.ts` to browser-only pattern
- ✅ Refactored `/lib/auth.ts` to use require() and typeof window checks
- ✅ Refactored `/lib/firestore.ts` to use browser-only functions

**Documentation:** [FIREBASE_BROWSER_ONLY_COMPLETE.md](../FIREBASE_BROWSER_ONLY_COMPLETE.md)

---

## Security Monitoring

### Sentry Integration

**What's monitored:**
- All server-side exceptions
- All client-side errors
- Performance metrics (span timing)
- Breadcrumbs (user actions leading to errors)

**Privacy protection:**
- Emails redacted: Replaced with `[REDACTED]`
- Customer IDs truncated: Only first 10 characters
- Stripe test mode errors filtered out

**Configuration:** [sentry-setup-checklist.md](./sentry-setup-checklist.md)

---

### Upstash Redis Analytics

**What's tracked:**
- Rate limit hits per endpoint
- IP addresses hitting limits
- Request patterns

**Access:** Upstash Console → Analytics tab

**Review frequency:** Weekly (or after incidents)

---

### Stripe Dashboard Monitoring

**What to monitor:**
- Webhook delivery success rate
- Failed payment attempts
- Dispute/chargeback rates
- Suspicious customer activity

**Review frequency:** Daily for first month, then weekly

---

## Incident Response

### Security Incident Types

**Type 1: Data Breach**
- Unauthorized access to user data
- Exposure of secrets (API keys, tokens)

**Response:**
1. Identify scope and exposure
2. Rotate all exposed secrets immediately
3. Notify affected users (if PII exposed)
4. File incident report
5. Implement additional controls

---

**Type 2: Account Compromise**
- User account accessed by unauthorized party
- Admin account compromised

**Response:**
1. Disable compromised account
2. Force password reset
3. Revoke all active sessions (Firebase Admin SDK)
4. Review access logs
5. Notify user

---

**Type 3: API Abuse**
- Rate limiting bypassed
- Unauthorized API access
- Excessive resource consumption

**Response:**
1. Identify source IP addresses
2. Block at load balancer level
3. Review rate limit configuration
4. Increase monitoring sensitivity

---

## Compliance Considerations

### GDPR (if EU customers)

**Current implementation:**
- ❌ No data deletion mechanism (user can't delete account)
- ❌ No data export mechanism (user can't download data)
- ⚠️ Privacy policy needs review

**TBD:** Implement GDPR-compliant features:
- User account deletion with data removal
- Data export API
- Cookie consent banner (if using analytics)
- Privacy policy update

---

### PCI DSS (Payment Card Industry)

**Current implementation:**
- ✅ No card numbers stored in our database (Stripe handles)
- ✅ Stripe Elements used for card input (PCI-compliant iframe)
- ✅ No card data passes through our servers
- ✅ HTTPS only for all traffic

**Compliance level:** We are a Stripe merchant, Stripe handles PCI compliance.

---

## Security Training for Developers

### Required knowledge:

1. **Never accept userId from request body**
   - Always use `userId` from verified token
   - Reference: Middleware usage docs

2. **Use middleware for all protected routes**
   - No custom auth logic in individual routes
   - Reference: [/lib/middleware/USAGE.md](../lib/middleware/USAGE.md)

3. **Validate all inputs on server**
   - Client validation is UX, not security
   - Use Zod schemas

4. **Never log sensitive data**
   - No passwords, tokens, full customer IDs, emails
   - Reference: Sentry redaction rules

5. **Follow Firebase browser-only pattern**
   - Check `typeof window` before Firebase calls
   - Reference: [FIREBASE_BROWSER_ONLY_COMPLETE.md](../FIREBASE_BROWSER_ONLY_COMPLETE.md)

---

## Cross-References

- **Middleware usage:** [/lib/middleware/USAGE.md](../lib/middleware/USAGE.md)
- **API authentication:** [API_INDEX.md](./API_INDEX.md)
- **Environment secrets:** [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- **Security fixes:** [SECURITY_FIXES_APPLIED.md](../SECURITY_FIXES_APPLIED.md)
- **Deployment security:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Last Updated:** February 2026  
**Security Review Date:** February 2026  
**Next Review:** Quarterly or after security incidents
