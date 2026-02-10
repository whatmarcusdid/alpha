# Testing Strategy

## Overview

This document outlines the testing approach for TradeSiteGenie Dashboard, including existing test infrastructure, minimum quality gates, and guidelines for adding new tests.

---

## Testing Pyramid

```
                    /\
                   /  \
                  / E2E \          (TBD - Not yet implemented)
                 /______\
                /        \
               / Integration\       (Partial - API tests exist)
              /____________\
             /              \
            /  Unit Tests    \     (TBD - Minimal coverage)
           /________________\
```

### Current State

**Unit Tests:** ⚠️ Not systematically implemented  
**Integration Tests:** ✅ Delivery Scout API test suite exists  
**E2E Tests:** ❌ Not implemented  
**Manual Testing:** ✅ Primary testing method

---

## Existing Test Infrastructure

### Delivery Scout API Test Suite

**Location:** `/scripts/test-delivery-scout.ts`

**Coverage:**
- All 8 Delivery Scout action handlers
- Authentication (valid/invalid API key)
- Input validation (missing fields, invalid types)
- Error handling (malformed JSON, wrong HTTP method)
- Idempotent vs. non-idempotent operations
- Cleanup of test data

**How to run:**
```bash
npm run test:scout
# or
tsx scripts/test-delivery-scout.ts
```

**Requirements:**
- Test user must exist in Firestore
- `DELIVERY_SCOUT_API_KEY` must be set in `.env.local`
- Development server must be running

**Documentation:** [scripts/README-TEST-SCOUT.md](../scripts/README-TEST-SCOUT.md)

---

### Sentry Integration Tests

**Location:** `/app/sentry-example-page/page.tsx`

**Coverage:**
- Client-side error tracking
- Server-side error tracking (via `/api/test-sentry-error`)
- Info message capture
- Performance tracking with spans

**How to run:**
1. Visit `http://localhost:3000/sentry-example-page`
2. Click each test button
3. Verify errors appear in Sentry dashboard

**Documentation:** [sentry-setup-checklist.md](./sentry-setup-checklist.md)

---

## Minimum Required Checks Before Merge

Every pull request or commit to `main` must pass:

### 1. TypeScript Type Check

```bash
npx tsc --noEmit
```

**Status:** ✅ **REQUIRED** (deployment will fail if errors exist)

**Enforced by:** Vercel build process

**Exceptions:** None - all type errors must be fixed

---

### 2. Linter Check

```bash
npm run lint
```

**Status:** ⚠️ **RECOMMENDED** (not enforced but strongly encouraged)

**Enforced by:** Manual review

**Acceptable:** Minor warnings, but no errors

---

### 3. Build Test

```bash
npm run build
```

**Status:** ✅ **REQUIRED**

**Enforced by:** Vercel deployment (auto-fails if build fails)

**Must succeed:** No compilation errors, successful build output

---

### 4. Manual Smoke Test (for feature changes)

**Status:** ✅ **REQUIRED** for user-facing changes

**Minimum test paths:**
- [ ] Feature being changed works as expected
- [ ] No regressions in related features
- [ ] No console errors introduced

---

## Test Data and Environment Setup

### Development Environment

**Firebase project:** Use separate development Firebase project (recommended)

**Stripe account:** Use test mode with test API keys

**Test users:**
- Create test users in Firebase Auth
- Populate Firestore with sample data
- Use Stripe test cards (4242 4242 4242 4242)

---

### Test User Template

```typescript
// Firestore: users/test-user-123
{
  email: "test@example.com",
  displayName: "Test User",
  createdAt: Timestamp.now(),
  subscription: {
    tier: "essential",
    status: "active",
    billingCycle: "yearly",
    amount: 679,
    startDate: Timestamp.now(),
    stripeCustomerId: "cus_test123",
    stripeSubscriptionId: "sub_test123",
    updatedAt: new Date().toISOString(),
  },
  metrics: {
    websiteTraffic: 1000,
    averageSiteSpeed: 2.5,
    supportHoursRemaining: 4,
    maintenanceHoursRemaining: 8,
    lastUpdated: Timestamp.now(),
  },
  company: {
    legalName: "Test Company",
    websiteUrl: "https://test.example.com",
    city: "Test City",
    state: "TS",
    zipCode: "12345",
    businessService: "Testing",
    serviceArea: "Global",
    lastUpdated: Timestamp.now(),
  }
}
```

