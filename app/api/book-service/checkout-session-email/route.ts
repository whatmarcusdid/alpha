import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { withRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { normalizeEmail } from '@/lib/stripe/authenticated-email';
import { getStripe } from '@/lib/stripe-server';

const querySchema = z.object({
  orderId: z.string().min(1),
  session_id: z.string().min(1),
});

function resolveCheckoutSessionEmail(session: {
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
}): string | null {
  const stripeEmail = session.customer_details?.email;
  if (typeof stripeEmail === 'string' && stripeEmail.trim()) {
    return normalizeEmail(stripeEmail);
  }

  if (typeof session.customer_email === 'string' && session.customer_email.trim()) {
    return normalizeEmail(session.customer_email);
  }

  return null;
}

/**
 * GET /api/book-service/checkout-session-email?orderId=&session_id=
 *
 * Returns the email Stripe collected at checkout for a completed session.
 * Binds session_id to orderId via Stripe session metadata before returning PII.
 */
export const GET = withRateLimit(async (req: NextRequest) => {
  const parsed = querySchema.safeParse({
    orderId: req.nextUrl.searchParams.get('orderId')?.trim() ?? '',
    session_id: req.nextUrl.searchParams.get('session_id')?.trim() ?? '',
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'orderId and session_id are required' },
      { status: 400 }
    );
  }

  const { orderId, session_id: sessionId } = parsed.data;

  try {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.metadata?.orderId !== orderId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (session.metadata?.productType !== 'site_fix') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const email = resolveCheckoutSessionEmail(session);
    if (!email) {
      return NextResponse.json({ error: 'Checkout email not available yet' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { email },
    });
  } catch (error) {
    console.error('[checkout-session-email] Error:', error);
    return NextResponse.json({ error: 'Failed to resolve checkout email' }, { status: 500 });
  }
}, generalLimiter);
