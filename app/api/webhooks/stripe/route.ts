import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import * as Sentry from '@sentry/nextjs';
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
  return Sentry.startSpan(
    {
      op: 'webhook.stripe',
      name: 'Process Stripe Webhook',
    },
    async (span) => {
      const headersList = await headers();
      const sig = headersList.get('stripe-signature');
      let event: Stripe.Event;

      try {
        const body = await req.text();
        event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
        
        // Set span attribute for event type
        span.setAttribute('eventType', event.type);
      } catch (err: any) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
      }

      try {
        switch (event.type) {
          case 'checkout.session.completed':
            await handleCheckoutSessionCompleted(event, span);
            break;
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
        
        // Capture webhook processing error in Sentry
        Sentry.captureException(error, {
          tags: {
            webhook: 'true',
            stripe: 'true',
          },
        });
        
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
      }
    }
  );
}

async function handleCheckoutSessionCompleted(event: Stripe.Event, span: any) {
  if (!adminDb) {
    console.warn('Firebase Admin not initialized - skipping database update');
    return;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const customerId = session.customer as string;
  
  // Set span attribute with truncated customerId for privacy
  if (customerId) {
    span.setAttribute('customerId', customerId.substring(0, 10) + '...');
  }

  // Find user by Stripe customer ID
  const userRef = adminDb.collection('users').where('stripeCustomerId', '==', customerId).limit(1);
  const userSnapshot = await userRef.get();

  if (userSnapshot.empty) {
    // Critical: No user found for a paid customer
    Sentry.captureMessage('Webhook: No user found for paid customer', {
      level: 'error',
      tags: {
        webhook: 'true',
        stripe: 'true',
        critical: 'true',
      },
      extra: {
        customerId: customerId?.substring(0, 10) + '...',
        sessionId: session.id?.substring(0, 10) + '...',
        amount: session.amount_total,
        email: '[REDACTED]', // Email is already redacted by server config
      },
    });
    
    console.error(`No user found with Stripe customer ID: ${customerId}`);
    return;
  }

  const userId = userSnapshot.docs[0].id;
  const userDocRef = adminDb.collection('users').doc(userId);

  // Update user subscription status
  const subscriptionId = session.subscription as string;
  const tier = session.metadata?.tier || 'essential';
  const billingCycle = session.metadata?.billingCycle || 'annual';

  await userDocRef.set({
    subscription: {
      status: 'active',
      tier,
      billingCycle,
      stripeSubscriptionId: subscriptionId,
      activatedAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
  }, { merge: true });

  // Success: Subscription activated
  Sentry.captureMessage('Subscription activated via webhook', {
    level: 'info',
    extra: {
      userId,
      customerId: customerId?.substring(0, 10) + '...',
    },
  });

  console.log(`Subscription activated for user ${userId}`);
}
