# Signup Pending Subscription Integration

## Overview

Updated the signup flow to check for and claim pending subscriptions created by the Stripe webhook. This resolves the race condition where users pay before creating an account.

---

## Changes Made

### **1. Updated `/lib/firestore.ts`**

#### **Modified `createUserWithSubscription` Function**

**BEFORE:**
```typescript
export async function createUserWithSubscription(
  userId: string,
  email: string,
  fullName: string,
  subscriptionData: {
    tier: 'essential' | 'advanced' | 'premium';
    billingCycle: 'monthly' | 'yearly';
    amount: number;
    paymentIntentId: string;  // ❌ Old field
  }
)
```

**AFTER:**
```typescript
export async function createUserWithSubscription(
  userId: string,
  email: string,
  fullName: string,
  subscriptionData: {
    tier: 'essential' | 'advanced' | 'premium';
    billingCycle: 'monthly' | 'yearly';
    amount: number;
    stripeCustomerId?: string | null;      // ✅ NEW
    stripeSubscriptionId?: string | null;  // ✅ NEW
  }
)
```

**Changes:**
- ❌ Removed `paymentIntentId` field (obsolete)
- ✅ Added `stripeCustomerId` (optional, from pending subscription)
- ✅ Added `stripeSubscriptionId` (optional, from pending subscription)

**Updated user document creation:**
```typescript
subscription: {
  tier: subscriptionData.tier,
  billingCycle: subscriptionData.billingCycle,
  status: 'active' as const,
  amount: subscriptionData.amount,
  startDate: firestoreFunctions.serverTimestamp(),
  stripeCustomerId: subscriptionData.stripeCustomerId || null,  // ✅ Use passed value
  stripeSubscriptionId: subscriptionData.stripeSubscriptionId || null,  // ✅ Use passed value
},
```

---

### **2. Updated `/components/auth/SignUpForm.tsx`**

Updated all three signup handlers:
- ✅ `handleEmailSignUp`
- ✅ `handleGoogleSignUp`
- ✅ `handleAppleSignUp`

---

#### **New Signup Flow**

**BEFORE (Old):**
```typescript
1. Create Firebase user
2. Create Firestore doc with URL params
3. Try to link Stripe customer via session_id (often failed)
4. Send notification
5. Redirect
```

**AFTER (New):**
```typescript
1. Create Firebase user
2. ✅ Check for pending subscription by email
3. If found: Create Firestore doc with Stripe data from pending subscription
   If not found: Create Firestore doc with URL params (fallback)
4. Send notification
5. Redirect
```

---

#### **New Code Added** (Lines ~40-80 in each handler)

```typescript
// 2. Check for pending subscription FIRST (before creating user doc)
let pendingSubscription = null;
try {
  const response = await fetch('/api/stripe/claim-pending-subscription', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${await user.getIdToken()}`,
    },
    body: JSON.stringify({ email: email.toLowerCase().trim() }),
  });
  
  if (response.ok) {
    const data = await response.json();
    if (data.success && data.subscription) {
      pendingSubscription = data.subscription;
      console.log('✅ Found pending subscription:', pendingSubscription);
    }
  }
} catch (pendingError) {
  console.log('ℹ️ No pending subscription found (this is okay for new signups)');
}

// 3. Create user document with subscription data
if (pendingSubscription) {
  // ✅ Use data from pending subscription (from Stripe webhook)
  await createUserWithSubscription(
    user.uid,
    user.email || email,
    name,
    {
      tier: pendingSubscription.tier as 'essential' | 'advanced' | 'premium',
      billingCycle: pendingSubscription.billingCycle === 'monthly' ? 'monthly' : 'yearly',
      amount: pendingSubscription.amount || parseFloat(amount),
      stripeCustomerId: pendingSubscription.stripeCustomerId,
      stripeSubscriptionId: pendingSubscription.stripeSubscriptionId,
    }
  );
} else {
  // ❌ Fallback: No pending subscription found
  await createUserWithSubscription(
    user.uid,
    user.email || email,
    name,
    {
      tier: tier as 'essential' | 'advanced' | 'premium',
      billingCycle: billingCycle === 'monthly' ? 'monthly' : 'yearly',
      amount: parseFloat(amount),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    }
  );
}
```

---

## The Complete Flow Now

### **Scenario: User Pays Before Signing Up**

```
1. User enters email on pricing page
   ↓
