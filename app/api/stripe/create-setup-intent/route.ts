import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { checkoutLimiter } from '@/lib/middleware/rateLimiting';
import { validateRequestBody, createSetupIntentSchema } from '@/lib/validation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    try {
      // Validate request body (empty schema catches unexpected params)
      const validation = await validateRequestBody(req, createSetupIntentSchema);
      if (!validation.success) {
        return validation.error;
      }

      // Create a SetupIntent for updating payment method
      const setupIntent = await stripe.setupIntents.create({
        payment_method_types: ['card'],
        // You can add customer ID here if you have it
        // customer: customerId,
      });

      return NextResponse.json({
        clientSecret: setupIntent.client_secret,
      });
    } catch (error) {
      console.error('Error creating setup intent:', error);
      return NextResponse.json(
        { error: 'Failed to create setup intent' },
        { status: 500 }
      );
    }
  },
  checkoutLimiter // 10 requests per minute per IP
);
