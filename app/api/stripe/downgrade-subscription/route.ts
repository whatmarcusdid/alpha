import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { validateRequestBody, downgradeSubscriptionSchema } from '@/lib/validation';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

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

    // Validate request body
    const validation = await validateRequestBody(request, downgradeSubscriptionSchema);
    if (!validation.success) {
      return validation.error;
    }

    const { newTier, currentTier } = validation.data;

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

    if (!subscriptionId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      );
    }

    // Map tiers to Stripe price IDs from Stripe Dashboard
    const tierPriceIds: Record<string, string> = {
      'essential': 'price_1So9MuPTDVjQnuCnpaIYQQtA',
      'advanced': 'price_1So9NMPTDVjQnuCnLeL0VrEW',
      'premium': 'price_1So9NkPTDVjQnuCn8f6PywGQ',
    };

    const newPriceId = tierPriceIds[newTier];

    // Get the current subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update the subscription with the new price (proration is automatic)
    const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations', // This creates a credit for unused time
    });

    // Calculate the new renewal date
    const renewalDate = new Date(((updatedSubscription as any).current_period_end as number) * 1000);

    // Update Firestore with new tier
    await adminDb.collection('users').doc(userId).update({
      'subscription.tier': newTier,
      'subscription.renewalDate': renewalDate.toISOString(),
      'subscription.updatedAt': new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Subscription downgraded successfully',
      newTier,
      renewalDate: renewalDate.toISOString(),
    });
    
  } catch (error: any) {
    console.error('Error downgrading subscription:', error);
    
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

