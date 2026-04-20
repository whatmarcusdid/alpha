/**
 * Single source of truth for Site Care plan pricing and Stripe price IDs.
 * Import from here — do not duplicate prices or plan names elsewhere.
 */

export const SITE_CARE_PLANS = {
  essential: {
    id: 'essential',
    name: 'Essential',
    pricePerYear: 489,
    label: '$489/year',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ESSENTIAL_PRICE_ID ?? '',
  },
  advanced: {
    id: 'advanced',
    name: 'Advanced',
    pricePerYear: 1389,
    label: '$1,389/year',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ADVANCED_PRICE_ID ?? '',
  },
  lifetime: {
    id: 'lifetime',
    name: 'Lifetime',
    pricePerYear: 2489,
    label: '$2,489/year',
    priceId: process.env.NEXT_PUBLIC_STRIPE_LIFETIME_PRICE_ID ?? '',
    limit: 20,
  },
} as const;

export type PlanId = keyof typeof SITE_CARE_PLANS;

export type Plan = (typeof SITE_CARE_PLANS)[PlanId];
