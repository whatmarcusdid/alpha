// lib/validation/stripe.ts
import { z } from 'zod';
import {
  emailSchema,
  tierSchema,
  billingCycleSchema,
  couponCodeSchema,
  stripeSubscriptionIdSchema,
  stripePaymentIntentIdSchema,
  stripeSessionIdSchema,
  stripePaymentMethodIdSchema,
  cancellationReasonSchema,
} from './common';

// POST /api/checkout
export const checkoutSchema = z.object({
  tier: tierSchema,
  billingCycle: billingCycleSchema,
  couponCode: couponCodeSchema.optional(),
});

// POST /api/checkout/create-subscription
export const createSubscriptionSchema = z.object({
  email: emailSchema,
  tier: tierSchema,
  billingCycle: billingCycleSchema,
  couponCode: couponCodeSchema.optional(),
  paymentMethodId: stripePaymentMethodIdSchema,
});

// POST /api/stripe/upgrade-subscription
export const upgradeSubscriptionSchema = z.object({
  newTier: tierSchema,
});

// POST /api/stripe/downgrade-subscription
export const downgradeSubscriptionSchema = z.object({
  newTier: tierSchema,
  currentTier: tierSchema,
});

// POST /api/stripe/cancel-subscription
export const cancelSubscriptionSchema = z.object({
  reason: cancellationReasonSchema,
});

// POST /api/stripe/reactivate-subscription
export const reactivateSubscriptionSchema = z.object({
  newTier: tierSchema,
});

// POST /api/stripe/switch-to-safety-net
export const switchToSafetyNetSchema = z.object({
  currentSubscriptionId: stripeSubscriptionIdSchema,
});

// POST /api/stripe/validate-coupon
export const validateCouponSchema = z.object({
  couponCode: couponCodeSchema,
});

// POST /api/stripe/get-subscription-details
export const getSubscriptionDetailsSchema = z.object({
  paymentIntentId: stripePaymentIntentIdSchema,
});

// POST /api/stripe/get-session-details
export const getSessionDetailsSchema = z.object({
  sessionId: stripeSessionIdSchema,
});

// POST /api/stripe/create-setup-intent
// No body parameters needed - auth provides userId
export const createSetupIntentSchema = z.object({});
