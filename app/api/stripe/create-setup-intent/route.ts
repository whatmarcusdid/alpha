import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { checkoutLimiter } from '@/lib/middleware/rateLimiting';
import { validateRequestBody, createSetupIntentSchema } from '@/lib/validation';
import { getUserProfile } from '@/lib/firestore/profile';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export const POST = withAuthAndRateLimit(
  async (req, { userId }) => {
    return Sentry.startSpan(
      {
        op: 'http.server',
        name: 'POST /api/stripe/create-setup-intent',
      },
      async (span) => {
        try {
          // Set span attribute for userId
          span.setAttribute('userId', userId);

          // Validate request body (empty schema catches unexpected params)
          const validation = await validateRequestBody(req, createSetupIntentSchema);
          if (!validation.success) {
            return validation.error;
          }

          // Get user profile to fetch Stripe customer ID
          const userProfile = await getUserProfile(userId);
          const customerId = userProfile?.stripeCustomerId;

          // Set span attribute for customerId if available
          if (customerId) {
            span.setAttribute('customerId', customerId.substring(0, 10) + '...');
          } else {
            // Capture warning if no customer found
            Sentry.captureMessage('SetupIntent: No Stripe customer found', {
              level: 'warning',
              extra: {
                userId,
              },
            });
          }

          // Create a SetupIntent for updating payment method
          const setupIntent = await stripe.setupIntents.create({
            payment_method_types: ['card'],
            // Attach to customer if available
            ...(customerId && { customer: customerId }),
          });

          return NextResponse.json({
            clientSecret: setupIntent.client_secret,
          });
        } catch (error) {
          console.error('Error creating setup intent:', error);
          
          // Capture exception in Sentry
          Sentry.captureException(error, {
            tags: {
              endpoint: 'create-setup-intent',
              stripe: 'true',
            },
            extra: {
              userId,
            },
          });
          
          return NextResponse.json(
            { error: 'Failed to create setup intent' },
            { status: 500 }
          );
        }
      }
    );
  },
  checkoutLimiter // 10 requests per minute per IP
);
