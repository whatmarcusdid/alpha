import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import * as Sentry from '@sentry/nextjs';

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase auth token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    if (!adminAuth) {
      console.error('Firebase Admin Auth not initialized');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;
    
    // Get email from request body
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!adminDb) {
      console.error('Firebase Admin DB not initialized');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }
    
    // Check for pending subscription
    const pendingRef = adminDb.collection('pending_subscriptions').doc(normalizedEmail);
    const pendingDoc = await pendingRef.get();
    
    if (!pendingDoc.exists) {
      // No pending subscription - this is okay, not an error
      return NextResponse.json({ 
        success: false, 
        message: 'No pending subscription found',
        subscription: null 
      });
    }
    
    const pendingData = pendingDoc.data();
    
    if (!pendingData) {
      return NextResponse.json({ 
        success: false, 
        message: 'No pending subscription found',
        subscription: null 
      });
    }
    
    // Check if already claimed
    if (pendingData.status === 'claimed') {
      return NextResponse.json({ 
        success: false, 
        message: 'Subscription already claimed',
        subscription: null 
      });
    }
    
    // Mark as claimed
    await pendingRef.update({
      status: 'claimed',
      claimedBy: userId,
      claimedAt: new Date().toISOString(),
    });
    
    console.log(`✅ Pending subscription claimed by user ${userId} for email ${normalizedEmail}`);
    
    Sentry.captureMessage('Pending subscription claimed', {
      level: 'info',
      extra: { userId, email: normalizedEmail },
    });
    
    return NextResponse.json({
      success: true,
      subscription: {
        stripeCustomerId: pendingData.stripeCustomerId,
        stripeSubscriptionId: pendingData.stripeSubscriptionId,
        tier: pendingData.tier,
        billingCycle: pendingData.billingCycle,
        amount: pendingData.amount,
      },
    });
    
  } catch (error) {
    console.error('❌ Error claiming pending subscription:', error);
    Sentry.captureException(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
