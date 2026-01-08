# Safety Net Plan Setup Guide

## Overview
The Safety Net downgrade feature allows customers to switch from higher-tier plans (Essential, Growth, Scale) to a basic $299/year maintenance plan when they consider canceling.

## ✅ What's Already Implemented

1. **Frontend Modal Flow** (`SafetyNetDownsellModal.tsx`)
   - Modal appears when user attempts to cancel
   - Shows $299/year Safety Net offer
   - "Claim Offer and Switch" button triggers downgrade

2. **API Endpoint** (`/api/stripe/downgrade-to-safety-net/route.ts`)
   - Authenticates user
   - Retrieves subscription from Firestore
   - Updates Stripe subscription
   - Updates Firestore with new tier
   - Handles prorations automatically

3. **Integration** (`ManageSubscriptionModal.tsx`)
   - Calls API endpoint on claim
   - Shows success/error alerts
   - Refreshes page to update UI

## 🔧 Setup Steps Required

### 1. Create Safety Net Product in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → Products
2. Click "**+ Add product**"
3. Fill in details:
   - **Name**: Safety Net Plan
   - **Description**: Basic maintenance package - $299/year
   - **Pricing**:
     - Price: $299.00
     - Billing period: Yearly
     - Currency: USD
   - Click "**Save product**"

### 2. Get the Price ID

After creating the product:
1. Click on the product in your Products list
2. Under "Pricing", copy the **Price ID** (format: `price_xxxxxxxxxxxxx`)
3. You'll need this for the next step

### 3. Add Environment Variable

Add to your `.env.local` file:

```bash
STRIPE_SAFETY_NET_PRICE_ID=price_xxxxxxxxxxxxx
```

Replace `price_xxxxxxxxxxxxx` with the actual Price ID from Step 2.

### 4. Update Firestore Schema (If Needed)

Ensure your `users` collection documents have these fields:
- `stripeSubscriptionId`: String (subscription ID from Stripe)
- `subscriptionTier`: String ('essential', 'growth', 'scale', 'safety-net')
- `subscriptionPrice`: Number (299 for Safety Net)
- `updatedAt`: Timestamp

### 5. Test the Downgrade Flow

1. Have an active subscription (Essential, Growth, or Scale)
2. Go to Dashboard → Click "Manage Subscription"
3. Click "Cancel subscription"
4. In the cancel modal, select a reason and click "Continue"
5. Safety Net modal should appear
6. Click "Claim Offer and Switch"
7. Verify:
   - Alert shows success message
   - Page refreshes
   - Subscription updated in Stripe Dashboard
   - Firestore updated with new tier

## 🔍 Troubleshooting

### Error: "No active subscription found"
- User doesn't have `stripeSubscriptionId` in Firestore
- Check that subscription was properly created during checkout

### Error: "Failed to downgrade subscription"
- Check Stripe API key is correct
- Verify Price ID exists in Stripe
- Check Stripe logs for detailed error

### Error: "Unauthorized"
- User is not authenticated
- Check Firebase authentication

## 📋 Future Enhancements

- [ ] Send confirmation email after downgrade
- [ ] Show notification toast instead of alert()
- [ ] Add undo/revert option within 24 hours
- [ ] Track downgrade analytics in Mixpanel/GA
- [ ] Update billing portal to show Safety Net features
- [ ] Add Safety Net features list to modal

## 💰 Safety Net Plan Features (for reference)

What customers get with Safety Net ($299/year):
- Basic website maintenance
- Security updates
- Uptime monitoring
- Emergency support (limited hours)
- Monthly performance report

*Note: Update these features as your offering evolves*

## 🔗 Related Files

- `components/manage/SafetyNetDownsellModal.tsx` - Modal UI
- `components/manage/ManageSubscriptionModal.tsx` - Modal orchestration
- `app/api/stripe/downgrade-to-safety-net/route.ts` - API endpoint
- `lib/stripe.ts` - Stripe configuration
- `lib/firebase/admin.ts` - Firebase Admin SDK

---

**Questions?** Contact the development team or check the Stripe documentation at https://stripe.com/docs/billing/subscriptions/upgrade-downgrade

