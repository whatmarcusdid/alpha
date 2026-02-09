# Claim Pending Subscription API

## Overview

API endpoint that checks for pending subscriptions created by Stripe webhooks and allows users to claim them during signup.

**Endpoint:** `POST /api/stripe/claim-pending-subscription`

---

## Purpose

When users pay on Stripe Checkout before creating an account, the webhook stores their subscription in a `pending_subscriptions` collection. This API allows the signup flow to claim that pending subscription and link it to the newly created user account.

---

## Authentication

**Required:** Firebase ID token in `Authorization` header

```typescript
Authorization: Bearer <firebase-id-token>
```

The token is verified using Firebase Admin SDK to extract the `userId`.

---

## Request

### **Method:** `POST`

### **Headers:**
```json
{
  "Authorization": "Bearer <firebase-id-token>",
  "Content-Type": "application/json"
}
```

### **Body:**
```json
{
  "email": "john@example.com"
}
```

**Email Normalization:**
- Automatically converted to lowercase
- Trimmed of whitespace
- Used as document ID in `pending_subscriptions` collection

---

## Response

### **Success (Subscription Found)** - 200

```json
{
  "success": true,
  "subscription": {
    "stripeCustomerId": "cus_...",
    "stripeSubscriptionId": "sub_...",
    "tier": "premium",
    "billingCycle": "annual",
    "amount": 2999.00
  }
}
```

### **Not Found (No Pending Subscription)** - 200

```json
{
  "success": false,
  "message": "No pending subscription found",
  "subscription": null
}
```

**Note:** This is NOT an error! It's normal for users who sign up without paying first.

### **Already Claimed** - 200

```json
{
  "success": false,
  "message": "Subscription already claimed",
  "subscription": null
}
```

**Note:** Prevents double-claiming if user tries to claim the same subscription twice.

### **Errors**

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```
Missing or invalid Firebase auth token.

**400 Bad Request:**
```json
{
  "error": "Email is required"
}
```
Email missing from request body.

**500 Internal Server Error:**
```json
{
  "error": "Internal server error"
}
```
Firebase Admin not initialized or other server error.

---

## Implementation Details

### **Flow:**

1. **Verify Auth Token**
   ```typescript
   const token = authHeader.split('Bearer ')[1];
   const decodedToken = await adminAuth.verifyIdToken(token);
   const userId = decodedToken.uid;
   ```

2. **Normalize Email**
   ```typescript
   const normalizedEmail = email.toLowerCase().trim();
   ```

3. **Look Up Pending Subscription**
   ```typescript
   const pendingRef = adminDb.collection('pending_subscriptions').doc(normalizedEmail);
   const pendingDoc = await pendingRef.get();
   ```

4. **Check Status**
   - If document doesn't exist → Return `success: false`
   - If already claimed → Return `success: false`
   - Otherwise → Mark as claimed and return subscription data

5. **Mark as Claimed**
   ```typescript
   await pendingRef.update({
     status: 'claimed',
     claimedBy: userId,
     claimedAt: new Date().toISOString(),
   });
   ```

6. **Return Subscription Data**
   - Extract necessary fields
   - Return to signup flow
   - Signup uses this data to create user with Stripe IDs

---

## Firestore Updates

When a subscription is claimed, the `pending_subscriptions` document is updated:

**Before Claim:**
```typescript
{
  email: 'john@example.com',
  stripeCustomerId: 'cus_...',
  stripeSubscriptionId: 'sub_...',
  tier: 'premium',
  billingCycle: 'annual',
  amount: 2999.00,
  status: 'pending',
  createdAt: Timestamp,
}
```

**After Claim:**
```typescript
{
  email: 'john@example.com',
  stripeCustomerId: 'cus_...',
  stripeSubscriptionId: 'sub_...',
  tier: 'premium',
  billingCycle: 'annual',
  amount: 2999.00,
  status: 'claimed',        // ✅ Updated
  claimedBy: 'user123',     // ✅ Added
  claimedAt: '2026-02-09T...', // ✅ Added
  createdAt: Timestamp,
}
```

---

## Usage Example

### **In SignUpForm.tsx:**

```typescript
// After creating Firebase user
const user = await signUpWithEmail(email, password, name);

// Check for pending subscription
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
  console.log('ℹ️ No pending subscription found (this is okay)');
}

