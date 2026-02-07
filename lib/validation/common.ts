// lib/validation/common.ts
import { z } from 'zod';

// Email validation
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .min(3, 'Email too short')
  .max(255, 'Email too long')
  .toLowerCase()
  .trim();

// Pricing tier validation (matches your PRICING in lib/stripe.ts)
export const tierSchema = z.enum(['essential', 'advanced', 'premium', 'safety-net'], {
  message: 'Invalid tier. Must be: essential, advanced, premium, or safety-net'
});

// Billing cycle validation
export const billingCycleSchema = z.enum(['annual'], {
  message: 'Invalid billing cycle. Only annual billing is supported'
});

// Coupon code validation
export const couponCodeSchema = z
  .string()
  .min(1, 'Coupon code required')
  .max(50, 'Coupon code too long')
  .regex(/^[A-Z0-9_-]+$/i, 'Coupon code can only contain letters, numbers, hyphens, and underscores')
  .transform(val => val.trim().toUpperCase());

// Stripe ID validation patterns
export const stripeSubscriptionIdSchema = z
  .string()
  .startsWith('sub_', 'Invalid subscription ID format');

export const stripePaymentIntentIdSchema = z
  .string()
  .startsWith('pi_', 'Invalid payment intent ID format');

export const stripeSessionIdSchema = z
  .string()
  .startsWith('cs_', 'Invalid checkout session ID format');

export const stripePaymentMethodIdSchema = z
  .string()
  .startsWith('pm_', 'Invalid payment method ID format')
  .optional();

// Cancellation reason validation
export const cancellationReasonSchema = z
  .string()
  .max(500, 'Reason too long (max 500 characters)')
  .optional();

// URL validation
export const urlSchema = z
  .string()
  .url('Invalid URL format')
  .max(2048, 'URL too long');
