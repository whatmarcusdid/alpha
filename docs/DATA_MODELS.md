# Data Models

## Overview

This document defines the canonical data schemas for TradeSiteGenie Dashboard, focusing on Firestore collections and their relationships to external systems (Firebase Auth, Stripe). All timestamps use ISO 8601 format or Firestore Timestamp objects.

---

## Firestore Collections

### Collection: `users`

**Path:** `/users/{userId}`

**Document ID:** Firebase Auth UID (string)

**Purpose:** Central user profile with subscription, metrics, company info, and payment method.

**Schema:**

```typescript
{
  // Identity
  email: string;                    // REQUIRED - User's email address
  displayName: string;              // REQUIRED - User's full name
  createdAt: Timestamp;             // REQUIRED - Account creation timestamp
  
  // Subscription
  subscription: {
    tier: 'safety-net' | 'essential' | 'advanced' | 'premium';  // REQUIRED
    status: 'active' | 'canceled';                               // REQUIRED
    billingCycle: 'monthly' | 'yearly';                          // REQUIRED
    amount: number;                                              // REQUIRED - Annual price in dollars
    
    startDate: Timestamp;            // REQUIRED - Subscription start
    renewalDate: string;             // OPTIONAL - ISO string, next billing date
    endDate: Timestamp | null;       // OPTIONAL - When subscription ends
    
    stripeCustomerId: string | null; // OPTIONAL - Stripe customer ID (cus_xxx)
    stripeSubscriptionId: string | null; // OPTIONAL - Stripe subscription ID (sub_xxx)
    
    // Cancellation fields (null when active)
    canceledAt: string | null;       // ISO timestamp when canceled
    expiresAt: string | null;        // ISO timestamp when access ends
    cancellationReason: string | null; // User-provided reason
    
    updatedAt: string;               // REQUIRED - ISO timestamp of last update
  };
  
  // Metrics (displayed on dashboard)
  metrics: {
    websiteTraffic: number;          // REQUIRED - Monthly visitors
    siteSpeedSeconds: number;        // REQUIRED - Load time in seconds
    supportHoursRemaining: number;   // REQUIRED - Hours left this month
    maintenanceHoursRemaining: number; // REQUIRED - Hours left this month
    lastUpdated: Timestamp;          // REQUIRED - When metrics were updated
  };
  
  // Company Information
  company: {
    legalName: string;               // OPTIONAL - Business legal name
    websiteUrl: string;              // OPTIONAL - Primary website URL
    yearFounded: number | null;      // OPTIONAL - Year business started
    numEmployees: string | null;     // OPTIONAL - Employee count range
    
    // Address
    address: string;                 // OPTIONAL - Street address
    city: string;                    // OPTIONAL - City
    state: string;                   // OPTIONAL - State/province
    zipCode: string;                 // OPTIONAL - Postal code
    
    // Business details
    businessService: string;         // OPTIONAL - Type of trade (e.g., "Plumbing")
    serviceArea: string;             // OPTIONAL - Geographic service area
    
    lastUpdated: Timestamp;          // REQUIRED - When company info updated
  };
  
  // Payment Method (stored after SetupIntent confirmation)
  paymentMethod?: {
    brand: string;                   // e.g., "visa", "mastercard"
    last4: string;                   // Last 4 digits
    expMonth: number;                // 1-12
    expYear: number;                 // e.g., 2026
    paymentMethodId: string;         // Stripe payment method ID (pm_xxx)
    updatedAt: Timestamp;            // When payment method was updated
  };
  
  // WordPress Credentials (collected during onboarding)
  wordpressCredentials?: {
    siteUrl?: string;
    dashboardUrl?: string;           // WordPress admin dashboard URL (for "Go To Dashboard" link)
    adminUsername?: string;
    password?: string;               // ⚠️ Consider encrypting in future
    createdAt?: Timestamp;
  };
  
  // Meeting (next scheduled meeting)
  meeting?: {
    month: string;                   // e.g., "March"
    day: string;                     // e.g., "15"
    title: string;                   // e.g., "Q1 Review"
    lastUpdated: Timestamp;
  };

  // User settings (timezone, notifications)
  settings?: {
    timezone: string;                // IANA timezone (e.g., "America/New_York")
    timezoneLabel: string;            // Display label (e.g., "Eastern Standard Time (EST)")
    emailFrequency: 'real-time' | 'daily' | 'weekly' | 'critical';
    lastUpdated: Timestamp;
  };
}
```

