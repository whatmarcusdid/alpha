import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { checkoutLimiter } from '@/lib/middleware/rateLimiting';
import { adminDb } from '@/lib/firebase/admin';

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

          // Check if Firebase Admin is initialized
          if (!adminDb) {
            console.error('Firebase Admin not initialized');
            return NextResponse.json(
              { error: 'Server configuration error' },
              { status: 500 }
            );
          }

          // Get user profile to fetch Stripe customer ID using Admin SDK
          const userDoc = await adminDb.collection('users').doc(userId).get();
          const userData = userDoc.data();
          const customerId = userData?.stripeCustomerId;

          // If no Stripe customer, user needs to subscribe first
          if (!customerId) {
            Sentry.captureMessage('SetupIntent: No Stripe customer found', {
              level: 'warning',
              extra: {
                userId,
              },
            });
            
            return NextResponse.json(
              { 
                error: 'No active subscription found. Please subscribe to a plan first.',
                code: 'NO_SUBSCRIPTION'
              },
              { status: 400 }
            );
          }

          // Set span attribute for customerId
          span.setAttribute('customerId', customerId.substring(0, 10) + '...');

          // Create a SetupIntent for updating payment method
          const setupIntent = await stripe.setupIntents.create({
            payment_method_types: ['card'],
            customer: customerId,
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
