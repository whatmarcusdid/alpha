import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SAFETY_NET_ANNUAL } from '@/lib/stripe/subscriptions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
});

export async function POST(req: NextRequest) {
  const { currentSubscriptionId } = await req.json();

  if (!currentSubscriptionId) {
    return NextResponse.json({ error: 'currentSubscriptionId is required' }, { status: 400 });
  }

  try {
    // Retrieve the current subscription to get customer and item details
    const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);

    const newSubscription = await stripe.subscriptions.create({
      customer: currentSubscription.customer as string,
      items: [{ price: SAFETY_NET_ANNUAL }],
      trial_period_days: 30,
    });

    // Optionally, you can cancel the old subscription immediately
    await stripe.subscriptions.del(currentSubscriptionId);

    return NextResponse.json({ success: true, newSubscription });
  } catch (error: any) {
    console.error('Error switching to Safety Net:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
