import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

import { adminDb } from '@/lib/firebase/admin';
import { withRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';

const analyticsSchema = z.object({
  event: z.enum([
    'site_fix_offer_viewed',
    'site_fix_sku_selected',
    'site_fix_checkout_started',
    'site_fix_payment_succeeded',
    'site_fix_confirmation_loaded',
    'site_fix_account_created',
    'site_fix_site_confirmed',
    'site_fix_access_submitted',
    'site_fix_delivery_ready',
    'site_fix_onboarding_stuck',
  ]),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    const body = await req.json().catch(() => null);
    const parsed = analyticsSchema.safeParse(body);

    if (parsed.success && adminDb) {
      await adminDb.collection('analyticsEvents').add({
        event: parsed.data.event,
        properties: parsed.data.properties ?? {},
        createdAt: FieldValue.serverTimestamp(),
      });
    }
  } catch (error) {
    console.warn('[book-service/analytics] write failed (non-blocking):', error);
  }

  return NextResponse.json({ success: true });
}, generalLimiter);
