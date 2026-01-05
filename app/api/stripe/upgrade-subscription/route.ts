import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}
const adminDb = admin.firestore();

// Initialize Stripe - use 'as any' to bypass strict API version check
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
});

const TIER_HIERARCHY = {
  essential: 1,
  advanced: 2,
  premium: 3,
};

type Tier = keyof typeof TIER_HIERARCHY;

const YEARLY_PRICE_IDS: Record<Tier, string> = {
  essential: 'price_1SlRWtPTDVjQnuCna5gO5flD',
  advanced: 'price_1SlRXePTDVjQnuCnoZ3hUSSU',
  premium: 'price_1SlRXePTDVjQnuCn0TzxnI4Z',
};

export async function POST(req: NextRequest) {
  try {
    const { userId, newTier } = await req.json();

    // 1. Validate input
    if (!userId || !newTier) {
      return NextResponse.json({ success: false, error: 'Missing userId or newTier' }, { status: 400 });
    }

    if (!Object.keys(TIER_HIERARCHY).includes(newTier)) {
      return NextResponse.json({ success: false, error: 'Invalid tier specified.' }, { status: 400 });
    }

    // 2. Fetch user's current subscription from Firestore
    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const userData = userSnap.data();
    const subscriptionData = userData?.subscription;

    if (!subscriptionData || subscriptionData.status !== 'active') {
      return NextResponse.json({ success: false, error: 'No active subscription found for this user.' }, { status: 400 });
    }

    const currentTier = subscriptionData.tier as Tier;
    const stripeSubscriptionId = subscriptionData.stripeSubscriptionId;

    // 3. Validate upgrade path
    if (TIER_HIERARCHY[newTier as Tier] <= TIER_HIERARCHY[currentTier]) {
      return NextResponse.json({ success: false, error: 'Invalid upgrade path. You can only upgrade to a higher tier.' }, { status: 400 });
    }

    // 4. Update subscription in Stripe
    const newPriceId = YEARLY_PRICE_IDS[newTier as Tier];

    const currentSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

    if (currentSubscription.items.data.length === 0) {
      return NextResponse.json({ success: false, error: 'Subscription has no items' }, { status: 400 });
    }

    const subscriptionItemId = currentSubscription.items.data[0].id;

    const updatedSubscription: any = await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [{
        id: subscriptionItemId,
        price: newPriceId,
      }],
      proration_behavior: 'always_invoice',
    });

    // Fetch the latest invoice to find the prorated amount
    let proratedAmount = 0;
    if (updatedSubscription.latest_invoice) {
        const latestInvoiceId = typeof updatedSubscription.latest_invoice === 'string'
            ? updatedSubscription.latest_invoice
            : updatedSubscription.latest_invoice.id;
        const invoice = await stripe.invoices.retrieve(latestInvoiceId);
        proratedAmount = invoice.amount_paid / 100; // Convert cents to dollars
    }

    // 5. Update Firestore with new subscription details
    const newPrice = await stripe.prices.retrieve(newPriceId);

    // Extract current_period_end - now TypeScript won't complain
    const periodEnd = updatedSubscription.current_period_end;
    
    await userRef.update({
      'subscription.tier': newTier,
      'subscription.stripePriceId': newPriceId,
      'subscription.stripeProductId': typeof newPrice.product === 'string' ? newPrice.product : newPrice.product.id,
      'subscription.endDate': admin.firestore.Timestamp.fromDate(new Date(periodEnd * 1000)),
    });

    // 6. Return success response
    return NextResponse.json({
      success: true,
      subscription: {
        tier: newTier,
        status: updatedSubscription.status,
        currentPeriodEnd: new Date(periodEnd * 1000),
        proratedAmount: proratedAmount,
      },
    });

  } catch (error) {
    console.error('Stripe Subscription Upgrade Error:', error);

    if (error instanceof Stripe.errors.StripeCardError) {
      return NextResponse.json({ success: false, error: 'Payment failed. Please update your payment method and try again.' }, { status: 402 });
    }

    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}