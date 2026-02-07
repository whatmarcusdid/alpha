import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { withRateLimit } from '@/lib/middleware/apiHandler';
import { couponLimiter } from '@/lib/middleware/rateLimiting';
import { validateRequestBody, validateCouponSchema } from '@/lib/validation';

export const POST = withRateLimit(
  async (request) => {
    // Initialize Stripe inside the function
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    try {
      // Validate request body
      const validation = await validateRequestBody(request, validateCouponSchema);
      if (!validation.success) {
        return validation.error;
      }

      const { couponCode } = validation.data;

      try {
        // Retrieve the coupon from Stripe (couponCode is already trimmed and uppercased by schema)
        const coupon = await stripe.coupons.retrieve(couponCode);

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
  },
  couponLimiter // 5 requests per minute per IP (prevents brute force enumeration)
);
