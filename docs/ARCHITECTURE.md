# Architecture Overview

## System Overview

TradeSiteGenie Dashboard is a Next.js 16 App Router application that provides subscription and service management for trade businesses. The architecture separates client-side authentication/rendering from server-side API operations, uses Firebase for auth and data persistence, Stripe for payment processing, and implements a composable middleware pattern for security. The system handles complex subscription lifecycles including upgrades, downgrades, cancellations, and a unique "pending subscriptions" pattern to handle race conditions between payment and signup.

---

## Component Breakdown

### Frontend Layer

**Location:** `/app`, `/components`

**Responsibilities:**
- Server Components (default) for initial page loads and data fetching
- Client Components (`"use client"`) for interactive UI requiring state/hooks
- Stripe Elements integration for payment forms
- Firebase Auth client SDK for authentication flows
- Real-time subscription and billing data display

**Key Patterns:**
- Browser-only Firebase initialization (`typeof window !== 'undefined'`)
- Dynamic imports with `require()` for Firebase functions
- Server Components fetch data directly via Firebase Admin or API calls
- Client Components use `useAuth()` context for user state

**Entry Points:**
- `/app/(auth)/*` - Authentication pages (signin, signup, forgot-password, reset-password)
- `/app/dashboard/*` - Protected dashboard pages (transactions, sites, support, etc.)
- `/app/checkout/*` - Checkout and onboarding flow
- `/components/*` - Reusable UI components organized by domain

---

### API Layer

**Location:** `/app/api`

**Responsibilities:**
- Stripe subscription operations (CRUD on subscriptions)
- Payment method management (SetupIntents, attach/update)
- Invoice and transaction retrieval
- Delivery Scout automation endpoint
- User settings (timezone, email frequency) - GET/PATCH
- GDPR data export (JSON download of all user data)
- Account deletion request (notifies team via Loops + Slack)
- Password reset flow (request token, validate, reset via Firebase Admin)
- Webhook processing (Stripe events)
- Notification dispatch (Slack, email, Loops)

**Key Patterns:**
- Next.js Route Handlers (App Router pattern)
- Composable middleware: `withAuthAndRateLimit`, `withRateLimit`, `withAuth`
- Firebase Admin SDK for server-side operations
- Zod schemas for request validation (where implemented)
- Sentry spans for performance tracking

**Trust Boundaries:**
- **Public routes:** Coupon validation (rate-limited)
- **Authenticated routes:** All subscription/profile operations (Firebase token required)
- **API key routes:** Delivery Scout (separate API key)
- **Webhook routes:** Stripe signature verification required

---

### Middleware Layer

**Location:** `/lib/middleware`

**Components:**
- `auth.ts` - Firebase Admin token verification
- `rateLimiting.ts` - Upstash Redis rate limiting
- `apiHandler.ts` - Composable wrappers for auth + rate limiting

**Responsibilities:**
- Verify Firebase ID tokens and extract userId
- Apply IP-based rate limits via Upstash Redis
- Return consistent error responses (401, 429, 500)
- Provide type-safe handler signatures

**Rate Limiters:**
- `checkoutLimiter` - 10 requests/minute
- `couponLimiter` - 5 requests/minute
- `webhookLimiter` - 20 requests/minute
- `generalLimiter` - 60 requests/minute

---

### Firebase/Firestore

**Location:** `/lib/firebase` (client), `/lib/firebase/admin` (server), `/lib/firebase-admin` (alternative)

**Client SDK (`/lib/firebase.ts`):**
- Browser-only initialization with environment variables
- Exports: `auth`, `db`, `app`
- Used in client components and pages

**Admin SDK:**
- **Primary:** `/lib/firebase/admin.ts` - Exports `adminAuth`, `adminDb`; used by middleware, Delivery Scout, most API routes
- **Alternative:** `/lib/firebase-admin.ts` - Modular imports (firebase-admin/app, firestore, auth); used by user settings, export, and request-deletion endpoints
- Both provide server-side Firebase Admin for API routes; never import in client components

**Collections:**
- `users/{userId}` - User profiles, subscriptions, metrics, company info, settings
- `sites/{siteId}` - Customer websites (top-level, has userId field)
- `users/{userId}/reports/{reportId}` - Performance reports
- `supportTickets/{ticketId}` - Support tickets (top-level, has userId field)
- `pending_subscriptions/{email}` - Temporary subscription storage
- `dataExports/{exportId}` - Audit log of GDPR data export requests
- `deletionRequests/{requestId}` - Account deletion request queue
- `passwordResets/{token}` - Password reset tokens (backend-only, no client access)

---

### Stripe Integration

**Location:** `/lib/stripe`

