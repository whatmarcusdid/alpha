import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminDb } from '@/lib/firebase/admin';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { validateRequestBody, upgradeSubscriptionSchema } from '@/lib/validation';
import * as Sentry from '@sentry/nextjs';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const TIER_HIERARCHY = {
  essential: 1,
  advanced: 2,
  premium: 3,
};

type Tier = keyof typeof TIER_HIERARCHY;

const YEARLY_PRICE_IDS: Record<Tier, string> = {
  essential: 'price_1S8hrpAFl7pIsUOsWA9XFhQJ',
  advanced: 'price_1SlR6lAFl7pIsUOs2C9HqP3f',
  premium: 'price_1SlR6lAFl7pIsUOssc19PMYR',
};

interface LineItem {
  description: string;
  amount: number;
}

/**
 * POST /api/stripe/preview-proration
 * 
 * Previews proration calculation for subscription tier changes WITHOUT actually making the change.
 * Calculates what the user will be charged (upgrade) or credited (downgrade).
 * 
 * Request body:
 * {
 *   newTier: 'essential' | 'advanced' | 'premium'
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   preview: {
 *     amountDue: 1200.00,        // What they pay today (upgrades) or 0 (downgrades)
 *     credit: 0,                  // Credit amount for downgrades
 *     subtotal: 2999.00,         // New plan price
 *     prorationCredit: -1799.00, // Credit from unused current plan
 *     tax: 0,                    // Tax if applicable
 *     isUpgrade: true,
 *     renewalDate: "2026-06-15T00:00:00.000Z",
 *     lineItems: [...]           // Detailed breakdown
 *   }
 * }
 */
export const POST = withAuthAndRateLimit(
  async (req: NextRequest, { userId }: { userId: string }) => {
    return Sentry.startSpan(
      {
        name: 'POST /api/stripe/preview-proration',
        op: 'http.server',
        attributes: { userId },
      },
      async () => {
        try {
          // Validate request body
          const validation = await validateRequestBody(req, upgradeSubscriptionSchema);
          if (!validation.success) {
            return validation.error;
          }

          const { newTier } = validation.data;

          // Validate adminDb is initialized
          if (!adminDb) {
            console.error('❌ Firestore not initialized');
            return NextResponse.json(
              { success: false, error: 'Database not available' },
              { status: 500 }
            );
          }

          // Fetch user's current subscription from Firestore
          const userRef = adminDb.collection('users').doc(userId);
          const userSnap = await userRef.get();

          if (!userSnap.exists) {
            return NextResponse.json(
              { success: false, error: 'User not found' },
              { status: 404 }
            );
          }

          const userData = userSnap.data();
          const subscriptionData = userData?.subscription;

          if (!subscriptionData || subscriptionData.status !== 'active') {
            return NextResponse.json(
              { success: false, error: 'No active subscription found' },
              { status: 400 }
            );
          }

          const currentTier = subscriptionData.tier as Tier;
          const stripeSubscriptionId = subscriptionData.stripeSubscriptionId;
          const stripeCustomerId = userData?.stripeCustomerId;

          if (!stripeCustomerId) {
            return NextResponse.json(
              { success: false, error: 'No Stripe customer ID found' },
              { status: 400 }
            );
          }

          // Validate tier change
          if (!YEARLY_PRICE_IDS[newTier as Tier]) {
            return NextResponse.json(
              { success: false, error: 'Invalid tier specified' },
              { status: 400 }
            );
          }

          // Check if user is trying to "change" to their current tier
          if (newTier === currentTier) {
            return NextResponse.json(
              { success: false, error: 'You are already on this plan' },
              { status: 400 }
            );
          }

          // Determine if upgrade or downgrade
          const isUpgrade = TIER_HIERARCHY[newTier as Tier] > TIER_HIERARCHY[currentTier];
          const isDowngrade = TIER_HIERARCHY[newTier as Tier] < TIER_HIERARCHY[currentTier];

          // Get the new price ID
          const newPriceId = YEARLY_PRICE_IDS[newTier as Tier];

          // Retrieve current subscription
          const currentSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

          if (currentSubscription.items.data.length === 0) {
            return NextResponse.json(
              { success: false, error: 'Subscription has no items' },
              { status: 400 }
            );
          }

          const subscriptionItemId = currentSubscription.items.data[0].id;

          // Preview the upcoming invoice with the new price
          // This does NOT actually change the subscription - it's just a preview
          // TypeScript doesn't have the correct types for retrieveUpcoming, so we cast to any
          const preview = await (stripe.invoices as any).retrieveUpcoming({
            customer: stripeCustomerId,
            subscription: stripeSubscriptionId,
            subscription_items: [
              {
                id: subscriptionItemId,
                price: newPriceId,
              },
            ],
            subscription_proration_behavior: isUpgrade ? 'always_invoice' : 'create_prorations',
          });

          // Extract line items for transparency
          const lineItems: LineItem[] = preview.lines.data.map((line: any) => ({
            description: line.description || 'Plan charge',
            amount: line.amount / 100, // Convert cents to dollars
          }));

          // Calculate amounts
          const amountDue = preview.amount_due / 100; // Total due today
          const subtotal = preview.subtotal / 100; // Subtotal before tax
          const tax = preview.tax || 0; // Tax amount (if applicable)
          
          // For downgrades, the amount_due will be 0 and the credit is stored
          // For upgrades, amount_due shows what they need to pay now
          const credit = isDowngrade ? Math.abs(amountDue) : 0;
          
          // Calculate proration credit/charge
          const prorationAmount = lineItems.find(item => 
            item.description?.toLowerCase().includes('unused') || 
            item.description?.toLowerCase().includes('proration')
          )?.amount || 0;

          // Get renewal date from subscription
          const periodEnd = (currentSubscription as any).current_period_end as number;
          const renewalDate = new Date(periodEnd * 1000).toISOString();

          // Return preview
          return NextResponse.json({
            success: true,
            preview: {
              amountDue: Math.max(amountDue, 0), // Never show negative amount due
              credit: isDowngrade ? Math.abs(amountDue) : 0,
              subtotal,
              prorationCredit: prorationAmount,
              tax: tax / 100,
              isUpgrade,
              isDowngrade,
              currentTier,
              newTier,
              renewalDate,
              lineItems,
            },
          });

        } catch (error: any) {
          console.error('❌ Preview proration error:', error);
          Sentry.captureException(error, {
            tags: { endpoint: 'preview-proration' },
            extra: { userId },
          });

          if (error instanceof Stripe.errors.StripeError) {
            return NextResponse.json(
              { success: false, error: `Stripe error: ${error.message}` },
              { status: 500 }
            );
          }

          const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
          return NextResponse.json(
            { success: false, error: errorMessage },
            { status: 500 }
          );
        }
      }
    );
  },
  generalLimiter // 60 requests per minute per IP
);
