import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SAFETY_NET_ANNUAL } from '@/lib/stripe/subscriptions';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

export async function POST(req: NextRequest) {
  const { currentSubscriptionId } = await req.json();

  if (!currentSubscriptionId) {
    return NextResponse.json({ error: 'currentSubscriptionId is required' }, { status: 400 });
  }

  try {
    // Retrieve the current subscription to get the subscription item ID
    const currentSubscription = await stripe.subscriptions.retrieve(currentSubscriptionId);

    if (currentSubscription.items.data.length === 0) {
      return NextResponse.json({ error: 'Subscription has no items' }, { status: 400 });
    }
    
    const subscriptionItemId = currentSubscription.items.data[0].id;

    // Update the subscription to the new plan (Safety Net)
    const updatedSubscription = await stripe.subscriptions.update(currentSubscriptionId, {
      items: [
        {
          id: subscriptionItemId,
          price: SAFETY_NET_ANNUAL,
        },
      ],
    });

    return NextResponse.json({ success: true, subscription: updatedSubscription });
  } catch (error: any) {
    console.error('Error switching to Safety Net:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
