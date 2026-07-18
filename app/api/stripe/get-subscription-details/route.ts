import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import {
  emailsMatch,
  getAuthenticatedEmailFromRequest,
} from '@/lib/stripe/authenticated-email';
import { extractPaymentIntentEmail } from '@/lib/stripe/stripe-object-email';
import { validateRequestBody, getSubscriptionDetailsSchema } from '@/lib/validation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    try {
      // Validate request body
      const validation = await validateRequestBody(req, getSubscriptionDetailsSchema);
      if (!validation.success) {
        return validation.error;
      }

      const { paymentIntentId } = validation.data;

      // Retrieve the PaymentIntent
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

      const authenticatedEmail = await getAuthenticatedEmailFromRequest(req);
      const paymentIntentEmail = await extractPaymentIntentEmail(
        stripe,
        paymentIntent
      );

      if (
        !authenticatedEmail ||
        !emailsMatch(authenticatedEmail, paymentIntentEmail)
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      // Get customer ID from PaymentIntent
      const customerId = typeof paymentIntent.customer === 'string'
        ? paymentIntent.customer
        : paymentIntent.customer?.id || null;

      // For subscription details, we now use get-session-details instead
      // This endpoint just returns basic PaymentIntent info
      return NextResponse.json({
        success: true,
        stripeCustomerId: customerId,
        stripeSubscriptionId: null,
        paymentStatus: paymentIntent.status,
      });

    } catch (error) {
      console.error('Error retrieving payment intent:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to retrieve payment details' },
        { status: 500 }
      );
    }
  },
  generalLimiter // 60 requests per minute per IP
);
