import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { adminDb } from '@/lib/firebase/admin';
import type { SiteFixSKU } from '@/lib/book-service/skus';
import type { SiteFixOrderStatusResponse } from '@/lib/book-service/types';
import { withRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';

/**
 * GET /api/book-service/order-status?orderId={id}
 *
 * Source of truth: Firestore orders/{orderId}
 * This route is polled by the confirmation page.
 *
 * WHY FIRESTORE NOT STRIPE:
 * Stripe session retrieval requires a secret key on every poll and is subject to rate limits.
 * Firestore is the authoritative post-webhook state — if the order exists here, payment succeeded.
 * The confirmation page should trust Firestore, not the Stripe session URL params.
 */

const orderStatusQuerySchema = z.object({
  orderId: z.string().min(1),
});

export const GET = withRateLimit(async (req: NextRequest) => {
  const orderId = req.nextUrl.searchParams.get('orderId');
  const parsed = orderStatusQuerySchema.safeParse({ orderId });

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'orderId is required' },
      { status: 400 }
    );
  }

  if (!adminDb) {
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }

  const doc = await adminDb.collection('orders').doc(parsed.data.orderId).get();

  if (!doc.exists) {
    return NextResponse.json(
      { success: false, error: 'Order not found' },
      { status: 404 }
    );
  }

  const data = doc.data()!;
  const createdAt = data.createdAt?.toDate?.();

  let firstName: string | undefined;
  let websiteUrl: string | undefined;
  const auditLeadId = data.auditLeadId as string | undefined;

  if (auditLeadId) {
    const auditLeadSnap = await adminDb.collection('auditLeads').doc(auditLeadId).get();
    if (auditLeadSnap.exists) {
      const auditLead = auditLeadSnap.data()!;
      firstName =
        typeof auditLead.firstName === 'string' ? auditLead.firstName : undefined;
      websiteUrl =
        typeof auditLead.websiteUrl === 'string' ? auditLead.websiteUrl : undefined;
    }
  }

  const response: SiteFixOrderStatusResponse = {
    orderId: data.orderId as string,
    sku: data.sku as SiteFixSKU,
    entitlements: data.entitlements as SiteFixOrderStatusResponse['entitlements'],
    status: 'paid',
    createdAt: createdAt ? createdAt.toISOString() : new Date().toISOString(),
    normalizedEmail:
      typeof data.normalizedEmail === 'string' ? data.normalizedEmail : undefined,
    firstName,
    websiteUrl,
    auditLeadId,
  };

  return NextResponse.json({ success: true, data: response });
}, generalLimiter);
