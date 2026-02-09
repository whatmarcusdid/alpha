# Pending Subscriptions System

## Overview

Handles the race condition where Stripe webhooks arrive **before** users complete signup. When a user pays on Stripe Checkout and the webhook fires before they create their account, we store the subscription in a `pending_subscriptions` collection to be claimed later.

---

## The Problem: Race Condition

### **Original Flow (Broken):**

```
1. User pays on Stripe Checkout
   ↓
2. Stripe webhook fires: checkout.session.completed
   ↓ Looks for user by stripeCustomerId
   ↓ ❌ User doesn't exist yet!
   ↓ Webhook fails and logs error
   ↓
3. User redirected to /signup
   ↓
4. User creates account
   ↓ But webhook already failed!
   ↓ ❌ User's subscription never activates
```

### **New Flow (Fixed):**

```
1. User pays on Stripe Checkout
   ↓
2. Stripe webhook fires: checkout.session.completed
   ↓ Looks for user by stripeCustomerId
   ↓ User doesn't exist yet
   ↓ ✅ Store in pending_subscriptions collection (keyed by email)
   ↓
3. User redirected to /signup
   ↓
4. User creates account
   ↓ ✅ Check for pending subscription by email
   ↓ ✅ Claim pending subscription and link to user
   ↓ ✅ User's subscription activates correctly
```

---

## Implementation

### **1. Webhook Handler** (`/app/api/webhooks/stripe/route.ts`)

When no user is found by `stripeCustomerId`, the webhook now:

1. **Retrieves customer email from Stripe**
   ```typescript
   const customer = await stripe.customers.retrieve(customerId);
   const customerEmail = (customer as Stripe.Customer).email;
   ```

2. **Normalizes email** (lowercase, trimmed)
   ```typescript
   const normalizedEmail = customerEmail.toLowerCase().trim();
   ```

3. **Fetches subscription details**
   ```typescript
   const subscription = await stripe.subscriptions.retrieve(subscriptionId);
   ```

4. **Stores in `pending_subscriptions` collection**
   ```typescript
   await adminDb.collection('pending_subscriptions').doc(normalizedEmail).set({
     email: normalizedEmail,
     stripeCustomerId: customerId,
     stripeSubscriptionId: subscriptionId,
     stripeSessionId: session.id,
     tier: session.metadata?.tier || 'essential',
     billingCycle: session.metadata?.billingCycle || 'annual',
     amount: session.amount_total ? session.amount_total / 100 : 0,
     subscription: subscriptionData,
     createdAt: admin.firestore.Timestamp.now(),
     status: 'pending',
   });
   ```

---

## Firestore Schema

### **`pending_subscriptions` Collection**

Document ID: `{normalizedEmail}` (e.g., `"john@example.com"`)

```typescript
{
  email: string;                    // "john@example.com" (lowercase, trimmed)
  stripeCustomerId: string;         // "cus_..."
  stripeSubscriptionId: string;     // "sub_..."
  stripeSessionId: string;          // "cs_..."
  tier: 'essential' | 'advanced' | 'premium';
  billingCycle: 'monthly' | 'annual';
  amount: number;                   // 899.00 (in dollars, not cents)
  subscription: {
    id: string;                     // "sub_..."
    status: string;                 // "active"
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    priceId: string;                // "price_..."
  } | null;
  createdAt: Timestamp;
  status: 'pending' | 'claimed';    // 'pending' until user claims it
}
```

---

## Next Steps: Claiming Pending Subscriptions

### **TODO: Update Signup Flow**

The signup flow needs to be updated to check for and claim pending subscriptions.

**File to update:** `/components/auth/SignUpForm.tsx` or `/lib/firestore.ts`

**After user signs up, add:**

```typescript
// After createUserWithSubscription() completes...

// Check for pending subscription by email
const normalizedEmail = user.email.toLowerCase().trim();
const pendingRef = adminDb.collection('pending_subscriptions').doc(normalizedEmail);
const pendingDoc = await pendingRef.get();

if (pendingDoc.exists) {
  const pendingData = pendingDoc.data();
  
  // Link Stripe customer to user
  await linkStripeCustomer(
    user.uid,
    pendingData.stripeCustomerId,
    pendingData.stripeSubscriptionId
  );
  
  // Mark as claimed
  await pendingRef.update({
    status: 'claimed',
    claimedAt: admin.firestore.Timestamp.now(),
    userId: user.uid,
  });
  
  console.log(`✅ Claimed pending subscription for ${normalizedEmail}`);
}
```

---

## API Endpoints Needed

### **1. Check Pending Subscription** (Optional)

If you want to show users their subscription info BEFORE they create an account:

**Endpoint:** `GET /api/stripe/check-pending-subscription?email=john@example.com`

**Response:**
```json
{
  "hasPendingSubscription": true,
  "tier": "premium",
  "billingCycle": "annual",
  "amount": 2999.00
}
```

### **2. Claim Pending Subscription** (Automatic)

This should happen automatically during signup, but could also be a separate API:

**Endpoint:** `POST /api/stripe/claim-pending-subscription`

**Body:**
```json
{
  "userId": "firebase-user-id",
  "email": "john@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "stripeCustomerId": "cus_...",
  "stripeSubscriptionId": "sub_..."
}
```

---

## Error Handling

### **No Email on Stripe Customer**

If the Stripe customer doesn't have an email:

