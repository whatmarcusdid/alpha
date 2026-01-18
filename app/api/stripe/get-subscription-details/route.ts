import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  try {
    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { success: false, error: 'Missing paymentIntentId' },
        { status: 400 }
      );
    }

    // Retrieve the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

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
}