**Responsibilities:**
- Subscription lifecycle management
- Payment method collection via SetupIntents
- Proration calculations for tier changes
- Invoice retrieval and formatting
- Webhook event processing

**Key Flows:**
- **Checkout:** Stripe Checkout Session → Webhook → Firestore update
- **Upgrade/Downgrade:** API call → Stripe subscription update → Proration charge/credit
- **Payment Method:** SetupIntent → Confirmation → Attach to customer → Firestore update
- **Cancellation:** API call → Stripe cancel_at_period_end → Firestore status update

---

### Webhooks

**Location:** `/app/api/webhooks/stripe/route.ts`

**Responsibilities:**
- Receive Stripe events (subscription created/updated/deleted)
- Verify webhook signatures
- Update Firestore with subscription changes
- Handle pending subscriptions for pre-payment signups
- Growth Engine: On checkout.session.completed, trigger Loops (Payment Confirmed), Notion (lead update), Slack (payment notification)

**Handled Events:**
- `checkout.session.completed` - Initial subscription creation
- `customer.subscription.created` - New subscription
- `customer.subscription.updated` - Tier changes, cancellations
- `customer.subscription.deleted` - Subscription ended

---

### Notifications

**Location:** `/app/api/notifications/*`, `/app/api/delivery-scout/route.ts`