**Script to create test user:** TBD (not yet implemented)

---

### Stripe Test Cards

**Successful payment:**
- `4242 4242 4242 4242` - Visa
- Any future expiry date
- Any CVC

**Declined payment:**
- `4000 0000 0000 0002` - Declined

**Authentication required:**
- `4000 0025 0000 3155` - 3D Secure

**Full list:** https://stripe.com/docs/testing#cards

---

## Testing Critical User Journeys

### Journey 1: New User Signup & Checkout

**Path:** Signup → Checkout → Payment → Dashboard access

**Test steps:**
1. Clear browser data (incognito mode)
2. Visit `/signup?tier=essential&amount=679&billingCycle=yearly`
3. Create account with email/password
4. Verify redirect to WordPress credentials page
5. Complete onboarding
6. Verify dashboard access with correct tier
7. Check Firestore: User document created
8. Check Stripe: Customer and subscription created
9. Check pending_subscriptions: Should be empty OR claimed

**Expected outcome:**
- ✅ User can sign in
- ✅ Dashboard shows "Essential" tier
- ✅ Subscription status "Active"
- ✅ Slack notification sent

**If failed:** See [ERRORS_AND_TROUBLESHOOTING.md](./ERRORS_AND_TROUBLESHOOTING.md)

---

### Journey 2: Subscription Upgrade

**Path:** Dashboard → Upgrade Plan → Select tier → Confirm → Success

**Test steps:**
1. Sign in as user with Essential tier
2. Click "Upgrade Plan" button
3. Select Premium tier card
4. Verify upgrade confirmation modal shows proration
5. Click "Place Order"
6. Verify success notification appears
7. Verify dashboard updates to Premium tier
8. Check Stripe: Subscription updated
9. Check Firestore: Tier and renewal date updated

**Expected outcome:**
- ✅ Proration calculated correctly
- ✅ Stripe subscription tier updated
- ✅ Firestore tier updated
- ✅ No errors in console

---

### Journey 3: Payment Method Update

**Path:** Dashboard → Update Payment Method → Enter card → Save

**Test steps:**
1. Sign in as user with active subscription
2. Click "Update Payment Method"
3. Verify Stripe Elements loads
4. Enter test card (4242 4242 4242 4242)
5. Enter billing details
6. Click "Save Payment Method"
7. Verify success notification
8. Check Firestore: paymentMethod field updated
9. Check Stripe: Payment method attached and set as default

**Expected outcome:**
- ✅ Stripe Elements loads without errors
- ✅ Card saved successfully
- ✅ Modal closes
- ✅ Dashboard shows new card last4

---

### Journey 4: Pending Subscription Claim

**Path:** Checkout → Pay → Sign up later → Subscription linked

**Test steps:**
1. Create Stripe Checkout session (programmatically or via test UI)
2. Complete payment with test card
3. **Do NOT create Firebase account yet**
4. Wait for webhook to fire
5. Check Firestore: `pending_subscriptions/{email}` exists with status "pending"
6. Now create Firebase account with same email
7. Check console: "✅ Found pending subscription"
8. Check Firestore: User document has `stripeCustomerId` and `stripeSubscriptionId`
9. Check Firestore: Pending subscription status changed to "claimed"

**Expected outcome:**
- ✅ Webhook creates pending subscription
- ✅ Signup claims subscription
- ✅ User has immediate access
- ✅ No manual intervention needed

**Documentation:** [PENDING-SUBSCRIPTIONS-COMPLETE.md](./PENDING-SUBSCRIPTIONS-COMPLETE.md)

---

## Testing Webhooks Locally

### Stripe CLI Setup

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

**Output:** Shows webhook signing secret (use for `STRIPE_WEBHOOK_SECRET`)

---

### Trigger Test Events

```bash
# Test subscription created
stripe trigger customer.subscription.created

# Test subscription updated
stripe trigger customer.subscription.updated

# Test checkout completed
stripe trigger checkout.session.completed
```

