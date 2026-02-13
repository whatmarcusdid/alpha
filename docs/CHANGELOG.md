# Changelog

All notable changes to TradeSiteGenie Dashboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- **Growth Engine Automations** - Stripe Payment → Onboarding flow
  - `lib/loops.ts` - Loops API helper for transactional emails (payment confirmed, dashboard ready)
  - `lib/notion-sales.ts` - TSG Sales Pipeline queries and updates (find lead, update payment, update status)
  - Enhanced Stripe webhook with Loops, Notion, Slack automations (non-blocking)
  - `/api/notifications/dashboard-ready` - Dashboard Ready email via Loops after signup
  - `/api/notifications/account-created` - Account Created Slack + Notion Closed Won update
  - SignUpForm triggers all three post-signup notifications (new-user, dashboard-ready, account-created)
- **Weekly Sales Performance Digest**
  - `lib/weekly-digest/stripe.ts` - Stripe revenue queries
  - `lib/weekly-digest/notion.ts` - Pipeline metrics from TSG Sales Pipeline
  - `lib/weekly-digest/slack.ts` - Digest formatting and delivery
  - `/api/cron/weekly-sales-digest` - Monday 9 AM EST cron (Vercel)
  - `/api/test/weekly-digest` - Manual test endpoint
  - `vercel.json` - Cron job configuration
- **User Settings API** (`/api/user/settings`) - GET/PATCH for timezone and email notification frequency
  - Settings page with StickyBottomBar for save/cancel, NotificationToast for feedback
  - WordPress dashboard URL support ("Go To WordPress Dashboard" link when configured)
- **GDPR Data Export** (`/api/user/export-data`) - POST to download complete user data as JSON
  - Includes user, company, subscription, metrics, settings, sites, tickets, reports
  - Audit logging to `dataExports` collection
- **Account Deletion Request** (`/api/user/request-deletion`) - POST to submit deletion request
  - Confirmation modal with optional reason field
  - Notifies team via Loops (email to Help Scout) and Slack
  - Logs to `deletionRequests` collection
- **StickyBottomBar** - Reusable fixed bottom bar component for edit forms (Settings, My Company)
- **lib/firebase-admin.ts** - Alternative Firebase Admin initialization with modular imports
- **lib/firestore/settings.ts** - Client-side helpers for user settings (browser-only pattern)
- **Slack + HelpScout integrations** for Delivery Scout ticket handlers
  - Slack notifications on ticket create/update (`SLACK_SUPPORT_WEBHOOK_URL`)
  - HelpScout conversation creation on ticket create
  - HelpScout note sync on ticket update
  - Customer email fetched from Firestore user profile when not provided

### Changed
- **Delivery Scout create_ticket/update_ticket** - Aligned with Support Hub frontend
  - Collection: `users/{userId}/tickets` → `supportTickets` (top-level, with userId field)
  - Field names: `subject`→`title`, `lastUpdated`→`lastUpdatedAt`, `assignedTo`→`assignedAgentId`/`assignedAgentName`
  - Status values: `open`/`in-progress` → `Open`/`In Progress`/`Resolved`/`Closed`/`Cancelled`
  - Priority values: `P1`/`P2`/`P3`/`P4` → `Critical`/`High`/`Medium`/`Low`
  - Added: `userId`, `createdByUserId`, `channel` (defaults to Support Hub)
  - Added ownership verification in update_ticket
  - Create_ticket now requires `title` and `description` (not subject/priority)
- **HelpScout authentication** - Switched from API key to OAuth2 Client Credentials
  - `lib/helpscout/client.ts` now uses `HELPSCOUT_APP_ID`, `HELPSCOUT_APP_SECRET`
  - Token caching to avoid fetching on every request

### Docs
- Updated API_INDEX.md with dashboard-ready, account-created, cron/weekly-sales-digest, test/weekly-digest
- Updated ENVIRONMENT_VARIABLES.md with LOOPS usage, NOTION_SALES_PIPELINE_DB_ID, CRON_SECRET
- Updated API_INDEX.md with User APIs (settings, export-data, request-deletion)
- Updated DATA_MODELS.md with settings object, dataExports, deletionRequests collections, wordpressCredentials.dashboardUrl
- Updated ENVIRONMENT_VARIABLES.md with LOOPS_API_KEY, LOOPS_SUPPORT_TICKET_TEMPLATE_ID
- Updated ARCHITECTURE.md with new API endpoints, Firebase Admin paths, dataExports/deletionRequests
- Created user-settings-api.md, gdpr-export-api.md, account-deletion-api.md
- Updated delivery-scout-handlers.md, delivery-scout-quick-reference.md, delivery-scout-api.md
- Updated DATA_MODELS.md with supportTickets collection schema
- Updated DEPLOYMENT.md and ENVIRONMENT_VARIABLES.md with new env vars
- Updated delivery-scout-validation.md with new ticket schemas
- Updated ARCHITECTURE.md Firestore collections and notifications
- Updated scripts/test-delivery-scout.ts with new ticket payload format

