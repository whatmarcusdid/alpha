# Subscription Downgrade Setup Guide

## Overview
The downgrade subscription API endpoint has been created at `/api/stripe/downgrade-subscription`. This guide will help you complete the setup.

## 🔧 What's Already Done

✅ API endpoint created at `app/api/stripe/downgrade-subscription/route.ts`
✅ Firebase authentication verification
✅ Stripe proration handling (automatic credit for unused time)
✅ Firestore tier update logic
✅ UpgradeConfirmation component updated to pass auth token
✅ Support for Essential, Advanced, and Premium tier downgrades

## 📋 Configuration Status

### ✅ Stripe Price IDs Configured

The following Stripe price IDs are already configured in the code:

```typescript
'essential': 'price_1SlRWtPTDVjQnuCna5gO5flD'
'advanced': 'price_1SlRXePTDVjQnuCnoZ3hUSSU'
'premium': 'price_1SlRXePTDVjQnuCn0TzxnI4Z'
```

### Required Environment Variables

Make sure these are set in your `.env.local` file:

```bash
# Required for Stripe API calls
STRIPE_SECRET_KEY=sk_test_... or sk_live_...

# Required for Safety Net plan (separate endpoint)
STRIPE_SAFETY_NET_PRICE_ID=price_... # For Safety Net plan

# Required for Firebase Admin SDK
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY=your_private_key
```

### Next Step: Verify Firebase Admin SDK

Ensure `lib/firebase/admin.ts` exports `adminAuth` and `adminDb`:

```typescript
import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
```

### Ready to Test: Downgrade Flow

1. Log in as a user on the **Advanced** or **Premium** tier
2. Go to Transactions page
3. Click **"Upgrade Plan"** (which now also handles downgrades)
4. Select a lower-tier plan (e.g., from Premium to Advanced)
5. Click the **"Downgrade"** button on the card
6. Review the proration credit in the checkout modal
7. Click **"Confirm Downgrade"**

Expected behavior:
- ✅ Stripe subscription updates to new tier
- ✅ Proration credit applied (shown as negative amount)
- ✅ Firestore updated with new tier and renewal date
- ✅ User sees success message
- ✅ Page refreshes to show new tier

## 🔍 How Proration Works

When a user downgrades:

1. **Stripe calculates unused time** on the current (higher-priced) plan
2. **Creates a credit** for that unused time
3. **Applies the credit** to the new (lower-priced) plan
4. **User sees the credit** on their next invoice or billing cycle

Example:
- User on **Premium** ($2,599/year) with 6 months remaining
- Downgrades to **Advanced** ($1,299/year)
- Unused Premium time: ~$1,300
- Credit applied: ~$1,300
- Next Advanced renewal: $1,299 - $1,300 credit = **$0** (or carries over)

## 🐛 Troubleshooting

### Error: "No active subscription found"
**Solution**: User doesn't have a `stripeSubscriptionId` in Firestore. Ensure the field exists:
```
users/{userId}/subscription/stripeSubscriptionId
```

### Error: "Invalid tier: essential"
**Solution**: The tier name doesn't match the expected values. Check:
- Tier is one of: 'essential', 'advanced', 'premium'
- Price ID exists for that tier
- Environment variable is set correctly

### Error: "Firebase Admin not initialized"
**Solution**: Check that `lib/firebase/admin.ts` properly initializes and exports `adminAuth` and `adminDb`.

### Error: "Invalid or expired token"
**Solution**: Firebase auth token expired. User needs to refresh or re-authenticate.

## 📊 Firestore Schema

The subscription object in Firestore should have this structure:

```typescript
{
  subscription: {
    stripeSubscriptionId: 'sub_xxxxx',
    tier: 'advanced',
    price: 1299,
    billingCycle: 'yearly',
    renewalDate: '2026-06-15T00:00:00.000Z',
    status: 'active',
    updatedAt: '2026-01-07T12:00:00.000Z'
  }
}
```

## 🚀 Related Features

- **Safety Net Downgrade**: `/api/stripe/downgrade-to-safety-net`
- **Subscription Upgrade**: `/api/stripe/upgrade-subscription` (needs to be created)
- **Cancel Subscription**: `/api/stripe/cancel-subscription`
- **Switch to Safety Net**: `/api/stripe/switch-to-safety-net`

## 📝 Notes

- Downgrades take effect immediately (unlike cancellations which wait until period end)
- Proration credit is automatically applied by Stripe
- Users can downgrade to ANY lower tier (including Safety Net)
- The same endpoint handles downgrades to Safety Net, Essential, Advanced, or Premium
- Always use `proration_behavior: 'create_prorations'` for fair billing

---

Need help? Check the console logs for detailed error messages, or verify your Stripe Dashboard has the correct products and prices set up.

