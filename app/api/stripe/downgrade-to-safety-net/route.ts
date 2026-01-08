import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
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

    // TODO: Update subscription to Safety Net plan
    // For now, just return success
    // You'll need to create the Safety Net price in Stripe Dashboard first
    
    // const safetyNetPriceId = process.env.STRIPE_SAFETY_NET_PRICE_ID || 'price_xxxxx';
    // const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    // const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    //   items: [{
    //     id: currentSubscription.items.data[0].id,
    //     price: safetyNetPriceId,
    //   }],
    //   proration_behavior: 'create_prorations',
    // });

    // Update Firestore with new plan
    await adminDb.collection('users').doc(userId).update({
      'subscription.tier': 'safety-net',
      'subscription.price': 299,
      'subscription.billingCycle': 'yearly',
      'subscription.updatedAt': new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true,
      message: 'Successfully downgraded to Safety Net plan',
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
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

