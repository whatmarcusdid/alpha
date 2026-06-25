import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

import { trackSiteFixServerEvent } from '@/lib/book-service/analytics-server';
import type { SiteFixUserNamespace } from '@/lib/book-service/createUser';
import { adminDb } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/middleware/apiHandler';

const confirmDetailsSchema = z.object({
  orderId: z.string().min(1),
  businessName: z.string().min(1),
  websiteUrl: z.string().url(),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
});

export const PATCH = withAuth(async (req: NextRequest, { userId }) => {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = confirmDetailsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }

    const { orderId, businessName, websiteUrl, contactName, contactEmail } =
      parsed.data;

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const siteFix = userSnap.data()?.siteFix as SiteFixUserNamespace | undefined;

    if (!siteFix || siteFix.orderId !== orderId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const originalWebsiteUrl = siteFix.websiteUrl ?? '';
    const websiteUrlCorrected = websiteUrl !== originalWebsiteUrl;

    await userRef.update({
      'siteFix.businessName': businessName,
      'siteFix.websiteUrl': websiteUrl,
      'siteFix.contactName': contactName,
      'siteFix.contactEmail': contactEmail.toLowerCase().trim(),
      'siteFix.siteConfirmedAt': FieldValue.serverTimestamp(),
      ...(websiteUrlCorrected ? { 'siteFix.websiteUrlCorrected': true } : {}),
    });

    trackSiteFixServerEvent('site_fix_site_confirmed', { userId, orderId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[book-service/confirm-details] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save details. Please try again.' },
      { status: 500 }
    );
  }
});
