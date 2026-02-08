import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import * as Sentry from '@sentry/nextjs';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { validateRequestBody, createSetupIntentSchema } from '@/lib/validation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      op: 'http.server',
      name: 'POST /api/stripe/downgrade-to-safety-net',
    },
    async (span) => {
      let userId: string | undefined;
      let subscriptionId: string | undefined;
      const immediate = false; // This endpoint always does immediate downgrades

      try {
        // Get Firebase Auth token from request headers
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          // Capture unauthorized access attempt
          Sentry.captureMessage('Downgrade: Unauthorized access attempt', {
            level: 'warning',
          });
          
          return NextResponse.json(
            { error: 'Unauthorized - No token provided' },
            { status: 401 }
          );
        }

        const token = authHeader.split('Bearer ')[1];
        
        // Verify the Firebase token
        if (!adminAuth) {
          return NextResponse.json(
            { error: 'Firebase Admin not initialized' },
            { status: 500 }
          );
        }
        
        const decodedToken = await adminAuth.verifyIdToken(token);
        userId = decodedToken.uid;

        // Set span attribute for userId
        span.setAttribute('userId', userId);
        span.setAttribute('immediate', immediate);

        // Validate request body (empty schema catches unexpected params)
        const validation = await validateRequestBody(request, createSetupIntentSchema);
        if (!validation.success) {
          return validation.error;
        }

        // Get user's subscription data from Firestore
        if (!adminDb) {
          return NextResponse.json(
            { error: 'Firestore not initialized' },
            { status: 500 }
          );
        }
        
        const userDoc = await adminDb.collection('users').doc(userId).get();
        
        if (!userDoc.exists) {
          return NextResponse.json(
            { error: 'User not found' },
            { status: 404 }
          );
        }

        const userData = userDoc.data();
        subscriptionId = userData?.subscription?.stripeSubscriptionId;
        const currentTier = userData?.subscription?.tier;

        if (!subscriptionId) {
          return NextResponse.json(
            { error: 'No active subscription found' },
            { status: 400 }
          );
        }

        // Set span attributes
        span.setAttribute('subscriptionId', subscriptionId.substring(0, 10) + '...');
        span.setAttribute('currentTier', currentTier || 'unknown');

        // Check if already on Safety Net
        if (currentTier === 'safety-net') {
          Sentry.captureMessage('Downgrade: User already on Safety Net', {
            level: 'info',
            extra: {
              userId,
              subscriptionId: subscriptionId.substring(0, 10) + '...',
            },
          });

          return NextResponse.json(
            { error: 'Already on Safety Net plan' },
            { status: 400 }
          );
        }

        // Safety Net Price ID from Stripe Dashboard
        const safetyNetPriceId = 'price_1SlRYNPTDVjQnuCnm9lCoiQT';
        
        // Get current subscription from Stripe
        const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // Update subscription to Safety Net plan with proration
        const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
          items: [{
            id: currentSubscription.items.data[0].id,
            price: safetyNetPriceId,
          }],
          proration_behavior: 'create_prorations',
        });

        // Calculate the new renewal date
        const renewalDate = new Date(((updatedSubscription as any).current_period_end as number) * 1000);

        // Update Firestore with new plan
        await adminDb.collection('users').doc(userId).update({
          'subscription.tier': 'safety-net',
          'subscription.price': 299,
          'subscription.billingCycle': 'yearly',
          'subscription.renewalDate': renewalDate.toISOString(),
          'subscription.updatedAt': new Date().toISOString(),
        });

        // Capture successful downgrade
        Sentry.captureMessage('Downgrade: Successfully downgraded to Safety Net', {
          level: 'info',
          extra: {
            userId,
            subscriptionId: subscriptionId.substring(0, 10) + '...',
            fromTier: currentTier,
            toTier: 'safety-net',
          },
        });

        return NextResponse.json({ 
          success: true,
          message: 'Successfully downgraded to Safety Net plan',
        });
        
      } catch (error: any) {
        console.error('Error downgrading subscription:', error);
        
        // Capture exception in Sentry
        Sentry.captureException(error, {
          tags: {
            endpoint: 'downgrade-to-safety-net',
            stripe: 'true',
          },
          extra: {
            userId,
            subscriptionId: subscriptionId?.substring(0, 10) + '...',
            immediate,
          },
        });
        
        if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
          return NextResponse.json(
            { error: 'Invalid or expired token' },
            { status: 401 }
          );
        }
        
        return NextResponse.json(
          { error: 'Internal server error', details: error.message },
          { status: 500 }
        );
      }
    }
  );
}

