import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Validation schemas for API routes using Zod
 */

// Cancel subscription schema
export const cancelSubscriptionSchema = z.object({
  reason: z.string().optional(),
});

// Create setup intent schema (empty - no body params expected)
export const createSetupIntentSchema = z.object({});

// Attach payment method schema
export const attachPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
});

// Upgrade subscription schema
export const upgradeSubscriptionSchema = z.object({
  newTier: z.enum(['essential', 'advanced', 'premium']),
});

// Downgrade subscription schema
export const downgradeSubscriptionSchema = z.object({
  newTier: z.enum(['essential', 'advanced', 'premium']),
  currentTier: z.enum(['essential', 'advanced', 'premium']),
});

// Reactivate subscription schema
export const reactivateSubscriptionSchema = z.object({
  newTier: z.enum(['essential', 'advanced', 'premium']).optional(),
});

// Switch to safety net schema
export const switchToSafetyNetSchema = z.object({
  currentSubscriptionId: z.string().min(1, 'Subscription ID is required'),
});

// Validate coupon schema
export const validateCouponSchema = z.object({
  couponCode: z.string().min(1, 'Coupon code is required'),
});

// Get session details schema
export const getSessionDetailsSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
});

// Get subscription details schema
export const getSubscriptionDetailsSchema = z.object({
  paymentIntentId: z.string().min(1, 'Payment intent ID is required'),
});

// Checkout schema
export const checkoutSchema = z.object({
  tier: z.enum(['essential', 'advanced', 'premium']),
  billingCycle: z.enum(['monthly', 'yearly']),
  couponCode: z.string().optional(),
});

// Create subscription schema
export const createSubscriptionSchema = z.object({
  email: z.string().email('Valid email is required'),
  tier: z.enum(['essential', 'advanced', 'premium']),
  billingCycle: z.enum(['monthly', 'yearly']),
  couponCode: z.string().optional(),
  paymentMethodId: z.string().min(1, 'Payment method ID is required'),
});

// Get OG image schema
export const getOgImageSchema = z.object({
  url: z.string().url('Valid URL is required'),
});

/**
 * Validates request body against a Zod schema
 * 
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validation result with data or error response
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>
): Promise<{ success: true; data: T } | { success: false; error: NextResponse }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);

    if (!result.success) {
      const errors = result.error.issues.map(err => err.message).join(', ');
      return {
        success: false,
        error: NextResponse.json(
          { error: `Validation failed: ${errors}` },
          { status: 400 }
        ),
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      ),
    };
  }
}
