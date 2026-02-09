# Attach Payment Method API - Implementation Summary

## ✅ What Was Created

### New API Route: `/api/stripe/attach-payment-method`

Attaches a Stripe payment method to a customer, sets it as default, and stores card details in Firestore.

---

## 📁 Files Created

### 1. `/lib/validation.ts` (NEW)
Complete validation library using Zod for all API routes.

**Schemas Added:**
- `cancelSubscriptionSchema` - For subscription cancellation
- `createSetupIntentSchema` - For setup intent creation (empty)
- `attachPaymentMethodSchema` - For payment method attachment
- `upgradeSubscriptionSchema` - For subscription upgrades
- `downgradeSubscriptionSchema` - For subscription downgrades
- `reactivateSubscriptionSchema` - For subscription reactivation
- `switchToSafetyNetSchema` - For safety net switching
- `validateCouponSchema` - For coupon validation
- `getSessionDetailsSchema` - For session details retrieval
- `getSubscriptionDetailsSchema` - For subscription details
- `checkoutSchema` - For checkout process
- `createSubscriptionSchema` - For subscription creation
- `getOgImageSchema` - For OG image generation

**Helper Function:**
```typescript
validateRequestBody<T>(request: NextRequest, schema: z.ZodType<T>)
```

### 2. `/app/api/stripe/attach-payment-method/route.ts` (NEW)
Complete API route for attaching payment methods.

---

## 🔑 API Endpoint

### POST `/api/stripe/attach-payment-method`

**Authentication:** Required (Firebase Auth via middleware)

**Rate Limiting:** 10 requests per minute per IP

**Request Body:**
```json
{
  "paymentMethodId": "pm_1234567890"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Payment method attached successfully",
  "card": {
    "brand": "visa",
    "last4": "4242"
  }
}
```

**Error Responses:**

| Status | Error | Condition |
|--------|-------|-----------|
| 400 | `Payment method ID is required` | Missing paymentMethodId |
| 400 | `No Stripe customer found for this user` | User has no stripeCustomerId |
| 400 | `Card error occurred` | Stripe card error |
| 404 | `User not found` | User document doesn't exist |
| 500 | `Server configuration error` | Firebase Admin not initialized |
| 500 | `Failed to attach payment method` | Other errors |

---

## 🔄 Flow

1. **Middleware Authentication**
   - `withAuthAndRateLimit` verifies Firebase Auth token
   - Extracts `userId` from token
   - Applies rate limiting (10 req/min)

2. **Request Validation**
   - Validates `paymentMethodId` is present and non-empty
   - Returns 400 if validation fails

3. **Get User from Firestore**
   - Fetches user document using `adminDb`
   - Returns 404 if user not found
   - Extracts `stripeCustomerId` from user data

4. **Check Stripe Customer**
   - Verifies user has a Stripe customer ID
   - Returns 400 if missing
   - Logs warning to Sentry

5. **Attach Payment Method**
   - Calls `stripe.paymentMethods.attach()`
   - Attaches payment method to customer
   - Handles Stripe card errors specifically

6. **Set as Default**
   - Updates customer's default payment method
   - Uses `invoice_settings.default_payment_method`

7. **Retrieve Card Details**
   - Fetches payment method details
   - Extracts brand, last4, expMonth, expYear

8. **Store in Firestore**
   - Updates user document with payment method info
   - Stores: brand, last4, expiry, paymentMethodId, timestamp

9. **Return Success**
   - Returns card brand and last4
   - Logs success to Sentry

---

## 💾 Firestore Structure

**User Document Update:**
```typescript
users/{userId}/paymentMethod: {
  brand: "visa",          // Card brand (visa, mastercard, amex, etc.)
  last4: "4242",          // Last 4 digits
  expMonth: 12,           // Expiration month
  expYear: 2025,          // Expiration year
  paymentMethodId: "pm_xxx", // Stripe payment method ID
  updatedAt: Timestamp    // When it was updated
}
```

---

## 🎯 Key Features

### ✅ Follows Existing Patterns
- Uses `withAuthAndRateLimit` middleware (like create-setup-intent)
- Uses `adminDb` for Firestore access (like cancel-subscription)
- Implements Sentry error tracking
- Rate limited with `checkoutLimiter`

### ✅ Comprehensive Error Handling
- Validates request body with Zod
- Checks Firebase Admin initialization
- Verifies user exists in Firestore
- Ensures Stripe customer ID is present
- Handles Stripe card errors specifically
- Catches and logs all exceptions

