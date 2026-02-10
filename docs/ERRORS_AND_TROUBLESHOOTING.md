# Errors and Troubleshooting Guide

## Fast Triage

When something breaks, follow this numbered checklist:

1. **Check environment variables** - Most issues stem from missing or incorrect env vars
2. **Check Vercel/browser console** - Look for error messages
3. **Check Sentry dashboard** - Recent errors with stack traces
4. **Check Stripe dashboard** - Webhook delivery status, event logs
5. **Clear Next.js cache** - `rm -rf .next` and restart dev server
6. **Check Firebase Console** - Auth users, Firestore data
7. **Check Upstash Redis** - Connection status, rate limit hits
8. **Run TypeScript check** - `npx tsc --noEmit` for type errors

---

## Firebase Initialization Errors

### Error: "No Firebase App '[DEFAULT]' has been created"

**Symptom:** Console error on page load or in API route.

**Probable Cause:**
- Calling `getAuth()` or `getFirestore()` before Firebase app is initialized
- Violating browser-only pattern (calling Firebase functions at top level)

**Verification Steps:**
```bash
# Check if file follows browser-only pattern
grep -n "getAuth()" lib/*.ts
grep -n "getFirestore()" lib/*.ts

# Should only appear in lib/firebase.ts initialization
```

**Fix Steps:**

**Option 1 - Import pre-initialized instances:**
```typescript
// ❌ Wrong
import { getAuth } from 'firebase/auth';
const auth = getAuth();

// ✅ Correct
import { auth } from '@/lib/firebase';
// auth is already initialized
```

**Option 2 - Use browser-only pattern:**
```typescript
let auth;
if (typeof window !== 'undefined') {
  await import('@/lib/firebase'); // Triggers initialization
  const { getAuth } = await import('firebase/auth');
  auth = getAuth();
}
```

**Prevention:**
- Always import `auth` and `db` from `/lib/firebase.ts`, never call getters directly
- Review [FIREBASE_BROWSER_ONLY_COMPLETE.md](../FIREBASE_BROWSER_ONLY_COMPLETE.md)

---

### Error: "Expected first argument to doc() to be a CollectionReference..."

**Symptom:** Runtime error when calling Firestore functions.

**Probable Cause:**
- `db` is null/undefined (not initialized yet)
- Calling Firestore functions before browser initialization complete

**Verification Steps:**
```typescript
// Add debug logging
console.log('DB initialized?', db !== null);
console.log('DB value:', db);
```

**Fix Steps:**
1. Use helper functions from `/lib/firestore.ts` instead of direct Firestore calls
2. Add null checks before using `db`
3. Ensure component waits for Firebase initialization

```typescript
// ❌ Wrong
const userRef = doc(collection(db, 'users'), userId);

// ✅ Correct - Use helper
const { getUserSubscription } = await import('@/lib/firestore');
const subscription = await getUserSubscription(userId);
```

**Prevention:**
- Always use Firestore helper functions from `/lib/firestore.ts` in components
- Never call Firestore functions directly in pages/components

**Deep dive:** [firestore-helper-functions-fix.md](./firestore-helper-functions-fix.md)

---

### Error: "Firebase Admin not initialized"

**Symptom:** API route returns 500 error with "Firebase Admin not initialized".

**Probable Cause:**
- Missing environment variables: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`
- Private key format incorrect (missing quotes or `\n` characters)

**Verification Steps:**
```bash
# Check env vars are set
cat .env.local | grep FIREBASE_PROJECT_ID
cat .env.local | grep FIREBASE_CLIENT_EMAIL
cat .env.local | grep FIREBASE_PRIVATE_KEY

# Verify format
echo $FIREBASE_PRIVATE_KEY | head -c 50
# Should start with: "-----BEGIN PRIVATE KEY-----\n
```

**Fix Steps:**
1. Ensure `.env.local` exists with all Firebase Admin variables
2. Verify `FIREBASE_PRIVATE_KEY` has quotes and preserves `\n` characters:
   ```bash
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyHere\n-----END PRIVATE KEY-----\n"
   ```
3. Restart dev server: `npm run dev`

**Prevention:**
- Use `.env.example` as template
- Never remove quotes from `FIREBASE_PRIVATE_KEY`
- Add null check in API routes: `if (!adminDb) { return error }`

**Deep dive:** [SETUP.md](./SETUP.md#2-firebase-authentication--database)

---

## Authentication Errors

### Error: 401 "Unauthorized - No authentication token provided"

**Symptom:** API request returns 401 immediately.

**Probable Cause:**
- Missing `Authorization` header in fetch request
- Token not prefixed with "Bearer "

**Verification Steps:**
```typescript
// Check browser Network tab
// Headers should include:
Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

