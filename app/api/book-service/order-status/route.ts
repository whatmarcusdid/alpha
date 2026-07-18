import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveOrderOwnerEmail } from '@/lib/book-service/order-access';
import type { SiteFixSKU } from '@/lib/book-service/skus';
import type { SiteFixOrderStatusResponse } from '@/lib/book-service/types';
import { adminDb } from '@/lib/firebase/admin';
import { withRateLimit } from '@/lib/middleware/apiHandler';
import { generalLimiter } from '@/lib/middleware/rateLimiting';
import { emailsMatch, normalizeEmail } from '@/lib/stripe/authenticated-email';

/**
 * GET /api/book-service/order-status?orderId={id}&email={checkoutEmail}
 *
 * Source of truth: Firestore orders/{orderId}
 * Polled by the book-service confirmation page after Stripe redirect.
 *
 * Requires the checkout email and verifies it matches the order before returning
 * any order-linked PII (same binding pattern as get-session-amount / create-account).
 */

const orderStatusQuerySchema = z.object({
  orderId: z.string().min(1),
  email: z.string().trim().email('Valid email is required'),
});

export const GET = withRateLimit(async (req: NextRequest) => {
  const orderId = req.nextUrl.searchParams.get('orderId');
  const email = req.nextUrl.searchParams.get('email');
  const parsed = orderStatusQuerySchema.safeParse({ orderId, email });

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'orderId and email are required' },
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
  const auditLeadId = data.auditLeadId as string | undefined;

  let auditLead: { email?: string; firstName?: string; websiteUrl?: string } | null =
    null;

  if (auditLeadId) {
    const auditLeadSnap = await adminDb.collection('auditLeads').doc(auditLeadId).get();
    if (auditLeadSnap.exists) {
      auditLead = auditLeadSnap.data() as {
        email?: string;
        firstName?: string;
        websiteUrl?: string;
      };
    }
  }

  const orderOwnerEmail = resolveOrderOwnerEmail(data, auditLead);
  const requestEmail = normalizeEmail(parsed.data.email);

  if (!orderOwnerEmail || !emailsMatch(requestEmail, orderOwnerEmail)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const createdAt = data.createdAt?.toDate?.();

  const response: SiteFixOrderStatusResponse = {
    orderId: data.orderId as string,
    sku: data.sku as SiteFixSKU,
    entitlements: data.entitlements as SiteFixOrderStatusResponse['entitlements'],
    status: 'paid',
    createdAt: createdAt ? createdAt.toISOString() : new Date().toISOString(),
    normalizedEmail: orderOwnerEmail,
    firstName:
      typeof auditLead?.firstName === 'string' ? auditLead.firstName : undefined,
    websiteUrl:
      typeof auditLead?.websiteUrl === 'string' ? auditLead.websiteUrl : undefined,
    auditLeadId,
  };

  return NextResponse.json({ success: true, data: response });
}, generalLimiter);
