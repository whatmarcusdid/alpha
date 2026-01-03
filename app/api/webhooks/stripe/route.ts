import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
// import { db } from '@/lib/firebase/admin'; // Assuming admin SDK setup for server-side

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

async function handleSubscriptionEvent(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = subscription.customer as string;

  // Look up the user in your database by their Stripe customer ID
  // const userRef = db.collection('users').where('stripeCustomerId', '==', customerId).limit(1);
  // const userSnapshot = await userRef.get();

  // if (userSnapshot.empty) {
  //   console.error(`No user found with Stripe customer ID: ${customerId}`);
  //   return;
  // }

  // const userId = userSnapshot.docs[0].id;
  // const userDocRef = db.collection('users').doc(userId).collection('subscriptions').doc(subscription.id);

  const subscriptionData = {
    status: subscription.status,
    tier: subscription.items.data[0]?.price.lookup_key,
    startDate: new Date(subscription.current_period_start * 1000),
    endDate: new Date(subscription.current_period_end * 1000),
    stripeSubscriptionId: subscription.id,
  };

  // await userDocRef.set(subscriptionData, { merge: true });
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
