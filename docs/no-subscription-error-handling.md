# No Subscription Error Handling - Update Payment Method

## Overview

Added proper error handling for users who try to update their payment method without having an active subscription (no `stripeCustomerId`). This prevents confusing errors and guides users to subscribe first.

---

## Problem

Users without an active subscription (no `stripeCustomerId` in Firestore) could attempt to update their payment method, which would:
1. Create a Stripe SetupIntent without a customer ID
2. Lead to orphaned payment methods
3. Cause confusion when trying to attach the payment method later
4. Not provide clear feedback about what went wrong

---

## Solution

### **Two-Part Fix**

1. **API Route:** Return clear error when no Stripe customer exists
2. **Component:** Handle error gracefully with user-friendly notification

---

## Changes Made

### 1. **Updated `/app/api/stripe/create-setup-intent/route.ts`**

**Added validation after fetching user profile (lines 33-49):**

```typescript
// Get user profile to fetch Stripe customer ID
const userProfile = await getUserProfile(userId);
const customerId = userProfile?.stripeCustomerId;

// If no Stripe customer, user needs to subscribe first
if (!customerId) {
  Sentry.captureMessage('SetupIntent: No Stripe customer found', {
    level: 'warning',
    extra: {
      userId,
    },
  });
  
  return NextResponse.json(
    { 
      error: 'No active subscription found. Please subscribe to a plan first.',
      code: 'NO_SUBSCRIPTION'
    },
    { status: 400 }
  );
}

// Set span attribute for customerId
span.setAttribute('customerId', customerId.substring(0, 10) + '...');

// Create a SetupIntent for updating payment method
const setupIntent = await stripe.setupIntents.create({
  payment_method_types: ['card'],
  customer: customerId,  // Now guaranteed to exist
});
```

**Key Changes:**
- ✅ Checks if `customerId` exists
- ✅ Returns 400 error with clear message
- ✅ Includes error code `NO_SUBSCRIPTION` for client handling
- ✅ Logs warning to Sentry
- ✅ SetupIntent now always has a customer ID

---

### 2. **Updated `/components/manage/UpdatePaymentMethodModalWrapper.tsx`**

**Added `onError` prop to interface (lines 10-14):**

```typescript
interface UpdatePaymentMethodModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (paymentData: PaymentMethodData) => Promise<void>;
  onError?: (message: string) => void;  // ✅ New prop
}
```

**Updated error handling in `createSetupIntent` (lines 70-87):**

```typescript
if (!response.ok) {
  const errorData = await response.json();
  console.error('Failed to create setup intent:', response.status, errorData);
  
  // Handle specific error for no subscription
  if (errorData.code === 'NO_SUBSCRIPTION') {
    onClose();
    if (onError) {
      onError('Please subscribe to a plan before updating your payment method.');
    } else {
      // Fallback to alert if no onError callback
      alert('Please subscribe to a plan before adding a payment method.');
    }
    return;
  }
  
  throw new Error(errorData.error || `API error: ${response.status}`);
}
```

**Key Changes:**
- ✅ Checks for `NO_SUBSCRIPTION` error code
- ✅ Closes modal automatically
- ✅ Calls `onError` callback with user-friendly message
- ✅ Fallback to `alert()` if no callback provided
- ✅ Prevents other error handling from running (early return)

---

### 3. **Updated `/components/manage/ManageSubscriptionModal.tsx`**

**Added `onError` callback to wrapper (lines 296-311):**

```typescript
<UpdatePaymentMethodModalWrapper
  isOpen={showUpdatePaymentModal}
  onClose={() => setShowUpdatePaymentModal(false)}
  onSave={async (paymentData: PaymentMethodData) => {
    setShowUpdatePaymentModal(false);
    await onUpdatePaymentClick();
  }}
  onError={(message: string) => {
    setNotification({
      type: 'error',
      show: true,
      message: 'Unable to Update Payment Method',
      subtitle: message,
    });
  }}
/>
```

**Key Changes:**
- ✅ Added `onError` callback
- ✅ Shows notification toast with error message
- ✅ Uses existing notification system
- ✅ Clear, actionable error message

---

## User Experience

### **BEFORE (Confusing)**

1. User (no subscription) clicks "Update payment method"
2. Modal opens, loading spinner
3. API creates orphaned SetupIntent
4. Loading never stops OR generic error
5. User confused about what to do ❌

