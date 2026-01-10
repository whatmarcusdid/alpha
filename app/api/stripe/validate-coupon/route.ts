import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  // Initialize Stripe inside the function
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-15.clover',
  });

  try {
    const { couponCode } = await request.json();

    // Validate required fields
    if (!couponCode || typeof couponCode !== 'string') {
      return NextResponse.json(
        { 
          valid: false, 
          error: 'Coupon code is required' 
        },
        { status: 400 }
      );
    }

    try {
      // Retrieve the coupon from Stripe
      const coupon = await stripe.coupons.retrieve(couponCode.trim().toUpperCase());

      // Check if coupon is valid (not deleted and still valid)
      if (!coupon || coupon.valid === false) {
        return NextResponse.json({
          valid: false,
          error: 'This promo code is invalid or has expired'
        });
      }

      // Return coupon details
      return NextResponse.json({
        valid: true,
        id: coupon.id,
        percentOff: coupon.percent_off || null,
        amountOff: coupon.amount_off || null,
        duration: coupon.duration,
        durationInMonths: coupon.duration_in_months || null,
        name: coupon.name || null,
      });

    } catch (stripeError: any) {
      // Handle Stripe-specific errors
      if (stripeError.type === 'StripeInvalidRequestError') {
        return NextResponse.json({
          valid: false,
          error: 'Invalid promo code'
        });
      }

      throw stripeError;
    }

  } catch (error) {
    console.error('Error validating coupon:', error);
    return NextResponse.json(
      { 
        valid: false, 
        error: 'Failed to validate promo code. Please try again.' 
      },
      { status: 500 }
    );
  }
}