**Verification:**
1. Check terminal running `stripe listen` - should show event received
2. Check server logs - should show webhook processed
3. Check Firestore - should see data updated

---

### Custom Event Payloads

```bash
# Trigger with specific customer ID
stripe trigger customer.subscription.created \
  --override customer=cus_test123
```

---

## Rate Limiting Tests

### Test Checkout Rate Limit (10/min)

```bash
# Send 11 requests rapidly
for i in {1..11}; do
  curl -X POST http://localhost:3000/api/stripe/create-setup-intent \
    -H "Authorization: Bearer $TEST_TOKEN" \
    -H "Content-Type: application/json"
  echo "Request $i"
done
```

**Expected:**
- Requests 1-10: Success (200)
- Request 11: Rate limited (429)

---

### Test Coupon Rate Limit (5/min)

```bash
# Send 6 requests rapidly
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/stripe/validate-coupon \
    -H "Content-Type: application/json" \
    -d '{"couponCode":"TEST"}'
  echo "Request $i"
done
```

**Expected:**
- Requests 1-5: Success or error based on coupon validity
- Request 6: Rate limited (429)

---

## Flaky Test Handling Policy

**Definition:** A test that sometimes passes and sometimes fails without code changes.

**Current state:** Manual testing, so flakiness appears as "it worked yesterday."

**Causes:**
- Race conditions (async operations)
- External service delays (Stripe API, Firebase)
- Timing-dependent assertions
- Network issues

**Handling procedure:**

1. **Document the flake:**
   - What test is flaky
   - How often it fails
   - Under what conditions

2. **Investigate root cause:**
   - Add logging/debugging
   - Reproduce locally
   - Check external service status

3. **Fix approaches:**
   - Add retry logic with exponential backoff
   - Increase timeouts for external calls
   - Use test doubles/mocks for external services
   - Add explicit waits for async operations

4. **If unfixable:**
   - Mark as "known issue"
   - Document workaround
   - Consider skipping in CI (with team approval)

**TBD:** Implement automated test suite to identify flaky tests systematically.

---

## Add a New Test: Templates

### Template 1: API Endpoint Test

```typescript
// scripts/test-[endpoint-name].ts
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const API_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'your-test-token-here';

async function testEndpoint() {
  console.log('🧪 Testing [Endpoint Name]...\n');
  
  try {
    // Test 1: Success case
    console.log('Test 1: Valid request');
    const response = await fetch(`${API_URL}/api/path`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({ /* test data */ }),
    });
    
    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log('✅ Test 1 passed\n');
    } else {
      console.error('❌ Test 1 failed:', data);
      process.exit(1);
    }
    
    // Test 2: Error case
    console.log('Test 2: Invalid request (missing field)');
    const errorResponse = await fetch(`${API_URL}/api/path`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({ /* invalid data */ }),
    });
    
    const errorData = await errorResponse.json();
    
    if (!errorResponse.ok && errorData.error) {
      console.log('✅ Test 2 passed (error handled correctly)\n');
    } else {
      console.error('❌ Test 2 failed: Should have returned error');
      process.exit(1);
    }
    
    console.log('🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

testEndpoint();
```

---

### Template 2: Component Test (Manual)

**Checklist for manual component testing:**

```markdown
## Testing [ComponentName]

### Setup
- [ ] Dev server running
- [ ] Logged in as test user
- [ ] Required data exists in Firestore

### Happy Path
- [ ] Component renders without errors
- [ ] All interactive elements respond to clicks
- [ ] Data displays correctly
- [ ] Success flow completes as expected

### Error Cases
- [ ] Missing data handled gracefully
- [ ] API errors shown to user
- [ ] Loading states displayed
- [ ] Network errors don't crash component

### Edge Cases
- [ ] Component with empty data
- [ ] Component with maximum data
- [ ] Component during loading state
- [ ] Component with concurrent updates

### Browser Compatibility
- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

### Accessibility
- [ ] Keyboard navigation works
- [ ] Screen reader compatible (test with VoiceOver/NVDA)
- [ ] Color contrast sufficient
- [ ] Focus indicators visible
```

---

## Minimum Quality Gates

Before merging code to `main`:

### Automated Checks

- [x] ✅ **TypeScript compilation**: `npx tsc --noEmit` (REQUIRED)
- [x] ⚠️ **Linter**: `npm run lint` (RECOMMENDED)
- [x] ✅ **Build test**: `npm run build` (REQUIRED)

### Manual Checks

- [ ] **Code review**: At least one other developer reviews (if team >1)
- [ ] **Manual testing**: Test affected functionality
- [ ] **Documentation**: Update relevant docs if API/schema changes
- [ ] **Changelog**: Add entry to CHANGELOG.md for notable changes

### For High-Risk Changes

High-risk changes include: authentication, payment processing, subscription management, data migrations.

Additional requirements:
- [ ] **Test on staging**: Deploy to preview environment first
- [ ] **Extended testing**: Test all related features, not just changed code
- [ ] **Rollback plan**: Document rollback steps before deploying
- [ ] **Monitor closely**: Watch Sentry for 1 hour after deployment

---

## Test Data Management

### Development Data

**Strategy:** Use separate Firebase project for development

**Benefits:**
- Safe to create/delete test data
- No risk of corrupting production data
- Can reset database as needed

**Setup:**
1. Create development Firebase project
2. Copy Firestore structure from production
3. Use development credentials in `.env.local`
4. Seed with test data

---

### Test Users

**Recommended test users:**

| Email | Purpose | Tier | Payment Method |
|-------|---------|------|----------------|
| `test-essential@example.com` | Essential tier testing | Essential | Test card 4242 |
| `test-premium@example.com` | Premium tier testing | Premium | Test card 4242 |
| `test-canceled@example.com` | Cancellation testing | Advanced (canceled) | Test card 4242 |
| `test-no-payment@example.com` | No payment method | Essential | None |

**Script to seed test users:** TBD (not yet implemented)

---

### Cleaning Up Test Data

**After testing:**

```typescript
// scripts/cleanup-test-data.ts (TBD - not yet implemented)
// Deletes all users with email containing "test@example.com"
// Deletes associated Stripe customers/subscriptions
// Cleans up pending_subscriptions
```

**Manual cleanup:**
1. Firebase Console → Authentication → Delete test users
2. Firebase Console → Firestore → Delete user documents
3. Stripe Dashboard → Customers → Delete test customers

---

## Testing Stripe Integration

### Webhooks

**Test with Stripe CLI:**
```bash
# Start webhook forwarding
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# In another terminal, trigger events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

**Verify:**
- [ ] Server logs show webhook received
- [ ] Firestore updates correctly
- [ ] No errors in Sentry

---

### Checkout Flow

**Test with Stripe test mode:**
1. Create checkout session via UI or API
2. Use test card: `4242 4242 4242 4242`
3. Complete payment
4. Verify webhook fires
5. Verify Firestore updates
6. Verify user dashboard shows subscription

**Common test scenarios:**
- [ ] New subscription creation
- [ ] Subscription with coupon code
- [ ] Subscription upgrade
- [ ] Subscription downgrade

---

### Payment Method Management

**Test SetupIntent flow:**
1. Click "Update Payment Method"
2. Verify Stripe Elements loads
3. Enter test card
4. Submit form
5. Verify payment method attached
6. Verify Firestore updated

---

## Testing Authentication

### Email/Password Auth

```typescript
// Manual test checklist
- [ ] Sign up with new email
- [ ] Sign in with correct password
- [ ] Sign in with wrong password (should fail)
- [ ] Sign up with existing email (should fail)
- [ ] Password reset flow
- [ ] Sign out
```

---

### OAuth (Google/Apple)

```typescript
// Manual test checklist
- [ ] Click "Sign in with Google"
- [ ] Verify redirect to Google
- [ ] Complete OAuth flow
- [ ] Verify redirect back to app
- [ ] Verify user created in Firestore
- [ ] Sign out and sign in again (should reuse account)
```

**Note:** OAuth testing requires real Google/Apple accounts or staging setup.

---

## Testing Rate Limiting

### Manual Rate Limit Test

**Purpose:** Verify rate limiting works for specific endpoint.

**Steps:**
1. Ensure Upstash Redis is configured
2. Send multiple requests rapidly (use script or tool)
3. Verify 429 response after limit exceeded
4. Wait for window to reset
5. Verify requests succeed again

**Example script:**
```bash
# Test checkout limiter (10/min)
for i in {1..12}; do
  curl -X POST http://localhost:3000/api/stripe/create-setup-intent \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json"
  echo ""
  sleep 1  # Small delay to see each response