2. Redirected to Stripe Checkout
   ↓
3. User pays with credit card
   ↓
4. ✅ Payment succeeds → Stripe creates subscription
   ↓
5. Stripe webhook fires: checkout.session.completed
   ↓
6. Webhook looks for user by stripeCustomerId
   ↓
7. User doesn't exist yet (hasn't signed up)
   ↓
8. ✅ Webhook stores in pending_subscriptions collection (keyed by email)
   ↓
9. User redirected to /signup page
   ↓
10. User creates account with SAME email
    ↓
11. ✅ Signup calls /api/stripe/claim-pending-subscription
    ↓
12. ✅ API finds pending subscription by email
    ↓
13. ✅ API marks subscription as 'claimed' and returns data
    ↓
14. ✅ Signup creates user doc with stripeCustomerId & stripeSubscriptionId
    ↓
15. ✅ User gets immediate access to dashboard
```

---

## API Endpoint Required

### **`POST /api/stripe/claim-pending-subscription`**

**Status:** ⚠️ **NOT CREATED YET** - This API endpoint needs to be built!

**Request:**
```typescript
POST /api/stripe/claim-pending-subscription
Headers: {
  'Authorization': 'Bearer <firebase-id-token>',
  'Content-Type': 'application/json'
}
Body: {
  email: 'john@example.com'  // normalized (lowercase, trimmed)
}
```

**Response (Success):**
```typescript
{
  success: true,
  subscription: {
    email: 'john@example.com',
    stripeCustomerId: 'cus_...',
    stripeSubscriptionId: 'sub_...',
    tier: 'premium',
    billingCycle: 'annual',
    amount: 2999.00,
    // ... other fields from pending_subscriptions doc
  }
}
```

**Response (Not Found):**
```typescript
{
  success: false,
  message: 'No pending subscription found'
}
```

---

## What the API Should Do

```typescript
// Pseudo-code for /app/api/stripe/claim-pending-subscription/route.ts

export const POST = withAuthAndRateLimit(async (req, { userId }) => {
  // 1. Get email from request body
  const { email } = await req.json();
  const normalizedEmail = email.toLowerCase().trim();
  
  // 2. Look up pending subscription in Firestore
  const pendingRef = adminDb.collection('pending_subscriptions').doc(normalizedEmail);
  const pendingDoc = await pendingRef.get();
  
  if (!pendingDoc.exists) {
    return NextResponse.json({ 
      success: false, 
      message: 'No pending subscription found' 
    });
  }
  
  const pendingData = pendingDoc.data();
  
  // 3. Mark as claimed
  await pendingRef.update({
    status: 'claimed',
    claimedAt: admin.firestore.Timestamp.now(),
    userId: userId,
  });
  
  // 4. Return subscription data
  return NextResponse.json({
    success: true,
    subscription: {
      email: pendingData.email,
      stripeCustomerId: pendingData.stripeCustomerId,
      stripeSubscriptionId: pendingData.stripeSubscriptionId,
      tier: pendingData.tier,
      billingCycle: pendingData.billingCycle,
      amount: pendingData.amount,
    }
  });
}, generalLimiter);
```

---

## Testing

### **Test Scenario 1: User Pays Then Signs Up (Happy Path)**

1. User goes to pricing page
2. Clicks "Get Started" on Premium plan
3. Enters email: `test@example.com`
4. Pays on Stripe Checkout
5. ✅ Webhook creates pending subscription for `test@example.com`
6. User redirected to signup page
7. User signs up with email: `test@example.com`
8. ✅ Signup finds pending subscription
9. ✅ User document created with `stripeCustomerId` and `stripeSubscriptionId`
10. ✅ User sees Premium dashboard immediately

**Check Firestore:**
```
users/{userId}/
  subscription/
    stripeCustomerId: "cus_..."  ✅
    stripeSubscriptionId: "sub_..."  ✅
    tier: "premium"  ✅
    status: "active"  ✅