### **AFTER (Clear)**

1. User (no subscription) clicks "Update payment method"
2. Modal opens, loading spinner
3. API returns clear error
4. Modal closes automatically
5. Notification toast appears:
   ```
   🔴 Unable to Update Payment Method
   Please subscribe to a plan before updating your payment method.
   ```
6. User knows exactly what to do: Subscribe first ✅

---

## Error Flow Diagram

```
User clicks "Update payment method"
    ↓
Modal opens, shows loading spinner
    ↓
Fetch user profile from Firestore
    ↓
Check if stripeCustomerId exists
    ↓
┌─────────────────────────────────────┐
│ NO stripeCustomerId                 │
├─────────────────────────────────────┤
│ 1. Log warning to Sentry            │
│ 2. Return 400 with NO_SUBSCRIPTION  │
│ 3. Component receives error         │
│ 4. Modal closes                     │
│ 5. Shows error notification         │
│ 6. User redirected to subscribe     │
└─────────────────────────────────────┘
    ↓
User sees clear error notification ✅

┌─────────────────────────────────────┐
│ HAS stripeCustomerId                │
├─────────────────────────────────────┤
│ 1. Create SetupIntent with customer │
│ 2. Return clientSecret              │
│ 3. Load Stripe Elements form        │
│ 4. User updates payment method      │
└─────────────────────────────────────┘
    ↓
Payment form loads successfully ✅
```

---

## API Response Format

### **No Subscription (400 Bad Request)**

```json
{
  "error": "No active subscription found. Please subscribe to a plan first.",
  "code": "NO_SUBSCRIPTION"
}
```

**Response Headers:**
- `Content-Type: application/json`
- HTTP Status: `400 Bad Request`

### **Success (200 OK)**

```json
{
  "clientSecret": "seti_1AbCdEfGhIjKlMnO..."
}
```

---

## Error Codes

| Code | HTTP Status | Meaning | User Action |
|------|-------------|---------|-------------|
| `NO_SUBSCRIPTION` | 400 | User has no Stripe customer ID | Subscribe to a plan first |
| `NO_AUTH` | 401 | Missing/invalid Firebase token | Re-authenticate |
| `RATE_LIMIT` | 429 | Too many requests | Wait and try again |
| `STRIPE_ERROR` | 500 | Stripe API error | Contact support |

---

## Testing

### **Test Case 1: User Without Subscription**

**Setup:**
1. Create a test user in Firebase Auth
2. Do NOT create a Firestore user document (or create one without `stripeCustomerId`)
3. Sign in as this test user

**Test:**
1. Navigate to `/dashboard/transactions`
2. Click "Manage Subscription"
3. Click "Update payment method"

**Expected Result:**
```
✅ Modal closes automatically
✅ Notification toast appears:
   "Unable to Update Payment Method"
   "Please subscribe to a plan before updating your payment method."
```

**Console Output:**
```
Failed to create setup intent: 400 {
  error: "No active subscription found. Please subscribe to a plan first.",
  code: "NO_SUBSCRIPTION"
}
```

---

### **Test Case 2: User With Subscription**

**Setup:**
1. Use an existing user with active subscription
2. User document has `stripeCustomerId` field

**Test:**
1. Navigate to `/dashboard/transactions`
2. Click "Manage Subscription"
3. Click "Update payment method"

**Expected Result:**
```
✅ Modal opens with loading spinner
✅ Stripe Elements payment form loads
✅ User can enter card details
```

**Console Output:**
```
✅ POST /api/stripe/create-setup-intent 200
```

---

### **Test Case 3: Network Error**

**Setup:**
1. User with subscription
2. Simulate network error (throttle in DevTools)

**Test:**
1. Try to open update payment method modal

**Expected Result:**
```
✅ Modal shows loading spinner
✅ Error is caught and logged to Sentry
✅ Loading spinner eventually stops (finally block)
```

---

## Sentry Integration

### **Warning Logged to Sentry**

When `NO_SUBSCRIPTION` error occurs:

```typescript
Sentry.captureMessage('SetupIntent: No Stripe customer found', {
  level: 'warning',
  extra: {
    userId: 'abc123xyz456',
  },
});
```

**Benefits:**
- Track how often this occurs
- Identify users stuck in this state
- Monitor if it's a common issue
- Correlate with signup flow problems

### **Exception Logged to Sentry**

For other errors:

