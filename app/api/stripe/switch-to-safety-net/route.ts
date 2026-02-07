import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { SAFETY_NET_ANNUAL } from '@/lib/stripe/subscriptions';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { checkoutLimiter } from '@/lib/middleware/rateLimiting';
import { validateRequestBody, switchToSafetyNetSchema } from '@/lib/validation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    try {
      // Validate request body
      const validation = await validateRequestBody(req, switchToSafetyNetSchema);
      if (!validation.success) {
        return validation.error;
      }

      const { currentSubscriptionId } = validation.data;

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
  },
  checkoutLimiter // 10 requests per minute per IP
);