**Fix Steps:**
```typescript
// ❌ Wrong
const response = await fetch('/api/stripe/upgrade-subscription', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ newTier: 'premium' })
});

// ✅ Correct
const user = auth?.currentUser;
const token = await user?.getIdToken();

const response = await fetch('/api/stripe/upgrade-subscription', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ newTier: 'premium' })
});
```

**Prevention:**
- Always include Authorization header for protected routes
- Reference existing components (e.g., `ManageSubscriptionModal.tsx`) for auth token pattern

---

### Error: 401 "Authentication token has expired"

**Symptom:** API returns 401 after user has been signed in for a while.

**Probable Cause:**
- Firebase ID token expired (tokens expire after 1 hour)
- User needs to refresh token

**Fix Steps:**
```typescript
// Get fresh token with force refresh
const token = await user?.getIdToken(true); // true = force refresh
```

**Prevention:**
- Catch 401 errors and retry with fresh token
- Implement automatic token refresh in AuthContext

---

## Stripe Integration Errors

### Error: "No active subscription found"

**Symptom:** API returns 400 when trying to update payment method or manage subscription.

**Probable Cause:**
- User's Firestore document doesn't have `stripeCustomerId` or `stripeSubscriptionId`
- User signed up but never completed checkout

**Verification Steps:**
```bash
# Check Firestore document
# Look for subscription.stripeCustomerId and subscription.stripeSubscriptionId
# Both should be non-null for paid users
```

**Fix Steps:**
1. If user paid but IDs missing → Check pending_subscriptions collection
2. If found → Manually link or have user "claim" subscription
3. If not found → User needs to complete checkout/payment

**Prevention:**
- Ensure webhooks are properly configured in Stripe Dashboard
- Monitor pending_subscriptions for unclaimed entries

---

### Error: "Failed to create setup intent: 500"

**Symptom:** Update Payment Method modal fails to open.

**Probable Cause:**
- API trying to use client-side Firebase function on server
- `adminDb` is null

**Verification Steps:**
```bash
# Check create-setup-intent route
cat app/api/stripe/create-setup-intent/route.ts | grep "getUserProfile"
# Should NOT find this - it's a client function

cat app/api/stripe/create-setup-intent/route.ts | grep "adminDb"
# Should use adminDb for server-side queries
```

**Fix Steps:**
- Use Firebase Admin SDK in API routes: `adminDb.collection('users').doc(userId).get()`
- Never use client-side helpers (`getUserProfile`, `getUserSubscription`) in API routes

**Prevention:**
- API routes: Always use `/lib/firebase/admin`
- Components: Always use `/lib/firebase` and `/lib/firestore`

**Deep dive:** [create-setup-intent-500-error-fix.md](./create-setup-intent-500-error-fix.md)

---

### Error: Stripe webhook signature verification failed

**Symptom:** Webhook returns 400, Stripe Dashboard shows failed delivery.

**Probable Cause:**
- `STRIPE_WEBHOOK_SECRET` missing or incorrect
- Webhook signing secret doesn't match endpoint

**Verification Steps:**
1. Check Stripe Dashboard → Developers → Webhooks
2. Find webhook endpoint for your domain
3. Click "Signing secret" → Reveal
4. Compare with `.env.local` value

**Fix Steps:**
1. Copy correct signing secret from Stripe Dashboard
2. Update `.env.local`:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
3. Restart server
4. Test with Stripe CLI:
   ```bash
   stripe trigger checkout.session.completed
   ```

**Prevention:**
- Document webhook signing secret in team password manager
- Verify webhook endpoint URL matches deployed domain

---

## Rate Limiting Errors

### Error: 429 "Too many requests. Please try again in X seconds."

**Symptom:** API returns 429 with retry-after information.

**Probable Cause:**
- User or IP exceeded rate limit for endpoint
- Potential bot/abuse attempt

**Verification Steps:**
- Check Upstash Redis dashboard for rate limit hits
- Check IP address making requests
- Check if legitimate user or potential abuse

**Fix Steps:**

**For legitimate traffic:**
1. Consider increasing rate limit for specific endpoint
2. Update limiter in `/lib/middleware/rateLimiting.ts`
3. Redeploy

**For abuse:**
1. Block IP at load balancer/Vercel level
2. Review Sentry logs for patterns
3. Consider adding additional authentication

**Prevention:**
- Monitor rate limit hits in Upstash dashboard
- Set alerts for unusual spikes
- Educate users about rate limits

