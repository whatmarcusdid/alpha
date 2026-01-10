import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

export async function POST(request: NextRequest) {
  try {
    // Get Firebase Auth token from request headers
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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
    const userId = decodedToken.uid;

    // Get request body
    const { newTier } = await request.json();

    if (!newTier) {
      return NextResponse.json(
        { error: 'Missing required field: newTier' },
        { status: 400 }
      );
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
    const subscriptionId = userData?.subscription?.stripeSubscriptionId;

    // Map tiers to Stripe price IDs
    const tierPriceIds: Record<string, string> = {
      'essential': 'price_1So9MuPTDVjQnuCnpaIYQQtA',
      'advanced': 'price_1So9NMPTDVjQnuCnLeL0VrEW',
      'premium': 'price_1So9NkPTDVjQnuCn8f6PywGQ',
    };

    const newPriceId = tierPriceIds[newTier];

    if (!newPriceId) {
      return NextResponse.json(
        { error: `Invalid tier: ${newTier}` },
        { status: 400 }
      );
    }

    let reactivatedSubscription;

    // Check if they have an existing canceled subscription
    if (subscriptionId) {
      try {
        // Try to retrieve the existing subscription
        const existingSubscription = await stripe.subscriptions.retrieve(subscriptionId);
        
        // If subscription is scheduled for cancellation, remove the cancellation
        if (existingSubscription.cancel_at_period_end) {
          reactivatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: false, // Un-cancel the subscription
            items: [{
              id: existingSubscription.items.data[0].id,
              price: newPriceId, // Update to new tier
            }],
            proration_behavior: 'create_prorations',
          });
        } else if (existingSubscription.status === 'canceled') {
          // If fully canceled, create a new subscription
          const customer = existingSubscription.customer as string;
          reactivatedSubscription = await stripe.subscriptions.create({
            customer: customer,
            items: [{ price: newPriceId }],
            metadata: {
              userId: userId,
              tier: newTier,
            },
          });
        } else {
          // Subscription is active, just update the price
          reactivatedSubscription = await stripe.subscriptions.update(subscriptionId, {
            items: [{
              id: existingSubscription.items.data[0].id,
              price: newPriceId,
            }],
            proration_behavior: 'create_prorations',
          });
        }
      } catch (error: any) {
        // If subscription doesn't exist anymore, create a new one
        if (error.code === 'resource_missing') {
          const customerId = userData?.subscription?.stripeCustomerId;
          
          if (!customerId) {
            return NextResponse.json(
              { error: 'No Stripe customer found. Please contact support.' },
              { status: 400 }
            );
          }

          reactivatedSubscription = await stripe.subscriptions.create({
            customer: customerId,
            items: [{ price: newPriceId }],
            metadata: {
              userId: userId,
              tier: newTier,
            },
          });
        } else {
          throw error;
        }
      }
    } else {
      // No previous subscription - create a new one
      const customerId = userData?.subscription?.stripeCustomerId;
      
      if (!customerId) {
        return NextResponse.json(
          { error: 'No Stripe customer found. Please contact support.' },
          { status: 400 }
        );
      }

      reactivatedSubscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: newPriceId }],
        metadata: {
          userId: userId,
          tier: newTier,
        },
      });
    }

    // Calculate the new renewal date
    const renewalDate = new Date(((reactivatedSubscription as any).current_period_end as number) * 1000);

    // Update Firestore with reactivated subscription
    await adminDb.collection('users').doc(userId).update({
      'subscription.tier': newTier,
      'subscription.status': 'active',
      'subscription.stripeSubscriptionId': reactivatedSubscription.id,
      'subscription.renewalDate': renewalDate.toISOString(),
      'subscription.canceledAt': null,
      'subscription.expiresAt': null,
      'subscription.cancellationReason': null,
      'subscription.updatedAt': new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Subscription reactivated successfully',
      newTier,
      renewalDate: renewalDate.toISOString(),
    });
    
  } catch (error: any) {
    console.error('Error reactivating subscription:', error);
    
    if (error.code === 'auth/argument-error' || error.code === 'auth/id-token-expired') {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

