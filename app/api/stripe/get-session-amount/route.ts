import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withRateLimit(
  async (req: NextRequest) => {
    try {
      const body = await req.json().catch(() => ({}));
      const sessionId = typeof body?.sessionId === 'string' ? body.sessionId.trim() : null;

      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: 'Session ID is required' },
          { status: 400 }
        );
      }

      const session = await stripe.checkout.sessions.retrieve(sessionId);

      // Only allow retrieving sessions created in the last hour (security measure)
      const createdAt = session.created * 1000;
      const oneHourAgo = Date.now() - 60 * 60 * 1000;

      if (createdAt < oneHourAgo) {
        return NextResponse.json(
          { success: false, error: 'Session expired' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        amountTotal: session.amount_total || 0,
        currency: session.currency || 'usd',
        paymentStatus: session.payment_status || 'unpaid',
        tier: session.metadata?.tier || 'essential',
        customerEmail: session.customer_details?.email || null,
      });
    } catch (error: any) {
      console.error('Error retrieving session amount:', error);

      if (error.type === 'StripeInvalidRequestError') {
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