---

## [1.2.0] - 2026-02-09

### Fixed
- **Build failure fix**: Resolved TypeScript error in reactivate-subscription route where `newTier` could be undefined when used as index type
- Added fallback logic to use current tier when newTier is not provided

---

## [1.1.0] - 2026-02-09

### Added
- **Pending Subscriptions System**: Complete "pay first, sign up later" flow
  - Webhook stores pending subscriptions when user doesn't exist
  - New `/api/stripe/claim-pending-subscription` endpoint for signup integration
  - Automatic linking of Stripe customer and subscription IDs
  - Protection against double-claiming with audit trail
- **Slack Notifications**: New user signup notifications to #tsg-support channel
  - Formatted messages with customer details and plan info
  - Graceful error handling (non-blocking)
  - Default values for missing signup parameters

### Changed
- **Dynamic user profile display**: Replaced hardcoded user name/email in DashboardNav with actual logged-in user data
- **Firestore helper refactor**: Updated `createUserWithSubscription()` to accept optional Stripe IDs
- **SignUpForm enhancement**: All three signup handlers (email, Google, Apple) now check for and claim pending subscriptions

### Fixed
- **Update Payment Method 401 error**: Added Firebase Auth token to create-setup-intent API call
- **Update Payment Method 500 error**: Replaced client-side `getUserProfile()` with server-side Firebase Admin query
- **Firebase initialization errors**: Fixed "No Firebase App" errors in transactions page by importing pre-initialized instances

### Security
- **Removed unnecessary validation**: Cleaned up empty body validation in create-setup-intent endpoint

### Docs
- Added comprehensive pending subscriptions documentation
- Created claim-pending-subscription API documentation
- Documented signup integration changes

---

## [1.0.0] - 2026-02-08

### Added
- **Subscription Management System** (Complete)
  - Upgrade/downgrade between tiers (Essential, Advanced, Premium)
  - Real-time proration preview via Stripe API
  - Cancel subscription with Safety Net offer
  - Reactivate canceled subscriptions
  - Subscription status badges and expiration dates
- **Payment Method Management**
  - Update payment method via Stripe SetupIntent
  - Attach payment method to customer and set as default
  - Display current payment method (brand, last4) in dashboard
- **Billing History**
  - Real Stripe invoice integration
  - Transaction history table with sorting
  - Download invoice PDFs (Stripe-hosted)
  - Empty state for new users
- **Delivery Scout API** (v1.0)
  - 8 handler functions for automated customer data management
  - Actions: update_meeting, update_metrics, update_company_info, add_site, update_site, add_report, create_ticket, update_ticket
  - API key authentication separate from Firebase
  - Comprehensive input validation with Zod
  - Full test suite in `/scripts/test-delivery-scout.ts`
- **Middleware Infrastructure**
  - Composable auth and rate limiting middleware
  - Three wrappers: `withAuthAndRateLimit`, `withRateLimit`, `withAuth`
  - Firebase Admin token verification
  - Upstash Redis rate limiting with 4 preconfigured limiters
- **Sentry Integration**
  - Client, server, and edge error tracking
  - Performance monitoring with span tracing
  - Source map uploads for readable stack traces
  - PII redaction (emails, customer IDs)
  - Test page at `/sentry-example-page`

### Changed
- **Firebase pattern enforcement**: All Firebase client files refactored to browser-only pattern
  - `lib/firebase.ts` uses `typeof window` checks
  - `lib/auth.ts` loads functions dynamically with `require()`
  - `lib/firestore.ts` uses browser-only function object
- **Authentication flow**: Improved OAuth handling for Google and Apple Sign-In
- **API response standardization**: Consistent error format across all endpoints

### Fixed
- **Critical auth vulnerability**: `/api/stripe/upgrade-subscription` no longer accepts userId from request body (now uses verified token)
- **Firebase SSR errors**: Eliminated "Cannot read properties of null" errors during server-side rendering
- **Firestore helper functions**: Fixed client-side vs server-side Firebase SDK usage in pages

