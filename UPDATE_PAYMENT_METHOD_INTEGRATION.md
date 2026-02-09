# Update Payment Method Modal - API Integration

## ✅ Changes Complete

Updated `UpdatePaymentMethodModal.tsx` to call the new `/api/stripe/attach-payment-method` API after successful SetupIntent confirmation.

---

## 🔄 What Changed

### Before
```typescript
if (setupIntent && setupIntent.status === 'succeeded') {
  // Payment method successfully added
  await onSave(formData);
  onClose();
}
```

**Issue:** Only saved billing address data. Payment method was created but not attached to the customer or set as default.

---

### After
```typescript
if (setupIntent && setupIntent.status === 'succeeded') {
  // 1. Extract payment method ID
  const paymentMethodId = typeof setupIntent.payment_method === 'string' 
    ? setupIntent.payment_method 
    : setupIntent.payment_method?.id;

  // 2. Get Firebase auth token
  const { getAuth } = await import('firebase/auth');
  let auth;
  
  if (typeof window !== 'undefined') {
    await import('@/lib/firebase');
    auth = getAuth();
  }
  
  const user = auth?.currentUser;
  const token = await user.getIdToken();

  // 3. Call attach-payment-method API
  const response = await fetch('/api/stripe/attach-payment-method', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ paymentMethodId }),
  });

  const data = await response.json();

  // 4. Handle response
  if (!response.ok || !data.success) {
    // Show user-friendly error
    alert('Card declined - please try another card');
    return;
  }

  // 5. Success - call onSave and close
  await onSave(formData);
  onClose();
}
```

**Result:** Payment method is now properly attached to customer, set as default, and card details stored in Firestore.

---

## 🔑 Key Features

### 1. **Payment Method Extraction**
```typescript:164:166:/Users/marcus.white/projects/tradesitegenie-dashboard/components/manage/UpdatePaymentMethodModal.tsx
        const paymentMethodId = typeof setupIntent.payment_method === 'string' 
          ? setupIntent.payment_method 
          : setupIntent.payment_method?.id;
```
- Handles both string and object types
- Validates payment method ID exists

### 2. **Firebase Auth Token (Browser-Only Pattern)**
```typescript:175:190:/Users/marcus.white/projects/tradesitegenie-dashboard/components/manage/UpdatePaymentMethodModal.tsx
          // Get Firebase auth token
          const { getAuth } = await import('firebase/auth');
          let auth;
          
          if (typeof window !== 'undefined') {
            await import('@/lib/firebase');
            auth = getAuth();
          }
          
          const user = auth?.currentUser;
          
          if (!user) {
            throw new Error('Not authenticated');
          }
          
          const token = await user.getIdToken();
```
- Follows browser-only pattern from existing code
- Dynamic imports for Firebase auth
- Throws error if not authenticated

### 3. **API Call**
```typescript:192:200:/Users/marcus.white/projects/tradesitegenie-dashboard/components/manage/UpdatePaymentMethodModal.tsx
          // Call attach-payment-method API
          const response = await fetch('/api/stripe/attach-payment-method', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ paymentMethodId }),
          });
```
- Sends payment method ID
- Includes Firebase auth token in Authorization header

### 4. **Error Handling**
```typescript:204:218:/Users/marcus.white/projects/tradesitegenie-dashboard/components/manage/UpdatePaymentMethodModal.tsx
          if (!response.ok || !data.success) {
            // Handle specific error messages
            const errorMessage = data.error || 'Unable to update payment method';
            
            // Check for card-specific errors
            if (errorMessage.toLowerCase().includes('card') || 
                errorMessage.toLowerCase().includes('declined')) {
              alert('Card declined - please try another card');
            } else {
              alert('Unable to update payment method - please try again');
            }
            
            setIsLoading(false);
            return;
          }
```
- User-friendly error messages
- Distinguishes card errors from other errors
- Stops loading and returns early

### 5. **Success Handling**
```typescript:220:225:/Users/marcus.white/projects/tradesitegenie-dashboard/components/manage/UpdatePaymentMethodModal.tsx
          // Success - payment method attached and set as default
          console.log(`✅ Payment method updated: ${data.card.brand} ****${data.card.last4}`);
          
          // Call onSave with billing address data
          await onSave(formData);
          onClose();
```
- Logs success with card details
- Calls onSave to save billing address
- Closes modal