---

### Warning: "Rate limiting disabled - Redis not available"

**Symptom:** Console warning on API requests.

**Probable Cause:**
- `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` not set
- Upstash Redis database down or unreachable

**Verification Steps:**
```bash
# Check env vars exist
env | grep UPSTASH

# Test Redis connection (from Upstash Console)
# Try sample commands
```

**Fix Steps:**
1. Add Upstash credentials to `.env.local`:
   ```bash
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```
2. Restart server
3. Verify warning disappears

**Production impact:** ⚠️ **CRITICAL** - Without Redis, API is vulnerable to abuse.

**Prevention:**
- Always configure Upstash Redis in production
- Set up monitoring/alerts for Redis availability

---

## Build and Type Errors

### Error: "Type 'undefined' cannot be used as an index type"

**Symptom:** `npx tsc --noEmit` fails with index type error.

**Probable Cause:**
- Variable used as object key might be undefined
- TypeScript can't guarantee variable is defined

**Example:**
```typescript
const tierPriceIds: Record<string, string> = { ... };
const newPriceId = tierPriceIds[newTier]; // newTier might be undefined
```

**Fix Steps:**
```typescript
// Add fallback
const tierToUse = newTier || currentTier || 'essential';
const newPriceId = tierPriceIds[tierToUse];
```

**Prevention:**
- Use optional chaining and nullish coalescing
- Add explicit type guards or runtime checks

---

### Error: "Property 'X' does not exist on type 'Response<Subscription>'"

**Symptom:** TypeScript error when accessing Stripe object properties.

**Probable Cause:**
- Stripe TypeScript definitions don't expose all properties
- Using older Stripe API version

**Fix Steps:**
```typescript
// Cast to any when accessing dynamic properties
const subscription = await stripe.subscriptions.retrieve(subId);
const periodEnd = (subscription as any).current_period_end;
```

**Prevention:**
- Use type casting for Stripe API responses where needed
- Document which properties require casting

---

### Build Error: "Module not found" or import errors

**Symptom:** Build fails with module resolution errors.

**Probable Cause:**
- Incorrect import paths
- Missing dependency in package.json
- Cache corruption

**Fix Steps:**
1. Verify import path: `@/` should map to project root
2. Check dependency installed:
   ```bash
   npm list [package-name]
   ```
3. Clear cache and reinstall:
   ```bash
   rm -rf .next node_modules
   npm install
   ```

**Prevention:**
- Use absolute imports with `@/` prefix consistently
- Run `npm install` after pulling new code

---

## Webhook Processing Errors

### Error: "No user found with Stripe customer ID"

**Symptom:** Sentry logs error, webhook doesn't update Firestore.

**Expected behavior:** This is normal for "pay first, sign up later" flow.

**What should happen:**
1. Webhook creates document in `pending_subscriptions` collection
2. User signs up later
3. Signup claims pending subscription

**Verification Steps:**
```bash
# Check pending_subscriptions collection in Firebase Console
# Should see document with email as ID
```

**If pending subscription not created:**
1. Check webhook received customer email from Stripe
2. Verify `pending_subscriptions` write succeeded
3. Check Sentry for errors in webhook handler

**Deep dive:** [pending-subscriptions-system.md](./pending-subscriptions-system.md)

---

### Error: Webhook returns 200 but Firestore not updated

**Symptom:** Stripe shows webhook delivered successfully, but Firestore unchanged.

**Probable Cause:**
- Webhook handler caught error silently
- Firestore write failed due to permissions
- Wrong collection/document path

**Verification Steps:**
1. Check server logs for errors
2. Check Sentry for captured exceptions
3. Verify Firestore document exists at expected path
4. Check Firebase Console → Firestore for recent writes

**Fix Steps:**
1. Review webhook handler try-catch blocks
2. Ensure errors are logged/captured
3. Verify Firestore paths match schema
4. Check Firebase Admin SDK permissions

**Prevention:**
- Always log significant events in webhook handler
- Capture exceptions with Sentry
- Test webhooks locally with Stripe CLI

---

## Payment Method Errors

### Error: "Card was declined"

**Symptom:** SetupIntent confirmation fails with card error.

**Probable Cause:**
- User's card declined by bank
- Insufficient funds
- Card expired or blocked

**Fix Steps:**
1. Show user-friendly error: "Your card was declined. Please try a different card."
2. Allow user to retry with different card
3. Link to Stripe's common decline codes: https://stripe.com/docs/declines

**Prevention:**
- Clear error messaging in UI
- Suggest alternative payment methods