### ✅ Security
- Firebase Auth required via middleware
- Rate limiting prevents abuse
- Only authenticated users can update their own payment method
- Sensitive data (full card number) never stored

### ✅ Observability
- Sentry spans for performance tracking
- Success/warning/error logging to Sentry
- Console logging for debugging
- User ID and customer ID tracked in spans

---

## 🧪 Testing

### Test Locally

```bash
# 1. Get your Firebase Auth token
# (From browser console after logging in)
const token = await firebase.auth().currentUser.getIdToken();

# 2. Create a payment method with Stripe.js
# (From your frontend after collecting card details)
const {paymentMethod} = await stripe.createPaymentMethod({
  type: 'card',
  card: cardElement,
});

# 3. Call the API
curl -X POST http://localhost:3001/api/stripe/attach-payment-method \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentMethodId": "pm_1234567890"
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "Payment method attached successfully",
  "card": {
    "brand": "visa",
    "last4": "4242"
  }
}
```

### Verify in Firestore
1. Go to Firebase Console → Firestore
2. Navigate to `users/{userId}`
3. Check for `paymentMethod` field with:
   - ✅ brand
   - ✅ last4
   - ✅ expMonth
   - ✅ expYear
   - ✅ paymentMethodId
   - ✅ updatedAt

### Verify in Stripe Dashboard
1. Go to Stripe Dashboard → Customers
2. Find your customer
3. Check Payment Methods section
4. Verify:
   - ✅ Payment method is attached
   - ✅ Set as default

---

## 🔗 Integration Example

### Frontend (React Component)

```typescript
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

async function handleUpdatePaymentMethod() {
  const stripe = useStripe();
  const elements = useElements();
  
  // Create payment method
  const {error, paymentMethod} = await stripe.createPaymentMethod({
    type: 'card',
    card: elements.getElement(CardElement),
  });
  
  if (error) {
    console.error('Error creating payment method:', error);
    return;
  }
  
  // Get Firebase Auth token
  const token = await firebase.auth().currentUser.getIdToken();
  
  // Attach to customer
  const response = await fetch('/api/stripe/attach-payment-method', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      paymentMethodId: paymentMethod.id,
    }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log(`✅ Payment method updated: ${data.card.brand} ****${data.card.last4}`);
  }
}
```

---

## 📋 Checklist

- [x] API route created at correct path
- [x] Uses `withAuthAndRateLimit` middleware
- [x] Validates request body with Zod
- [x] Gets user from Firestore with `adminDb`
- [x] Checks for `stripeCustomerId`
- [x] Attaches payment method to Stripe customer
- [x] Sets as default payment method
- [x] Retrieves and stores card details
- [x] Returns card brand and last4
- [x] Handles all error cases
- [x] Implements Sentry tracking
- [x] Rate limited (10 req/min)
- [x] TypeScript types correct
- [x] Follows existing code patterns
- [x] Documentation complete

---

## 🚀 Deployment

### Local Development
1. Ensure `STRIPE_SECRET_KEY` is in `.env.local`
2. Start dev server: `npm run dev`
3. Test with curl or frontend

### Production (Vercel)
1. Push to GitHub: `git push origin main`
2. Vercel auto-deploys
3. Environment variables already configured
4. Test with production Stripe keys

---

## 📊 Related Files

| File | Purpose |
|------|---------|
| `/app/api/stripe/create-setup-intent/route.ts` | Creates SetupIntent for card collection |
| `/app/api/stripe/cancel-subscription/route.ts` | Reference for Firestore user lookup |
| `/lib/middleware/apiHandler.ts` | Authentication middleware |
| `/lib/middleware/rateLimiting.ts` | Rate limiting configuration |
| `/lib/firebase/admin.ts` | Firebase Admin initialization |

---

## 🎉 Summary

| Feature | Status |
|---------|--------|
| **API Route Created** | ✅ Complete |
| **Validation Library** | ✅ Complete |
| **Error Handling** | ✅ Comprehensive |
| **Security** | ✅ Auth + Rate Limiting |
| **Observability** | ✅ Sentry Tracking |
| **Documentation** | ✅ Complete |
| **TypeScript** | ✅ Compiles |
| **Ready for Production** | ✅ Yes |

The attach payment method API is fully implemented and ready to use! 🚀