### Security
- **Phase 1 Security Implementation**:
  - Added authentication to upgrade-subscription endpoint
  - Added rate limiting to validate-coupon endpoint (5/min to prevent brute force)
  - Implemented IP-based rate limiting via Upstash Redis
  - Firebase Admin token verification on all protected routes
  - Webhook signature verification for Stripe events
- **Stripe webhook secret verification**: All webhook events verified before processing
- **Rate limiting on critical endpoints**:
  - Checkout: 10 requests/minute
  - Coupon validation: 5 requests/minute
  - Webhooks: 20 requests/minute
  - General API: 60 requests/minute

### Docs
- Created comprehensive environment setup guide
- Documented middleware usage patterns
- Created security fixes documentation
- Added Firebase browser-only pattern guide
- Created Sentry setup checklist
- Documented delivery scout API with examples

---

## [0.3.0] - 2026-02-07

### Added
- **Stripe webhook handler** for subscription lifecycle events
- **User dashboard** with metrics, subscription status, and company info
- **Profile management** for user information updates

### Changed
- Migrated from Pages Router to App Router (Next.js 14+)
- Updated Firebase SDK to v10.x

### Fixed
- Environment variable loading issues
- Firebase initialization timing problems

---

## [0.2.0] - 2026-02-06

### Added
- **Authentication system** with Firebase Auth
  - Email/password authentication
  - Google OAuth Sign-In
  - Apple Sign-In
- **Dashboard navigation** with protected routes
- **Checkout flow** with Stripe integration

---

## [0.1.0] - 2026-02-05

### Added
- Initial Next.js project setup
- Basic project structure (app router)
- Tailwind CSS configuration
- TSG color system and design standards

---

## How to Update This Changelog

### When to Add Entries

Add changelog entries for:
- ✅ New features (user-facing or API)
- ✅ Breaking changes
- ✅ Security fixes
- ✅ Bug fixes
- ✅ Deprecations
- ❌ Minor refactors (unless they affect behavior)
- ❌ Documentation-only changes (unless major)
- ❌ Internal code style changes

---

### Entry Format

```markdown
### Added
- **Feature name**: Brief description
  - Additional detail (optional)
  - Related changes (optional)

### Changed
- **What changed**: Description of modification
  - Why it changed (optional)
  - Migration notes (if applicable)

### Fixed
- **Issue**: What was broken and how it's fixed
  - Error message or symptom
  - Root cause (optional)

### Security
- **Vulnerability type**: What was secured
  - Impact (critical/high/medium/low)
  - Mitigation steps

### Docs
- List of documentation added or updated
```

---

### Contributor Guidelines

1. **Add to [Unreleased] section** while working on feature
2. **Use present tense**: "Add feature" not "Added feature"
3. **Be specific**: Include endpoint paths, file names, or component names
4. **Link to docs**: Reference detailed documentation when available
5. **Group related changes**: Combine related changes into one bullet
6. **Move to versioned section** when releasing:
   - Change `[Unreleased]` header to `[X.Y.Z] - YYYY-MM-DD`
   - Create new empty `[Unreleased]` section above

---

### Version Numbering

**Format:** `MAJOR.MINOR.PATCH`

**Increment rules:**
- **MAJOR**: Breaking changes (API contract changes, removed features)
- **MINOR**: New features (backward compatible additions)
- **PATCH**: Bug fixes (backward compatible fixes)

**Examples:**
- Adding new API endpoint: MINOR version bump (1.0.0 → 1.1.0)
- Fixing TypeScript error: PATCH version bump (1.0.0 → 1.0.1)
- Changing API response format: MAJOR version bump (1.0.0 → 2.0.0)

---

### Release Process

1. **Collect changes** from [Unreleased] section
2. **Determine version** based on change types
3. **Update header**: `[Unreleased]` → `[X.Y.Z] - YYYY-MM-DD`
4. **Create new [Unreleased]** section above
5. **Commit changelog**: `git commit -m "Release vX.Y.Z"`
6. **Tag release**: `git tag vX.Y.Z`
7. **Push with tags**: `git push origin main --tags`
8. **Deploy to production** (Vercel auto-deploys on push)

---

## Cross-References

- **Architecture changes:** [ARCHITECTURE.md](./ARCHITECTURE.md)
- **API changes:** [API_INDEX.md](./API_INDEX.md)
- **Security updates:** [SECURITY_MODEL.md](./SECURITY_MODEL.md)
- **Deployment notes:** [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Last Updated:** February 2026  
**Current Version:** 1.2.0