---

### Error: "Payment method already attached to a different customer"

**Symptom:** Attach payment method API returns error.

**Probable Cause:**
- Payment method was previously used with different Stripe customer
- Attempting to reuse payment method across accounts

**Fix Steps:**
1. Detach payment method from old customer (if accessible)
2. User must enter card details again
3. Stripe will create new payment method

**Prevention:**
- This is Stripe's intended behavior
- Show clear message: "Please enter your payment details again"

---

## Subscription Management Errors

### Error: "Subscription not found" when upgrading/downgrading

**Symptom:** API returns error when trying to update subscription.

**Probable Cause:**
- `stripeSubscriptionId` in Firestore doesn't match Stripe
- Subscription was deleted in Stripe but not Firestore

**Verification Steps:**
1. Check Firestore: `subscription.stripeSubscriptionId`
2. Check Stripe Dashboard: Search for subscription ID
3. Verify subscription exists and is active

**Fix Steps:**

**If subscription exists in Stripe:**
- Update Firestore with correct subscription ID

**If subscription doesn't exist in Stripe:**
- Create new subscription via checkout
- Update Firestore with new subscription ID

**Prevention:**
- Keep Firestore in sync with Stripe via webhooks
- Never manually modify Stripe subscriptions without updating Firestore

---

### Error: Proration preview shows $0 for upgrade

**Symptom:** Upgrade modal shows $0 due when it should charge.

**Probable Cause:**
- Current subscription has credit balance
- Price IDs are incorrect
- Proration calculation error

**Verification Steps:**
1. Check Stripe customer → Invoices for credit balance
2. Verify price IDs in code match Stripe Dashboard
3. Check preview API response in Network tab

**Fix Steps:**
1. If credit balance → This is correct behavior
2. If price IDs wrong → Update in code and redeploy
3. If calculation error → Review proration logic in API

**Prevention:**
- Validate price IDs during deployment
- Add unit tests for proration calculations

---

## Build and Deployment Errors

### Error: Vercel build fails with TypeScript errors

**Symptom:** Deployment fails during `npm run build`.

**Probable Cause:**
- TypeScript errors in code
- Type definitions missing
- Incorrect imports

**Verification Steps:**
```bash
# Run TypeScript check locally
npx tsc --noEmit

# Shows all type errors
```

**Fix Steps:**
1. Address each TypeScript error shown
2. Add type casts where necessary: `(variable as Type)`
3. Add null checks: `variable?.property`
4. Fix import paths

**Prevention:**
- Run `npx tsc --noEmit` before every commit
- Enable TypeScript checking in IDE
- Set up pre-commit hook for type checking

---

### Error: "Cannot find module '@/...' "

**Symptom:** Build fails with module resolution error.

**Probable Cause:**
- `tsconfig.json` paths not configured correctly
- Import using wrong alias

**Verification Steps:**
```bash
# Check tsconfig.json has:
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Fix Steps:**
1. Verify `tsconfig.json` paths configuration
2. Use `@/` prefix for all absolute imports
3. Restart TypeScript server in IDE

---

## Runtime Errors

### Error: "Cannot read properties of null (reading 'currentUser')"

**Symptom:** Browser console error when accessing auth state.

**Probable Cause:**
- `auth` is null (not initialized)
- Component rendering before Firebase ready

**Fix Steps:**
```typescript
// Add null checks
const user = auth?.currentUser;
if (!user) {
  return <div>Loading...</div>;
}

// Or use useAuth hook
const { user, loading } = useAuth();
if (loading) return <div>Loading...</div>;
if (!user) return <div>Please sign in</div>;
```

**Prevention:**
- Always use optional chaining: `auth?.currentUser`
- Use `useAuth()` hook for consistent auth state management

---

### Error: "Quota exceeded" from Firestore

**Symptom:** Firestore operations fail with quota error.

**Probable Cause:**
- Too many reads/writes in short period
- Inefficient queries reading large collections
- Missing indexes causing full collection scans

**Verification Steps:**
1. Check Firebase Console → Usage tab
2. Check for queries without indexes
3. Review recent code changes for inefficient queries

**Fix Steps:**
1. Add missing Firestore indexes
2. Optimize queries (use `.limit()`, query specific fields)
3. Cache frequently read data
4. Upgrade Firebase plan if hitting limits

**Prevention:**
- Use pagination for large collections
- Add composite indexes for complex queries
- Monitor Firebase usage regularly

---

## Slack Notification Errors

### Error: "Failed to send Slack notification"

**Symptom:** Console error but signup continues successfully.

**Probable Cause:**
- `SLACK_WEBHOOK_URL` missing or incorrect
- Slack webhook endpoint changed/disabled
- Network error reaching Slack

**Verification Steps:**
```bash
# Check env var exists
echo $SLACK_WEBHOOK_URL

