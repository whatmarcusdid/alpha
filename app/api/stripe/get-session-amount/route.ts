import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

import { withRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { emailsMatch } from '@/lib/stripe/authenticated-email';
import { extractCheckoutSessionEmail } from '@/lib/stripe/stripe-object-email';
import { validateRequestBody, getSessionAmountSchema } from '@/lib/validation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const validation = await validateRequestBody(req, getSessionAmountSchema);
      if (!validation.success) {
        return validation.error;
      }

      const { sessionId, email } = validation.data;

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // Only allow retrieving sessions created in the last hour (defense in depth)
      const createdAt = session.created * 1000;
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      if (createdAt < oneHourAgo) {
        return NextResponse.json(
          { success: false, error: 'Session expired' },
          { status: 400 }
        );
      }

      const sessionOwnerEmail = extractCheckoutSessionEmail(session);

      if (!sessionOwnerEmail || !emailsMatch(email, sessionOwnerEmail)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      return NextResponse.json({
        success: true,
        amountTotal: session.amount_total || 0,
        currency: session.currency || 'usd',
        paymentStatus: session.payment_status || 'unpaid',
        tier: session.metadata?.tier || 'essential',
        customerEmail: session.customer_details?.email || sessionOwnerEmail,
      });
    } catch (error: unknown) {
      console.error('Error retrieving session amount:', error);

      const stripeError = error as { type?: string };
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json(
          { success: false, error: 'Invalid session' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Failed to retrieve session' },
        { status: 500 }
      );
    }
  },
  generalLimiter
);