done
```

**Expected:**
- First 10 requests: Success
- Requests 11-12: 429 Too Many Requests

---

## Testing Delivery Scout API

**Full test suite exists:** See `/scripts/test-delivery-scout.ts`

**Quick test (single action):**

```bash
curl -X POST http://localhost:3000/api/delivery-scout \
  -H "Authorization: Bearer $DELIVERY_SCOUT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create_ticket",
    "userId": "test-user-123",
    "data": {
      "subject": "Test ticket",
      "priority": "P4",
      "description": "Testing the API"
    }
  }'
```

**Expected:**
```json
{
  "success": true,
  "ticketId": "generated-id",
  "message": "Ticket created successfully"
}
```

---

## Regression Testing

### When to Run Full Regression Tests

- Before major releases
- After dependency updates (especially Next.js, Firebase, Stripe)
- After database schema changes
- After authentication/security changes

### Regression Test Checklist

**Authentication:**
- [ ] Email/password signin
- [ ] Google OAuth signin
- [ ] Apple OAuth signin
- [ ] Sign out
- [ ] Password reset

**Dashboard:**
- [ ] Dashboard loads for all user tiers
- [ ] Metrics display correctly
- [ ] Company info displays correctly
- [ ] Navigation works

**Subscription Management:**
- [ ] View current plan
- [ ] Upgrade to higher tier
- [ ] Downgrade to lower tier
- [ ] Cancel subscription
- [ ] Reactivate subscription

**Payment:**
- [ ] Update payment method
- [ ] View billing history
- [ ] Download invoice

**Delivery Scout:**
- [ ] All 8 action handlers (use test script)

---

## Future Testing Improvements

### Priority 1: Automated Integration Tests

**Goal:** Test all API endpoints automatically

**Implementation:**
- Use Jest or Vitest for test runner
- Create test suite for each API domain
- Mock external services (Stripe, Firebase) when appropriate
- Run in CI/CD pipeline

**Effort:** 1-2 weeks

---

### Priority 2: E2E Tests

**Goal:** Automated browser testing of critical flows

**Tools to consider:**
- Playwright (recommended)
- Cypress
- Puppeteer

**Flows to automate:**
- New user signup and checkout
- Subscription upgrade
- Payment method update

**Effort:** 2-3 weeks

---

### Priority 3: Unit Tests for Business Logic

**Goal:** Test pure functions and utilities

**Coverage:**
- Validation functions
- Data transformation utilities
- Pricing calculations
- Date formatting functions

**Effort:** 1 week

---

### Priority 4: Visual Regression Testing

**Goal:** Catch unintended UI changes

**Tools to consider:**
- Chromatic
- Percy
- BackstopJS

**Effort:** 1 week

---

## Test Environment Variables

For testing, use separate credentials from production:

```bash
# Create .env.test (TBD - not yet implemented)
# Same structure as .env.local but with test credentials
STRIPE_SECRET_KEY=sk_test_...
FIREBASE_PROJECT_ID=tradesitegenie-dev
# ... etc
```

**Best practice:** Never run automated tests against production Firebase or Stripe.

---

## Cross-References

- **API testing:** See individual test scripts in `/scripts`
- **Webhook testing:** [delivery-scout-validation.md](./delivery-scout-validation.md)
- **Error scenarios:** [ERRORS_AND_TROUBLESHOOTING.md](./ERRORS_AND_TROUBLESHOOTING.md)
- **Deployment verification:** [DEPLOYMENT.md](./DEPLOYMENT.md#post-deployment-verification)
- **Sentry testing:** [sentry-setup-checklist.md](./sentry-setup-checklist.md)

---

**Last Updated:** February 2026  
**Testing Maturity:** Level 2 (Manual + Some Automation)  
**Next Review:** After implementing automated test suite