# Test webhook manually
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{"text":"Test message"}'
```

**Fix Steps:**
1. Verify webhook URL in Slack settings
2. Update `.env.local` with correct URL
3. Restart server

**Impact:** Low - Notifications are non-blocking, signup succeeds anyway.

**Prevention:**
- Test Slack webhooks after any Slack workspace changes
- Monitor notification failures in Sentry

---

## Delivery Scout API Errors

### Error: 401 "Unauthorized" from delivery-scout

**Symptom:** Lindy AI cannot access endpoint.

**Probable Cause:**
- `DELIVERY_SCOUT_API_KEY` missing or incorrect in Lindy AI configuration
- API key environment variable not set on server

**Fix Steps:**
1. Generate new API key if needed:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
2. Update Lindy AI configuration with API key
3. Update server environment variable
4. Redeploy

**Prevention:**
- Store API key in team password manager
- Document API key rotation procedure

---

### Error: "Invalid action" from delivery-scout

**Symptom:** Lindy AI request returns 400 with invalid action.

**Probable Cause:**
- Action name misspelled or not implemented
- Lindy AI sending incorrect action value

**Supported actions:**
- `update_meeting`, `update_metrics`, `update_company_info`
- `add_site`, `update_site`
- `add_report`
- `create_ticket`, `update_ticket`
- `create_user`

**Fix Steps:**
1. Verify action name matches one of supported actions (case-sensitive)
2. Update Lindy AI configuration with correct action
3. Test with curl:
   ```bash
   curl -X POST http://localhost:3000/api/delivery-scout \
     -H "Authorization: Bearer YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{"action":"create_ticket","userId":"test123","data":{...}}'
   ```

---

## Environment Variable Checklist

When experiencing any error, verify all required environment variables are set:

### Required for All Environments

```bash
# Stripe
✅ STRIPE_SECRET_KEY
✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
✅ STRIPE_WEBHOOK_SECRET

# Firebase Admin SDK (server-side)
✅ FIREBASE_PROJECT_ID
✅ FIREBASE_CLIENT_EMAIL
✅ FIREBASE_PRIVATE_KEY

# Firebase Client SDK (browser-side)
✅ NEXT_PUBLIC_FIREBASE_API_KEY
✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID
✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
✅ NEXT_PUBLIC_FIREBASE_APP_ID

# Upstash Redis (rate limiting)
⚠️ UPSTASH_REDIS_REST_URL (required in production)
⚠️ UPSTASH_REDIS_REST_TOKEN (required in production)
```

### Optional Variables

```bash
# Notifications
SLACK_WEBHOOK_URL (for new user notifications)
NEXT_PUBLIC_ZAPIER_WEBHOOK_URL (for support tickets)

# Delivery Scout
DELIVERY_SCOUT_API_KEY (for Lindy AI integration)

# Monitoring
SENTRY_AUTH_TOKEN (for source map uploads)
NEXT_PUBLIC_SENTRY_DSN (for error tracking)
SENTRY_ORG
SENTRY_PROJECT
```

**Verification command:**
```bash
# Check all env vars loaded
node -e "console.log(Object.keys(process.env).filter(k => k.includes('STRIPE') || k.includes('FIREBASE') || k.includes('UPSTASH')))"
```

---

## Cross-References

- **Environment setup:** [SETUP.md](./SETUP.md)
- **Environment variables:** [ENVIRONMENT_VARIABLES.md](./ENVIRONMENT_VARIABLES.md)
- **Security issues:** [SECURITY_MODEL.md](./SECURITY_MODEL.md)
- **API reference:** [API_INDEX.md](./API_INDEX.md)
- **Firebase patterns:** [FIREBASE_BROWSER_ONLY_COMPLETE.md](../FIREBASE_BROWSER_ONLY_COMPLETE.md)

---

## Getting Help

1. **Check Sentry dashboard** for recent errors: https://tradesitegenie.sentry.io
2. **Search existing docs** in `/docs` folder for specific issues
3. **Review commit history** for recent changes that might have broken functionality
4. **Check Stripe Dashboard** for webhook delivery failures and event logs
5. **Review Firebase Console** for Firestore data inconsistencies

---

**Last Updated:** February 2026  
**Next Review:** When new error patterns emerge or after major releases
