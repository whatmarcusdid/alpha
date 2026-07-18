import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

import { adminDb } from '@/lib/firebase/admin';
import { verifyAuthIdToken } from '@/lib/firebase/verify-id-token';
import { withAuthAndRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import {
  normalizeEmail,
  resolveAuthenticatedEmail,
} from '@/lib/stripe/authenticated-email';

export const POST = withAuthAndRateLimit(async (req, { userId }) => {
  try {
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await verifyAuthIdToken(token);

    const body = await req.json().catch(() => null);
    const email = typeof body?.email === 'string' ? body.email : '';

    if (!email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = normalizeEmail(email);
    const authenticatedEmail = await resolveAuthenticatedEmail(decodedToken);

    if (!authenticatedEmail || authenticatedEmail !== normalizedEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!adminDb) {
      console.error('Firebase Admin DB not initialized');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Check for pending subscription
    const pendingRef = adminDb.collection('pending_subscriptions').doc(normalizedEmail);
    const pendingDoc = await pendingRef.get();

    if (!pendingDoc.exists) {
      return NextResponse.json({
        success: false,
        message: 'No pending subscription found',
        subscription: null,
      });
    }

    const pendingData = pendingDoc.data();

    if (!pendingData) {
      return NextResponse.json({
        success: false,
        message: 'No pending subscription found',
        subscription: null,
      });
    }

    if (pendingData.status === 'claimed') {
      return NextResponse.json({
        success: false,
        message: 'Subscription already claimed',
        subscription: null,
      });
    }

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
}, generalLimiter);
