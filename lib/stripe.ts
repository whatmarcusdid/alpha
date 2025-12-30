import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual publishable key
export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Pricing configuration
export const PRICING = {
  essential: {
    name: 'Essential',
    annual: 679,
    quarterly: 207,
    monthly: 69,
    features: [
      'Ongoing Security Monitoring & Backups',
      '4 Annual support hours',
      '8 Annual maintenance hours'
    ],
    deliverables: [
      'Monthly Traffic Analytics Reports',
      'Monthly Performance Checkups',
      'Monthly Plugin & Theme Updates'
    ]
  },
  advanced: {
    name: 'Advanced',
    annual: 1299,
    discountedAnnual: 260,
    quarterly: 399,
    monthly: 119,
    features: [
      'Ongoing Security Monitoring & Backups',
      '8 Annual support hours',
      '16 Annual maintenance hours'
    ],
    deliverables: [
      'Bi-Weekly Traffic Analytics Reports',
      'Bi-Weekly Performance Checkups',
      'Bi-Weekly Plugin & Theme Updates'
    ]
  },
  premium: {
    name: 'Premium',
    annual: 2599,
    quarterly: 799,
    monthly: 239,
    features: [
      'Ongoing Security Monitoring & Backups',
      '20 Annual support hours',
      '40 Annual maintenance hours'
    ],
    deliverables: [
      'Weekly Traffic Analytics Reports',
      'Weekly Performance Checkups',
      'Weekly Plugin & Theme Updates'
    ]
  }
} as const;

export type PricingTier = keyof typeof PRICING;
export type BillingCycle = 'annual' | 'quarterly' | 'monthly';

// Helper function to get price
export function getPrice(tier: PricingTier, cycle: BillingCycle): number {
  const plan = PRICING[tier];
  
  if (tier === 'advanced' && cycle === 'annual') {
    return PRICING.advanced.discountedAnnual!;
  }
  
  return plan[cycle] as number;
}

// Helper to calculate renewal date
export function getRenewalDate(cycle: BillingCycle): string {
  const date = new Date();
  
  if (cycle === 'annual') {
    date.setFullYear(date.getFullYear() + 1);
  } else if (cycle === 'quarterly') {
    date.setMonth(date.getMonth() + 3);
  } else {
    date.setMonth(date.getMonth() + 1);
  }
  
  return date.toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric', 
    year: '2-digit' 
  });
}