// Create user with subscription data
if (pendingSubscription) {
  // Use data from pending subscription
  await createUserWithSubscription(user.uid, email, name, {
    tier: pendingSubscription.tier,
    billingCycle: pendingSubscription.billingCycle,
    amount: pendingSubscription.amount,
    stripeCustomerId: pendingSubscription.stripeCustomerId,
    stripeSubscriptionId: pendingSubscription.stripeSubscriptionId,
  });
} else {
  // Fallback: create without Stripe IDs
  await createUserWithSubscription(user.uid, email, name, {
    tier: tier,
    billingCycle: billingCycle,
    amount: parseFloat(amount),
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  });
}
```

---

## Error Handling

### **Graceful Degradation**

The API is designed to never block signup:

```typescript
try {
  const response = await fetch('/api/stripe/claim-pending-subscription', ...);
  if (response.ok) {
    const data = await response.json();
    if (data.success) {
      // Use pending subscription
      pendingSubscription = data.subscription;
    }
  }
} catch (error) {
  // Don't throw - just log and continue
  console.log('No pending subscription found (this is okay)');
}
```

**Key Principle:** If the API fails for any reason, signup continues without pending subscription data.

---

## Security

### **Authentication Required**

- Every request must include a valid Firebase ID token
- Token is verified using Firebase Admin SDK
- Only authenticated users can claim subscriptions

### **Single Claim Protection**

- Once claimed, a subscription cannot be claimed again
- Prevents multiple users from claiming the same subscription
- `status: 'claimed'` check prevents double-claiming

### **Email Normalization**

- Ensures consistent lookups
- Lowercase + trimmed
- Matches webhook storage format

### **Audit Trail**

- Records who claimed (`claimedBy: userId`)
- Records when claimed (`claimedAt: timestamp`)
- Helps debug issues and prevent fraud

---

## Monitoring

### **Sentry Events**

**Success:**
```
Level: info
Message: "Pending subscription claimed"
Extra: { userId, email }
```

**Errors:**
```
Level: error
Message: (exception details)
Extra: (stack trace)
```

### **Console Logs**

**Success:**
```
✅ Pending subscription claimed by user abc123 for email john@example.com
```

**Errors:**
```
❌ Error claiming pending subscription: [error details]
```

---

## Testing

### **Test Scenario 1: Claim Pending Subscription**

```bash
# 1. Simulate webhook creating pending subscription
POST /api/webhooks/stripe
# (Stripe sends checkout.session.completed event)
# Creates pending_subscriptions/john@example.com

# 2. Claim the subscription
curl -X POST http://localhost:3000/api/stripe/claim-pending-subscription \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'

# Expected Response:
{
  "success": true,
  "subscription": {
    "stripeCustomerId": "cus_...",
    "stripeSubscriptionId": "sub_...",
    "tier": "premium",
    "billingCycle": "annual",
    "amount": 2999.00
  }
}
```

### **Test Scenario 2: No Pending Subscription**

```bash
curl -X POST http://localhost:3000/api/stripe/claim-pending-subscription \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com"}'

# Expected Response:
{
  "success": false,
  "message": "No pending subscription found",
  "subscription": null
}
```

### **Test Scenario 3: Already Claimed**

```bash
# First claim succeeds
curl -X POST http://localhost:3000/api/stripe/claim-pending-subscription \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'

# Second claim fails
curl -X POST http://localhost:3000/api/stripe/claim-pending-subscription \
  -H "Authorization: Bearer <firebase-id-token>" \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'

# Expected Response (second call):
{
  "success": false,
  "message": "Subscription already claimed",
  "subscription": null
}
```

### **Test Scenario 4: Unauthorized**

```bash
curl -X POST http://localhost:3000/api/stripe/claim-pending-subscription \
  -H "Content-Type: application/json" \
  -d '{"email":"john@example.com"}'

# Expected Response:
{
  "error": "Unauthorized"
}
```

---

## Edge Cases

### **1. Email Mismatch**

**Problem:**
- User pays with `john@example.com`
- User signs up with `john.smith@gmail.com`

**Result:**
- No pending subscription found (emails don't match)
- User created without Stripe IDs
- Manual intervention needed to link subscription

**Solution:**
- Display message during signup: "Use the email you paid with"
- Or: Build admin tool to manually link subscriptions

### **2. Case Sensitivity**

**Problem:**
- User pays with `John@Example.com`
- User signs up with `john@example.com`

**Result:**
- ✅ Works! Both are normalized to `john@example.com`

### **3. Multiple Payments Before Signup**

**Problem:**
- User pays for Essential plan
- User pays again for Premium plan (before signing up)
- User signs up

**Result:**
- ✅ Claims Premium subscription (most recent)
- Essential subscription overwrites in `pending_subscriptions/{email}`
- Both payments still tracked in Stripe

### **4. Simultaneous Signups**

**Problem:**
- User pays with `shared@company.com`
- Two employees try to sign up with same email

**Result:**
- ✅ First signup claims subscription
- Second signup gets `already claimed` response
- Second signup creates user without Stripe IDs

---

## Related Files

| File | Purpose |
|------|---------|
| `/app/api/stripe/claim-pending-subscription/route.ts` | ✅ This API endpoint |
| `/app/api/webhooks/stripe/route.ts` | Creates pending subscriptions |
| `/components/auth/SignUpForm.tsx` | Calls this API during signup |
| `/lib/firestore.ts` | Uses returned data to create user |

---

## Summary

✅ **What This API Does:**
- Checks for pending subscriptions by email
- Marks found subscriptions as claimed
- Returns subscription data to signup flow
- Prevents double-claiming
- Handles edge cases gracefully

✅ **Security:**
- Requires Firebase auth token
- Single-claim protection
- Audit trail (userId, timestamp)

✅ **Integration:**
- Called by all 3 signup handlers (email, Google, Apple)
- Never blocks signup (graceful fallback)
- Works with webhook system

**Status:** ✅ COMPLETE - The pending subscriptions system is now fully functional!