```typescript
Sentry.captureException(error, {
  tags: {
    component: 'UpdatePaymentMethodModal',
    action: 'openModal',
  },
  user: {
    id: user?.uid,
    email: user?.email || undefined,
  },
});
```

---

## Parent Component Integration

### **ManageSubscriptionModal Usage**

```typescript
<UpdatePaymentMethodModalWrapper
  isOpen={showUpdatePaymentModal}
  onClose={() => setShowUpdatePaymentModal(false)}
  onSave={async (paymentData) => {
    // Handle success
    setShowUpdatePaymentModal(false);
    await onUpdatePaymentClick();
  }}
  onError={(message: string) => {
    // Handle error with notification toast
    setNotification({
      type: 'error',
      show: true,
      message: 'Unable to Update Payment Method',
      subtitle: message,
    });
  }}
/>
```

**Notification Toast Appears:**
- Red color (error type)
- Title: "Unable to Update Payment Method"
- Subtitle: "Please subscribe to a plan before updating your payment method."
- Auto-dismisses after 5 seconds
- User can manually dismiss

---

## Security Benefits

### **Prevents Orphaned Payment Methods**

**Without this check:**
```
1. User without subscription adds payment method
2. Payment method created in Stripe
3. No customer to attach it to
4. Orphaned payment method in Stripe
5. Manual cleanup required
```

**With this check:**
```
1. User without subscription tries to add payment method
2. API checks for stripeCustomerId
3. Returns error immediately
4. No orphaned payment methods ✅
5. Clean Stripe account
```

### **Better Data Integrity**

- Only users with subscriptions can add payment methods
- Payment methods always attached to a customer
- Clear customer → subscription → payment method relationship
- Easier to track and manage in Stripe dashboard

---

## Related Files

- **API:** `/app/api/stripe/create-setup-intent/route.ts`
- **Wrapper:** `/components/manage/UpdatePaymentMethodModalWrapper.tsx`
- **Parent:** `/components/manage/ManageSubscriptionModal.tsx`
- **Validation:** `/lib/validation.ts` (`createSetupIntentSchema`)
- **User Profile:** `/lib/firestore/profile.ts` (`getUserProfile`)

---

## Changelog

### v1.2.0 (2025-02-09)
- ✅ Added check for `stripeCustomerId` in API
- ✅ Returns 400 with `NO_SUBSCRIPTION` code if missing
- ✅ Added `onError` prop to wrapper component
- ✅ Handles `NO_SUBSCRIPTION` error specifically
- ✅ Shows user-friendly notification toast
- ✅ Modal closes automatically on error
- ✅ Logs warning to Sentry for monitoring

### v1.1.0 (Previous)
- Added Firebase Auth token authentication
- Fixed 401 Unauthorized error

### v1.0.0 (Original)
- ❌ No check for stripeCustomerId
- ❌ Created orphaned SetupIntents
- ❌ Confusing error messages

---

## Future Enhancements

### **Possible Improvements**

1. **Proactive UI Check**
   ```typescript
   // In ManageSubscriptionModal, disable "Update payment method" button
   // if user has no subscription
   const hasSubscription = !!userProfile?.stripeCustomerId;
   
   <button 
     onClick={() => setShowUpdatePaymentModal(true)}
     disabled={!hasSubscription}
     title={!hasSubscription ? 'Subscribe to a plan first' : undefined}
   >
     Update payment method
   </button>
   ```

2. **Redirect to Pricing Page**
   ```typescript
   // In onError callback, redirect to pricing page
   onError={(message) => {
     setNotification({ type: 'error', message });
     router.push('/pricing');
   }}
   ```

3. **Show Inline Warning**
   ```typescript
   {!hasSubscription && (
     <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
       <p className="text-sm text-yellow-800">
         Subscribe to a plan to manage payment methods.
       </p>
     </div>
   )}
   ```

---

## Summary

Added proper validation and error handling for users without a Stripe customer ID:

1. ✅ **API:** Returns clear 400 error with `NO_SUBSCRIPTION` code
2. ✅ **Component:** Handles error gracefully, closes modal
3. ✅ **Parent:** Shows notification toast with actionable message
4. ✅ **Sentry:** Logs warning for monitoring

**Result:** Users get clear guidance instead of confusing errors, and the system prevents orphaned payment methods in Stripe.

**Key Benefit:** Better UX and cleaner Stripe data! 🎯
