import { loadStripe } from '@stripe/stripe-js';

// Replace with your actual publishable key
export const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Pricing configuration
export const PRICING = {
  essential: {
    name: 'Essential',
    annual: 899,
    stripePriceId: 'price_1So9MuPTDVjQnuCnpaIYQQtA',
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
    annual: 1799,
    stripePriceId: 'price_1So9NMPTDVjQnuCnLeL0VrEW',
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
    annual: 2999,
    stripePriceId: 'price_1So9NkPTDVjQnuCn8f6PywGQ',
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
  },
  'safety-net': {
    name: 'Safety Net',
    annual: 299,
    stripePriceId: 'price_1SlRYNPTDVjQnuCnm9lCoiQT',
    features: [
      'Ongoing Security Monitoring & Backups',
      'Emergency support (limited hours)'
    ],
    deliverables: [
      'Basic site monitoring'
    ]
  }
} as const;

export type PricingTier = keyof typeof PRICING;
export type BillingCycle = 'annual';

// Helper function to get price
export function getPrice(tier: PricingTier): number {
  return PRICING[tier].annual;
}

// Helper to calculate renewal date (annual only)
export function getRenewalDate(cycle: BillingCycle = 'annual'): string {
  const date = new Date();
  date.setFullYear(date.getFullYear() + 1);
  
  return date.toLocaleDateString('en-US', { 
    month: 'numeric', 
    day: 'numeric', 
    year: '2-digit' 
  });
}