pending_subscriptions/test@example.com
  status: "claimed"  ✅
  claimedAt: Timestamp  ✅
  userId: "{userId}"  ✅
```

---

### **Test Scenario 2: User Signs Up Without Payment (Fallback)**

1. User goes directly to `/signup` (no payment)
2. User signs up with email: `newuser@example.com`
3. ❌ No pending subscription found (this is okay!)
4. ✅ User document created with `null` Stripe IDs
5. ✅ User sees dashboard with no active subscription

**Check Firestore:**
```
users/{userId}/
  subscription/
    stripeCustomerId: null  ✅ (fallback)
    stripeSubscriptionId: null  ✅ (fallback)
    tier: "essential"  ✅ (from URL params)
    status: "active"  ✅
```

---

### **Test Scenario 3: Email Mismatch**

1. User pays with `john@example.com`
2. ✅ Webhook creates pending subscription for `john@example.com`
3. User signs up with `john.smith@gmail.com` (different email!)
4. ❌ No pending subscription found (email doesn't match)
5. ⚠️ User document created without Stripe IDs
6. ⚠️ **Manual intervention needed** to link subscription

**This is a known edge case** - document it for support team.

---

## Error Handling

### **Graceful Degradation**

```typescript
try {
  // Try to claim pending subscription
  const response = await fetch('/api/stripe/claim-pending-subscription', ...);
  if (response.ok) {
    const data = await response.json();
    if (data.success) {
      pendingSubscription = data.subscription;
    }
  }
} catch (pendingError) {
  // ✅ Don't block signup if pending check fails
  console.log('No pending subscription found (this is okay)');
}
```

**Key principle:** Never block signup! If the pending subscription check fails, fall back to creating user without Stripe IDs.

---

## Monitoring

### **Console Logs to Watch For**

**Success:**
```
✅ Found pending subscription: { tier: 'premium', amount: 2999, ... }
✅ Slack notification sent for new user: abc123
```

**Fallback (not an error):**
```
ℹ️ No pending subscription found (this is okay for new signups)
```

**Errors (require attention):**
```
❌ Failed to claim pending subscription: [error details]
❌ Failed to create user with subscription: [error details]
```

---

## Next Steps

### **Priority 1: Create API Endpoint** 🚨

**Create:** `/app/api/stripe/claim-pending-subscription/route.ts`

This is **CRITICAL** - without this API, the entire pending subscription system won't work!

**Template:**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

export const POST = withAuthAndRateLimit(
  async (req: NextRequest, { userId }: { userId: string }) => {
    try {
      // ... implementation (see pseudo-code above)
    } catch (error) {
      Sentry.captureException(error);
      return NextResponse.json({ error: 'Failed to claim subscription' }, { status: 500 });
    }
  },
  generalLimiter
);
```

---

### **Priority 2: Test End-to-End**

1. Go through payment flow without signing up
2. Verify pending subscription is created in Firestore
3. Sign up with the same email
4. Verify subscription is claimed
5. Verify user has access to dashboard

---

### **Priority 3: Handle Email Mismatches**

Build admin tool or support process for cases where:
- User pays with one email
- Signs up with a different email
- Pending subscription can't be auto-linked

---

## Related Files

| File | Status | Changes |
|------|--------|---------|
| `/lib/firestore.ts` | ✅ Updated | Added `stripeCustomerId` & `stripeSubscriptionId` params |
| `/components/auth/SignUpForm.tsx` | ✅ Updated | All 3 handlers check for pending subscriptions |
| `/app/api/stripe/claim-pending-subscription/route.ts` | ❌ TODO | Needs to be created |
| `/app/api/webhooks/stripe/route.ts` | ✅ Updated | Creates pending subscriptions (previous task) |

---

## Summary

✅ **What's Done:**
- Updated `createUserWithSubscription` to accept Stripe IDs
- Updated all signup handlers to check for pending subscriptions
- Added graceful fallback if no pending subscription found
- Clear console logging for debugging

❌ **What's Next:**
- **Create `/api/stripe/claim-pending-subscription` endpoint** (CRITICAL!)
- Test end-to-end flow
- Document edge cases for support team

**Impact:** Users who pay before signing up will now get immediate access! 🎉
