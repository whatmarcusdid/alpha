import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// Helper function to map Stripe Price IDs to internal tier names
function getTierFromPriceId(priceId: string): string {
  const priceMap: Record<string, string> = {
    'price_1SlRWtPTDVjQnuCna5gO5flD': 'essential',
    'price_1SlRXePTDVjQnuCnoZ3hUSSU': 'advanced',
    'price_1SlRXePTDVjQnuCn0TzxnI4Z': 'premium',
    'price_1SlRYNPTDVjQnuCnm9lCoiQT': 'safety_net',
  };
  return priceMap[priceId] || 'essential';
}

// Helper function to map Stripe subscription statuses to internal statuses
function mapStripeStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'active': 'active',
    'canceled': 'cancelled',
    'past_due': 'inactive',
    'unpaid': 'inactive',
    'incomplete': 'inactive',
    'trialing': 'active', // Assuming trialing is an active state
  };
  return statusMap[status] || 'inactive';
}

// Initialize Stripe SDK
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// Initialize Firebase Admin SDK (server-side)
if (!getApps().length) {
  initializeApp();
}
const db = getFirestore();

// Get webhook secret from environment variables
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`Received Stripe webhook: ${event.type}`);
  } catch (err: any) {
    console.error(`❌ Error verifying webhook signature: ${err.message}`);
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { client_reference_id: userId, customer, subscription: subscriptionId } = session;

        if (!userId || !customer || !subscriptionId) {
          console.error('Missing data in checkout.session.completed', { userId, customer, subscriptionId });
          break;
        }

        const userRef = db.collection('users').doc(userId);
        await userRef.update({
          stripeCustomerId: customer,
          stripeSubscriptionId: subscriptionId,
        });
        console.log(`Updated user ${userId} with Stripe customer and subscription IDs.`);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const usersQuery = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (usersQuery.empty) {
          console.error(`No user found with Stripe customer ID: ${customerId}`);
          break;
        }
        const userDoc = usersQuery.docs[0];
        const price = subscription.items.data[0]?.price;

        if (!price) {
          console.error(`Subscription ${subscription.id} has no price item.`);
          break;
        }

        const subscriptionData = {
          tier: getTierFromPriceId(price.id),
          status: mapStripeStatus(subscription.status),
          stripeSubscriptionId: subscription.id,
          stripePriceId: price.id,
          stripeProductId: price.product,
          billingFrequency: price.recurring?.interval,
          startDate: Timestamp.fromMillis(subscription.current_period_start * 1000),
          endDate: Timestamp.fromMillis(subscription.current_period_end * 1000),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
        };

        await userDoc.ref.update({ subscription: subscriptionData });
        console.log(`Updated subscription for user ${userDoc.id}.`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        const usersQuery = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
        if (usersQuery.empty) {
            console.error(`No user found with Stripe customer ID: ${customerId}`);
            break;
        }
        const userDoc = usersQuery.docs[0];

        await userDoc.ref.update({
          'subscription.status': 'cancelled',
          'subscription.cancelAtPeriodEnd': true,
        });
        console.log(`Marked subscription as cancelled for user ${userDoc.id}.`);
        break;
      }
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  } catch (error: any) {
    console.error(`Webhook handler error: ${error.message}`);
    // Return 200 to prevent Stripe from retrying, but log the error
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