---

## 🎯 Complete Flow

1. **User fills form** - Card details + billing address
2. **Stripe validation** - `elements.submit()`
3. **Setup confirmation** - `stripe.confirmSetup()`
4. **Extract payment method ID** - From setupIntent
5. **Get auth token** - Firebase Auth
6. **Call API** - `/api/stripe/attach-payment-method`
7. **API processes** - Attaches to customer, sets as default, stores in Firestore
8. **Success** - Save billing address, close modal

---

## 🔒 Security

- ✅ Firebase Auth required
- ✅ Token sent in Authorization header
- ✅ API validates user authentication
- ✅ Rate limited (10 req/min)

---

## 📊 What Gets Stored

### In Stripe
- Payment method attached to customer
- Set as default payment method
- Billing details included

### In Firestore (`users/{userId}/paymentMethod`)
```typescript
{
  brand: "visa",
  last4: "4242",
  expMonth: 12,
  expYear: 2025,
  paymentMethodId: "pm_xxx",
  updatedAt: Timestamp
}
```

---

## 🧪 Testing

### Success Case
1. Open update payment modal
2. Fill in card details (use test card: `4242 4242 4242 4242`)
3. Fill in billing address
4. Click "Save Changes"
5. Should see loading state
6. Modal closes on success
7. Check console: `✅ Payment method updated: visa ****4242`
8. Verify in Firestore: `users/{userId}/paymentMethod` updated
9. Verify in Stripe: Payment method attached and set as default

### Error Cases

#### Card Declined
```
Input: 4000 0000 0000 0002 (test card that declines)
Output: "Card declined - please try another card"
```

#### No Authentication
```
Scenario: User not logged in
Output: "Unable to update payment method - please try again"
```

#### API Error
```
Scenario: API returns 500 error
Output: "Unable to update payment method - please try again"
```

---

## 📋 Error Messages

| Scenario | User Sees |
|----------|-----------|
| Card declined | "Card declined - please try another card" |
| Card error | "Card declined - please try another card" |
| API error | "Unable to update payment method - please try again" |
| Auth error | "Unable to update payment method - please try again" |
| Network error | "Unable to update payment method - please try again" |

---

## 🔄 Integration Points

### File Updated
- `/components/manage/UpdatePaymentMethodModal.tsx`

### APIs Called
- `POST /api/stripe/attach-payment-method`

### Firebase Usage
- `getAuth()` - Get auth instance
- `auth.currentUser` - Get current user
- `user.getIdToken()` - Get ID token

### Pattern Reference
- Follows same auth pattern as `ManageSubscriptionModal.tsx`
- Uses browser-only Firebase imports
- Matches error handling style

---

## ✅ Verification Checklist

- [x] Extracts payment method ID from setupIntent
- [x] Handles both string and object types
- [x] Gets Firebase auth token with browser-only pattern
- [x] Calls attach-payment-method API
- [x] Includes Authorization header
- [x] Handles API success response
- [x] Shows user-friendly error messages
- [x] Distinguishes card errors from other errors
- [x] Logs success to console
- [x] Calls onSave on success
- [x] Closes modal on success
- [x] Resets loading state on error
- [x] TypeScript compiles without errors
- [x] Follows existing code patterns

---

## 🎉 Benefits

### Before Integration
- ❌ Payment method created but not attached
- ❌ Not set as default
- ❌ Card details not stored in Firestore
- ❌ Manual Stripe dashboard updates needed

### After Integration
- ✅ Payment method automatically attached
- ✅ Set as default payment method
- ✅ Card details stored for display
- ✅ Seamless user experience
- ✅ Ready for future charges

---

## 🚀 Next Steps

1. **Test in development** with Stripe test cards
2. **Verify Firestore** updates correctly
3. **Check Stripe Dashboard** for attached payment methods
4. **Deploy to production**
5. **Monitor error logs** in Sentry

The payment method update flow is now complete! 🎉
