import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { validateRequestBody, checkoutSchema } from '@/lib/validation';

// Map tier names to Stripe Price IDs
const PRICE_IDS = {
  essential: 'price_1So9MuPTDVjQnuCnpaIYQQtA',
  advanced: 'price_1So9NMPTDVjQnuCnLeL0VrEW',
  premium: 'price_1So9NkPTDVjQnuCn8f6PywGQ',
  'safety-net': 'price_1SlRYNPTDVjQnuCnm9lCoiQT',
} as const;

export async function POST(request: NextRequest) {
  // Initialize Stripe inside the function
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    // Validate request body
    const validation = await validateRequestBody(request, checkoutSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { tier, billingCycle, couponCode } = validation.data;

    const priceId = PRICE_IDS[tier as keyof typeof PRICE_IDS];

    // Build Checkout Session parameters
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout/confirmation?session_id={CHECKOUT_SESSION_ID}&tier=${tier}&billingCycle=${billingCycle}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/checkout?tier=${tier}`,
      automatic_tax: {
        enabled: true,
      },
      billing_address_collection: 'required',
      metadata: {
        tier,
        billingCycle,
      },
    };

    // Add coupon if provided
    if (couponCode) {
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon && coupon.valid !== false) {
          sessionParams.discounts = [{ coupon: couponCode }];
        }
      } catch (error) {
        console.error('Error validating coupon:', error);
        // Continue without coupon if validation fails
      }
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
