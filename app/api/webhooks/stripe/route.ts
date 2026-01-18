import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { adminDb } from '@/lib/firebase/admin';
import * as admin from 'firebase-admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function handleSubscriptionEvent(event: Stripe.Event) {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized - skipping database update');
    return;
  }
  
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  const userRef = adminDb.collection('users').where('stripeCustomerId', '==', customerId).limit(1);
  const userSnapshot = await userRef.get();

  if (userSnapshot.empty) {
    console.error(`No user found with Stripe customer ID: ${customerId}`);
    return;
  }

  const userId = userSnapshot.docs[0].id;
  const userDocRef = adminDb.collection('users').doc(userId);

  // Extract coupon information if discount is applied
  let discountInfo = null;
  if ((subscription as any).discount && (subscription as any).discount.coupon) {
    const coupon = (subscription as any).discount.coupon;
    discountInfo = {
      couponCode: coupon.id,
      percentOff: coupon.percent_off || null,
      amountOff: coupon.amount_off ? coupon.amount_off / 100 : null,
      duration: coupon.duration,
      durationInMonths: coupon.duration_in_months || null,
    };
  }

  const subscriptionData: any = {
    subscription: {
      status: subscription.status,
      tier: subscription.items.data[0]?.price.lookup_key,
      startDate: admin.firestore.Timestamp.fromDate(new Date((subscription as any).current_period_start * 1000)),
      endDate: admin.firestore.Timestamp.fromDate(new Date((subscription as any).current_period_end * 1000)),
      stripeSubscriptionId: subscription.id,
      updatedAt: admin.firestore.Timestamp.now(),
    }
  };

  // Add discount info if available
  if (discountInfo) {
    subscriptionData.subscription.couponApplied = discountInfo.couponCode;
    subscriptionData.subscription.discount = discountInfo;
  }

  await userDocRef.set(subscriptionData, { merge: true });
}

export async function POST(req: NextRequest) {
  const headersList = await headers();
  const sig = headersList.get('stripe-signature');
  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event);
        break;
      // Add other event types to handle as needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Error handling webhook event:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
