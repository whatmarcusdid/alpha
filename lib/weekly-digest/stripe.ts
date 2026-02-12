/**
 * Stripe helper for Weekly Sales Digest
 *
 * Queries Stripe for successful payments within a date range
 * and calculates cash collected and payment count.
 */

import Stripe from 'stripe';

export interface StripeRevenueResult {
  cashCollected: number; // Total in dollars (not cents)
  paymentCount: number; // Number of successful payments
  error?: string;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

export async function getWeeklyRevenue(
  startDate: Date,
  endDate: Date
): Promise<StripeRevenueResult> {
  try {
    // Convert dates to Unix timestamps
    const startTimestamp = Math.floor(startDate.getTime() / 1000);
    const endTimestamp = Math.floor(endDate.getTime() / 1000);

    // Query successful payment intents
    const paymentIntents = await stripe.paymentIntents.list({
      created: {
        gte: startTimestamp,
        lt: endTimestamp,
      },
      limit: 100,
    });

    // Filter for succeeded payments and calculate totals
    const succeededPayments = paymentIntents.data.filter(
      (pi) => pi.status === 'succeeded'
    );

    const cashCollected =
      succeededPayments.reduce((sum, pi) => sum + (pi.amount_received || 0), 0) /
      100; // Convert cents to dollars

    console.log(
      `[Weekly Digest] Stripe: $${cashCollected.toFixed(2)} from ${succeededPayments.length} payments`
    );

    return {
      cashCollected,
      paymentCount: succeededPayments.length,
    };
  } catch (error) {
    console.error('[Weekly Digest] Stripe error:', error);
    return {
      cashCollected: 0,
      paymentCount: 0,
      error: error instanceof Error ? error.message : 'Unknown Stripe error',
    };
  }
}
