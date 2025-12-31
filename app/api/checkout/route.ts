import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  // DEBUG: Check environment variables
  console.log('=== ENV VAR DEBUG ===');
  console.log('STRIPE_SECRET_KEY exists:', !!process.env.STRIPE_SECRET_KEY);
  console.log('STRIPE_SECRET_KEY length:', process.env.STRIPE_SECRET_KEY?.length);
  console.log('STRIPE_SECRET_KEY prefix:', process.env.STRIPE_SECRET_KEY?.substring(0, 15));
  console.log('All STRIPE env vars:', Object.keys(process.env).filter(k => k.includes('STRIPE')));
  console.log('==================');

  // Initialize Stripe inside the function
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
  });

  try {
    const { amount, tier, billingCycle } = await request.json();

    // Validate required fields
    if (!amount || !tier || !billingCycle) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: amount, tier, billingCycle' },
        { status: 400 }
      );
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        tier,
        billingCycle,
      },
    });

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
