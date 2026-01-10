import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  // Initialize Stripe inside the function
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
  });

  try {
    const { amount, tier, billingCycle, couponCode } = await request.json();

    // Validate required fields
    if (!amount || !tier || !billingCycle) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: amount, tier, billingCycle' },
        { status: 400 }
      );
    }

    // Build payment intent parameters
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        tier,
        billingCycle,
      },
    };

    // Add coupon if provided
    if (couponCode) {
      // Validate the coupon exists before applying
      try {
        const coupon = await stripe.coupons.retrieve(couponCode);
        if (coupon && coupon.valid !== false) {
          if (paymentIntentParams.metadata) {
            paymentIntentParams.metadata.couponCode = couponCode;
          }
        }
      } catch (error) {
        console.error('Error validating coupon:', error);
        // Continue without coupon if validation fails
      }
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    return NextResponse.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
// Redeploy after re-adding STRIPE_SECRET_KEY
// Redeploy after re-adding STRIPE_SECRET_KEY