**Required Fields (Minimum for user creation):**
- `email`
- `displayName`
- `createdAt`
- `subscription.tier`
- `subscription.status`
- `subscription.billingCycle`
- `subscription.amount`
- `subscription.startDate`
- `metrics` (all fields)
- `company.lastUpdated`

**Optional Fields:**
- `subscription.stripeCustomerId` (null if user hasn't paid yet)
- `subscription.stripeSubscriptionId` (null if user hasn't paid yet)
- `subscription.renewalDate` (null for canceled subscriptions)
- `paymentMethod` (only present after payment method added)
- `wordpressCredentials` (only present if user completed onboarding)
- `meeting` (only present if Delivery Scout sets it)
- `settings` (only present when user has updated settings)

---

### Collection: `dataExports` (Top-Level)

**Path:** `/dataExports/{exportId}`

**Document ID:** Auto-generated by Firestore

**Purpose:** Audit log of GDPR data export requests for compliance tracking.

**Schema:**

```typescript
{
  userId: string;                    // REQUIRED - User who requested export
  userEmail: string;                 // REQUIRED - User's email at time of export
  exportedAt: Timestamp;             // REQUIRED - When export was performed
  ipAddress: string;                  // REQUIRED - Client IP (from x-forwarded-for or 'unknown')
}
```

**Created by:** `/api/user/export-data` endpoint on each export request.

---

### Collection: `deletionRequests` (Top-Level)

**Path:** `/deletionRequests/{requestId}`

**Document ID:** Auto-generated by Firestore

**Purpose:** Track account deletion requests for manual processing and GDPR compliance.

**Schema:**

```typescript
{
  userId: string;                    // REQUIRED - User who requested deletion
  userEmail: string;                 // REQUIRED - User's email at time of request
  userName: string;                  // REQUIRED - User's display name
  reason: string | null;             // OPTIONAL - User-provided reason for leaving
  requestedAt: Timestamp;            // REQUIRED - When request was submitted
  status: 'pending' | 'processed';    // REQUIRED - Processing status
}
```

**Created by:** `/api/user/request-deletion` endpoint when user submits deletion request.

---

### Subcollection: `users/{userId}/sites`

**Path:** `/users/{userId}/sites/{siteId}`

**Document ID:** Auto-generated by Firestore

**Purpose:** Track customer websites being maintained.

**Schema:**

```typescript
{
  name: string;                      // REQUIRED - Site display name
  url: string;                       // REQUIRED - Full URL (https://...)
  status: 'online' | 'offline' | 'maintenance' | null; // OPTIONAL
  lastChecked: Timestamp | null;     // OPTIONAL - Last uptime check
  createdAt: Timestamp;              // REQUIRED
  updatedAt: Timestamp;              // REQUIRED
}
```

**Created by:** Delivery Scout API (`add_site` action) or manual dashboard entry.

---

### Subcollection: `users/{userId}/reports`

**Path:** `/users/{userId}/reports/{reportId}`

**Document ID:** Auto-generated by Firestore

**Purpose:** Store performance/analytics reports.

**Schema:**

```typescript
{
  title: string;                     // REQUIRED - Report title
  type: 'monthly' | 'quarterly' | 'annual' | 'custom'; // REQUIRED
  summary: string | null;            // OPTIONAL - Brief description
  reportUrl: string | null;          // OPTIONAL - Link to full report
  createdAt: Timestamp;              // REQUIRED
  generatedBy: 'system' | 'manual' | 'delivery-scout'; // OPTIONAL
}
```

**Created by:** Delivery Scout API (`add_report` action) or manual dashboard entry.

---

### Collection: `supportTickets` (Top-Level)

**Path:** `/supportTickets/{ticketId}`

**Document ID:** Auto-generated by Firestore

**Purpose:** Track support tickets and issues. Top-level collection with `userId` field for filtering by customer.

**Schema:**

```typescript
{
  userId: string;                    // REQUIRED - Links ticket to user
  createdByUserId: string;           // REQUIRED - User who created ticket
  title: string;                     // REQUIRED - Ticket title
  description: string;               // REQUIRED - Detailed description
  category: string;                  // e.g., General, Billing, Technical
  status: string;                    // Open, In Progress, Awaiting Customer, Resolved, Closed, Cancelled
  priority: string;                 // Critical, High, Medium, Low
  channel: string;                   // Support Hub, Email, Phone, Chat
  assignedAgentId?: string;
  assignedAgentName?: string;
  customerEmail?: string;
  customerName?: string;
  internalNotes?: string;
  helpscoutConversationId?: string;  // Linked HelpScout conversation
  createdAt: Timestamp;
  lastUpdatedAt: Timestamp;
  resolvedAt?: Timestamp;
  closedAt?: Timestamp;
  cancelledAt?: Timestamp;
}
```

**Created by:** Delivery Scout API (`create_ticket` action) or Support Hub form submission.

**Priority levels:**
- `Critical` - Site down, security issue
- `High` - Broken feature, significant bug
- `Medium` - Minor bug, enhancement request
- `Low` - Question, documentation

**Integrations:** Slack notifications on create/update; HelpScout conversation creation and note syncing.

---

### Collection: `pending_subscriptions`

**Path:** `/pending_subscriptions/{email}`

**Document ID:** Normalized email (lowercase, trimmed)

**Purpose:** Temporary storage for subscriptions created before user signup (race condition handling).

**Schema:**

```typescript
{
  email: string;                     // REQUIRED - Normalized email
  stripeCustomerId: string;          // REQUIRED - Stripe customer ID
  stripeSubscriptionId: string;      // REQUIRED - Stripe subscription ID
  stripeSessionId: string;           // REQUIRED - Checkout session ID
  
  tier: 'essential' | 'advanced' | 'premium'; // REQUIRED
  billingCycle: 'monthly' | 'annual'; // REQUIRED
  amount: number;                    // REQUIRED - Amount paid in dollars
  
  subscription: {                    // OPTIONAL - Full subscription details
    id: string;
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    priceId: string;
  } | null;
  
  createdAt: Timestamp;              // REQUIRED - When webhook created this
  status: 'pending' | 'claimed';     // REQUIRED - Claim status
  
  // Added after claim:
  claimedBy?: string;                // Firebase UID who claimed it
  claimedAt?: string;                // ISO timestamp when claimed
}
```

**Lifecycle:**
1. **Created:** Stripe webhook receives payment, no user found → Creates pending doc
2. **Claimed:** User signs up → Claim API marks as claimed, returns data
3. **Cleanup:** (Not implemented) Delete after 90 days or when claimed

**Indexing:** Firestore automatically indexes by document ID (email). No composite indexes needed.

---

## External ID Mappings

### Firebase Auth UID → Firestore User Document

**Relationship:** 1:1 (one Firebase user = one Firestore user document)

**Source of truth:** Firebase Auth UID

**Creation flow:**
1. User creates Firebase account → UID generated
2. `createUserWithSubscription()` creates Firestore doc with same UID
3. UID never changes for a user

**Usage:** All API routes use `userId` from verified Firebase token to query Firestore.

---

### Stripe Customer ID → Firestore User

**Relationship:** 1:1 (one Stripe customer = one Firestore user)

**Storage location:** `users/{userId}/subscription.stripeCustomerId`

**Creation flows:**

**Flow 1: Checkout before signup**
1. Stripe creates customer during checkout
2. Webhook receives event → Stores in `pending_subscriptions`
3. User signs up → Claims pending subscription
4. `stripeCustomerId` stored in user doc

**Flow 2: Signup before checkout** (TBD - not fully implemented)
1. User signs up without payment
2. Later initiates checkout
3. Checkout creates Stripe customer
4. Webhook links customer ID to user

**Lookup directions:**
- **Stripe → Firebase:** Query Firestore: `users where subscription.stripeCustomerId == cus_xxx`
- **Firebase → Stripe:** Read `stripeCustomerId` from user document

---

### Stripe Subscription ID → Firestore User

**Relationship:** 1:1 (one Stripe subscription = one Firestore user)

**Storage location:** `users/{userId}/subscription.stripeSubscriptionId`

**Creation:** Same as customer ID (linked during checkout or claimed at signup)

**Usage:** API routes fetch subscription ID from Firestore, then call Stripe API for operations.

---

### Stripe Payment Method ID → Firestore User

**Relationship:** 1:many (user can have multiple over time, we store only current)

**Storage location:** `users/{userId}/paymentMethod.paymentMethodId`

**Creation flow:**
1. User clicks "Update Payment Method"
2. Frontend calls `/api/stripe/create-setup-intent`
3. User enters card → Stripe creates PaymentMethod
4. Frontend calls `/api/stripe/attach-payment-method`
5. API attaches to customer, sets as default
6. API stores `paymentMethodId` + card details in Firestore

**Deletion:** When user adds new payment method, old one is overwritten (not archived).

---

## Data Lifecycle

### User Creation

**Trigger:** User completes signup (email, Google, or Apple)

**Entry point:** `/components/auth/SignUpForm.tsx`

**Function:** `createUserWithSubscription()` in `/lib/firestore.ts`

**Steps:**
1. Firebase Auth creates user account
2. Check for pending subscription (if applicable)
3. Create Firestore user document with all required fields
4. Send Slack notification to #tsg-support
5. Redirect to onboarding

**Default values:**
- `metrics`: All hours based on tier, traffic/speed = 0
- `subscription.status`: 'active'
- `subscription.startDate`: Now
- `subscription.stripeCustomerId`: null (unless claimed from pending)

---

### Subscription Updates

**Triggers:**
- User upgrades/downgrades via dashboard
- Stripe webhook receives subscription event
- Admin manually updates in Firebase Console

**API routes:**
- `/api/stripe/upgrade-subscription`
- `/api/stripe/downgrade-subscription`
- `/api/stripe/cancel-subscription`
- `/api/stripe/reactivate-subscription`

**Fields updated:**
- `subscription.tier`
- `subscription.status`
- `subscription.renewalDate`
- `subscription.updatedAt`
- `subscription.canceledAt` / `expiresAt` (for cancellations)

**Update pattern:** Use Firestore `update()` with dot notation to avoid overwriting entire subscription object.

```typescript
await adminDb.collection('users').doc(userId).update({
  'subscription.tier': 'premium',
  'subscription.updatedAt': new Date().toISOString(),
});
```

---

### Delivery Scout Updates

**Trigger:** Lindy AI sends POST to `/api/delivery-scout`

**Update paths:**
- `update_meeting` → `users/{userId}/meeting`
- `update_metrics` → `users/{userId}/metrics`
- `update_company_info` → `users/{userId}/company`
- `update_site` → `sites/{siteId}` (top-level)
- `update_ticket` → `supportTickets/{ticketId}` (top-level)

**Timestamp handling:** All updates use `admin.firestore.FieldValue.serverTimestamp()` for consistency.

---

### Payment Method Updates

**Trigger:** User completes "Update Payment Method" flow

**API routes:**
1. `/api/stripe/create-setup-intent` - Creates Stripe SetupIntent
2. `/api/stripe/attach-payment-method` - Attaches and stores details

**Fields updated:**
- `paymentMethod.brand`
- `paymentMethod.last4`
- `paymentMethod.expMonth`
- `paymentMethod.expYear`
- `paymentMethod.paymentMethodId`
- `paymentMethod.updatedAt`

**Overwrite behavior:** Entire `paymentMethod` object is replaced (no history kept).

---

## Indexing and Query Considerations

### Current Firestore Indexes

**Automatically indexed:**
- Document IDs (userId, email in pending_subscriptions)
- Single fields queried with `==`

**Composite indexes needed:**
- None currently required for existing queries

**Query patterns:**
- **By userId:** Direct document access (no index needed)
- **By stripeCustomerId:** Collection query (automatically indexed)
- **By email:** Direct access via document ID in pending_subscriptions

---

### Performance Considerations

**User document size:**
- Single document with subcollections (good for read performance)
- Metrics and company info in root doc (avoid extra reads)
- Subcollections for 1:many relationships (sites, reports, tickets)

**Read optimization:**
- Most dashboard views: Single doc read per user
- Transactions page: Additional API call to Stripe (not Firestore)
- Subcollections: Paginated queries (10-50 docs per page)

**Write optimization:**
- Use `update()` with field paths to avoid overwriting
- Use `serverTimestamp()` for consistency
- Batch writes not currently used (TBD for bulk operations)

---

## Schema Change Checklist

When modifying Firestore schema:

### Planning Phase
- [ ] Document proposed changes in this file
- [ ] Identify affected API routes and components
- [ ] Check if existing data needs migration
- [ ] Determine if changes are additive (safe) or breaking

### Implementation Phase
- [ ] Update TypeScript interfaces in `/types`
- [ ] Update Firestore helper functions in `/lib/firestore.ts`
- [ ] Update API routes that read/write affected fields
- [ ] Update Zod schemas for validation (if applicable)
- [ ] Update dashboard components that display data

### Migration Phase (if needed)
- [ ] Write migration script in `/scripts/migrations/`
- [ ] Test migration on development Firestore
- [ ] Backup production data before migration
- [ ] Run migration script on production
- [ ] Verify data integrity after migration

### Documentation Phase
- [ ] Update this file with new schema
- [ ] Update API documentation in `API_INDEX.md`
- [ ] Add migration notes to `CHANGELOG.md`
- [ ] Update any affected troubleshooting docs

### Validation Phase
- [ ] Test create/read/update/delete operations
- [ ] Verify dashboard displays new fields correctly
- [ ] Check that existing data still works
- [ ] Monitor Sentry for new errors after deployment

---

## Data Retention and Deletion

### User Account Deletion

**Request flow:** User submits deletion request via Settings page → `/api/user/request-deletion` endpoint.

**Implemented:**
- **Request API:** POST `/api/user/request-deletion` (optional `reason` in body)
- **Firestore logging:** Each request written to `deletionRequests` collection
- **Notifications:** Loops email to support@tradesitegenie.com, Slack to support channel
- **UI:** Confirmation modal on Settings page with optional reason textarea

**Manual processing (within 48 hours):** Team processes requests from `deletionRequests` and performs:
1. Soft delete: Mark user as deleted, keep data for 90 days
2. Hard delete: Remove Firestore document and all subcollections
3. Stripe: Cancel subscription, optionally delete customer
4. Firebase Auth: Delete authentication account

**See:** [account-deletion-api.md](./account-deletion-api.md)

---

### Pending Subscriptions Cleanup

**Policy:** TBD (not currently implemented)

**Proposed approach:**
1. Keep pending subscriptions for 7 days after creation
2. Send reminder email to complete signup (day 1, day 3, day 7)
3. After 7 days: Move to `expired_subscriptions` collection
4. After 90 days: Delete from `expired_subscriptions`
5. Alert admin for high-value unclaimed subscriptions

**Current status:** Pending subscriptions remain indefinitely until manually cleaned up.

---

## Cross-References

- **API routes:** See [API_INDEX.md](./API_INDEX.md)
- **User APIs:** [user-settings-api.md](./user-settings-api.md), [gdpr-export-api.md](./gdpr-export-api.md), [account-deletion-api.md](./account-deletion-api.md)
- **Delivery Scout schema:** See [delivery-scout-api.md](./delivery-scout-api.md)
- **Subscription management:** See [PRD-IMPLEMENTATION-STATUS.md](./PRD-IMPLEMENTATION-STATUS.md)
- **Architecture overview:** See [ARCHITECTURE.md](./ARCHITECTURE.md)

---

**Last Updated:** February 2026  
**Schema Version:** 1.0  
**Next Review:** When adding new user-facing features