```typescript
if (!customerEmail) {
  Sentry.captureMessage('Webhook: No email found for customer', {
    level: 'error',
    extra: { customerId, sessionId: session.id },
  });
  console.error(`No email found for Stripe customer: ${customerId}`);
  return;
}
```

**Why this matters:** We use email as the key for pending subscriptions. Without email, we can't store or claim the subscription later.

### **Duplicate Pending Subscriptions**

Since document ID is the email, if a user pays twice before signing up:
- The second payment **overwrites** the first in `pending_subscriptions`
- This is actually desirable - we only care about the most recent payment
- Older payments are still tracked in Stripe

### **User Signs Up with Different Email**

If a user:
1. Pays with `john@example.com` on Stripe
2. Signs up with `john.smith@example.com` (different email)

**Problem:** The pending subscription won't be found!

**Solution:**
- Display a message during signup: "Using the email you paid with?"
- Or: Build an admin tool to manually link subscriptions
- Or: Email verification step that confirms the Stripe email

---

## Testing

### **Test Scenario 1: Normal Flow (User Exists)**

1. User has existing account with `stripeCustomerId`
2. User upgrades/changes subscription
3. Webhook finds user by `stripeCustomerId`
4. ✅ Updates user's subscription directly

### **Test Scenario 2: Pending Flow (User Doesn't Exist)**

1. New user pays on Stripe Checkout
2. Webhook fires before signup
3. ✅ Creates pending subscription document
4. User signs up with same email
5. ✅ Signup claims pending subscription
6. ✅ User's account activated with correct subscription

### **Test Scenario 3: Multiple Payments Before Signup**

1. User pays for Essential plan
2. ✅ Pending subscription created
3. User pays again for Premium plan (before signing up)
4. ✅ Pending subscription updated (overwrites Essential)
5. User signs up
6. ✅ Claims the Premium subscription (most recent)

### **Test Scenario 4: Email Mismatch**

1. User pays with `john@example.com`
2. ✅ Pending subscription created
3. User signs up with `john.smith@gmail.com` (different)
4. ❌ Pending subscription not found
5. **Manual intervention needed** to link subscription

---

## Monitoring

### **Sentry Events**

**Success:**
```
Level: info
Message: "Webhook: Stored pending subscription"
Extra: { email, customerId, subscriptionId }
```

**Error:**
```
Level: error
Message: "Webhook: No email found for customer"
Extra: { customerId, sessionId }
```

### **Firestore Query to Find Unclaimed Subscriptions**

```typescript
const unclaimedRef = adminDb.collection('pending_subscriptions')
  .where('status', '==', 'pending')
  .where('createdAt', '<', new Date(Date.now() - 24 * 60 * 60 * 1000)); // Older than 24 hours

const snapshot = await unclaimedRef.get();
console.log(`${snapshot.size} unclaimed subscriptions older than 24 hours`);
```

---

## Admin Tools Needed

### **1. View Pending Subscriptions**

Dashboard to see all pending subscriptions:
- Email
- Tier
- Amount
- Time pending
- Link to Stripe customer

### **2. Manually Link Subscription**

For email mismatches, allow admin to:
1. Search for user by email
2. Search for pending subscription by Stripe customer ID
3. Manually link them

### **3. Cleanup Old Pending Subscriptions**

After 30 days, if a pending subscription hasn't been claimed:
- Mark as `expired`
- Send notification to user (if we have their email)
- Or: Refund via Stripe

---

## Security Considerations

### **Email Privacy**

Pending subscriptions are keyed by email. Consider:
- ✅ Email is already in Stripe (not exposing new data)
- ✅ Only accessible via Firebase Admin SDK (server-side)
- ⚠️ Don't expose pending subscriptions via public API without auth

### **Webhook Signature Verification**

Already implemented:
```typescript
event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
```

This ensures only legitimate Stripe webhooks can create pending subscriptions.

---

## Cleanup Strategy

### **Option 1: Delete After Claim**

```typescript
// After claiming, delete the pending doc
await pendingRef.delete();
```

**Pros:** Clean Firestore, no old data  
**Cons:** No audit trail

### **Option 2: Mark as Claimed (Recommended)**

```typescript
// After claiming, mark as claimed
await pendingRef.update({
  status: 'claimed',
  claimedAt: Timestamp.now(),
  userId: user.uid,
});
```

**Pros:** Audit trail, can debug issues  
**Cons:** Firestore grows over time

**Cleanup job:** Delete claimed docs older than 90 days

---

## Related Files

| File | Purpose |
|------|---------|
| `/app/api/webhooks/stripe/route.ts` | ✅ Updated - stores pending subscriptions |
| `/components/auth/SignUpForm.tsx` | ❌ TODO - needs to claim pending subscriptions |
| `/lib/firestore.ts` | ❌ TODO - add `claimPendingSubscription()` function |
| `/app/api/stripe/claim-pending-subscription/route.ts` | ❌ TODO - optional API endpoint |

---

## Summary

✅ **What's Done:**
- Webhook stores pending subscriptions when user doesn't exist
- Email used as key for later lookup
- Sentry tracking for success/errors
- Stripe API version locked to prevent breaking changes

❌ **What's Next:**
- Update signup flow to check for and claim pending subscriptions
- Create `claimPendingSubscription()` helper function
- Add admin dashboard to view/manage pending subscriptions
- Implement cleanup job for old pending docs

**Priority:** HIGH - Signup flow must claim pending subscriptions or users won't get their access! 🚨