**Integrations:**
- **Slack:** New user signup (`SLACK_WEBHOOK_URL`), support ticket create/update (`SLACK_SUPPORT_WEBHOOK_URL`), Website Game Plan bookings (`SLACK_SALES_WEBHOOK_URL` → #tsg-sales), account deletion requests
- **HelpScout:** Conversation creation on ticket create, note sync on ticket update (OAuth2 Client Credentials via `lib/helpscout/client.ts`)
- **Loops:** Transactional emails for payment confirmed, dashboard ready, account deletion, password reset (`LOOPS_API_KEY`, `LOOPS_PASSWORD_RESET_TEMPLATE_ID`)
- **Notion:** TSG Sales Pipeline for payment tracking and weekly digest metrics (`NOTION_SALES_PIPELINE_DB_ID`)
- **Zapier:** (Optional) Support ticket forwarding to Notion

---

## Request Flow Diagrams

### Authenticated API Request Flow

```
User Browser
    ↓ (1) User action triggers API call
    ↓ (2) Get Firebase ID token: await user.getIdToken()
    ↓ (3) Fetch with Authorization header
    ↓
Next.js API Route
    ↓ (4) Middleware: withAuthAndRateLimit wrapper
    ↓ (5) Check rate limit (Upstash Redis)
    ↓ (6) Verify Firebase token (Firebase Admin)
    ↓ (7) Extract userId from token
    ↓ (8) Pass to handler: (req, { userId })
    ↓
Handler Function
    ↓ (9) Query Firestore with adminDb
    ↓ (10) Call Stripe API if needed
    ↓ (11) Update Firestore
    ↓ (12) Return JSON response
    ↓
User Browser
    ↓ (13) Update UI with response
```

### Stripe Webhook Flow

```
Stripe
    ↓ (1) Subscription event occurs
    ↓ (2) POST to /api/webhooks/stripe
    ↓
Webhook Handler
    ↓ (3) Verify webhook signature
    ↓ (4) Parse event data
    ↓ (5) Extract customer/subscription IDs
    ↓ (6) Query Firestore for user by stripeCustomerId
    ↓
    ├─ User found:
    │   ↓ (7a) Update user's subscription document
    │   ↓ (7b) Update status, tier, dates
    │   ↓ (7c) Return 200 OK
    │
    └─ User not found:
        ↓ (7d) Retrieve customer email from Stripe
        ↓ (7e) Create pending_subscriptions/{email} document
        ↓ (7f) Store subscription data for later claim
        ↓ (7g) Return 200 OK
```

### Pending Subscription Claim Flow

```
Signup Process
    ↓ (1) User creates Firebase account
    ↓ (2) Call /api/stripe/claim-pending-subscription
    ↓ (3) Pass normalized email
    ↓
Claim API
    ↓ (4) Query pending_subscriptions/{email}
    ↓
    ├─ Found + unclaimed:
    │   ↓ (5a) Mark as claimed with userId and timestamp
    │   ↓ (5b) Return subscription data
    │   ↓ (5c) Signup uses data to create user doc with Stripe IDs
    │
    └─ Not found or already claimed:
        ↓ (5d) Return success: false
        ↓ (5e) Signup proceeds with URL params (fallback)
```

---

## Where to Add New Features

### Adding a New Subscription Tier

1. **Stripe Dashboard:** Create new price ID
2. **Update:** `/lib/stripe/index.ts` - Add to PRICING constant
3. **Update:** API routes that map tiers to price IDs
4. **Update:** `/components/upgrade/PlanSelectionModal.tsx` - Add tier card
5. **Update:** Firestore schema if new fields needed

### Adding a New API Endpoint

1. **Create:** `/app/api/[domain]/[operation]/route.ts`
2. **Apply middleware:** Use `withAuthAndRateLimit` or `withRateLimit`
3. **Add Zod schema:** Define request validation schema
4. **Add Sentry tracking:** Wrap in `Sentry.startSpan`
5. **Update:** `docs/API_INDEX.md` with new endpoint

### Adding a New Delivery Scout Action

1. **Add handler:** `/app/api/delivery-scout/route.ts` - New case in switch
2. **Add type:** `/types/delivery-scout.ts` - New Zod schema
3. **Update docs:** `/docs/delivery-scout-api.md`
4. **Test:** Add test case to `/scripts/test-delivery-scout.ts`

### Adding a New Dashboard Page

1. **Create:** `/app/dashboard/[page-name]/page.tsx`
2. **Add navigation:** Update `/components/layout/DashboardNav.tsx`
3. **Add icon:** Import from `lucide-react`
4. **Protect route:** Use `useAuth()` hook or middleware

### Adding a New Webhook Event Handler

1. **Update:** `/app/api/webhooks/stripe/route.ts`
2. **Add handler function:** Follow existing pattern
3. **Update Firestore:** Define what data to write
4. **Configure Stripe:** Add event to webhook endpoint settings
5. **Test:** Use Stripe CLI: `stripe trigger [event_name]`

---

## Known Architectural Constraints

### Firebase Browser-Only Pattern (CRITICAL)

**Constraint:** All Firebase client SDK imports must use `typeof window !== 'undefined'` checks with `require()` pattern.

**Reason:** Prevents "Cannot read properties of null" errors during server-side rendering.

**Enforcement:**
- ✅ Correct: Load Firebase functions inside browser check
- ❌ Incorrect: Top-level Firebase imports/calls in client files

**Files requiring this pattern:**
- `/lib/firebase.ts` ✅ (already compliant)
- `/lib/auth.ts` ✅ (already compliant)
- `/lib/firestore.ts` ✅ (already compliant)

### Middleware Composition Limitation

**Constraint:** Cannot chain multiple HOFs with different signatures.

**Current solution:** Three separate wrappers:
- `withAuthAndRateLimit` - Both protections
- `withRateLimit` - Public routes
- `withAuth` - Auth only

**Tradeoff:** Some code duplication in apiHandler.ts vs. complex type generics.

### Rate Limiting Graceful Degradation

**Constraint:** If Upstash Redis is unavailable, rate limiting is disabled (not enforced).

**Reason:** Allows app to function without Redis in development, logs warning.

**Production requirement:** MUST have Upstash configured or API is vulnerable to abuse.

### Stripe API Version Lock

**Constraint:** Using Stripe API version `2025-12-15.clover` in webhook handler.

**Reason:** Ensures consistent webhook payload structure. Changing version may break webhook processing.

**Upgrade path:** Test thoroughly with Stripe CLI before updating version.

### Firestore Security Rules Not Managed in Repo

**Constraint:** Firestore security rules are configured in Firebase Console, not version controlled.

**Risk:** Rules could be out of sync with code expectations.

**Mitigation:** Document rules in separate doc (TBD) and review quarterly.

### Pending Subscriptions Email Matching

**Constraint:** Pending subscriptions are keyed by normalized email (lowercase, trimmed).

**Limitation:** If user pays with `John@Example.com` and signs up with `john.smith@gmail.com`, subscription won't auto-link.

**Mitigation:** Admin tools to manually link subscriptions (not yet implemented).

### No Database Migrations System

**Constraint:** Firestore schema changes are applied manually or via one-off scripts.

**Risk:** Schema drift between environments, inconsistent data structure.

**Current practice:** Document changes in PRs, run scripts manually in production.

---

## Cross-References

- **Security details:** See [SECURITY_MODEL.md](./SECURITY_MODEL.md)
- **Data schemas:** See [DATA_MODELS.md](./DATA_MODELS.md)
- **API reference:** See [API_INDEX.md](./API_INDEX.md)
- **User APIs:** [user-settings-api.md](./user-settings-api.md), [gdpr-export-api.md](./gdpr-export-api.md), [account-deletion-api.md](./account-deletion-api.md)
- **Deployment process:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Middleware usage:** See [/lib/middleware/USAGE.md](../lib/middleware/USAGE.md)
- **Environment setup:** See [SETUP.md](./SETUP.md)

---

**Last Updated:** February 2026  
**Next Review:** When adding major new components or integrations
