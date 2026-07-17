import { NextRequest, NextResponse } from 'next/server';

import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

import { expandEntitlements, type SiteFixSKU } from '@/lib/book-service/skus';
import { adminDb } from '@/lib/firebase/admin';
import { isLocalEmulatorSmokeRequest } from '@/lib/firebase/emulator-env';

const SeedPendingOrderSchema = z.object({
  orderId: z.string().min(1),
  normalizedEmail: z.string().email(),
  auditLeadId: z.string().min(1).optional(),
  sku: z.enum(['speed_fix', 'security_fix', 'seo_ai_visibility_fix', 'full_bundle']).optional(),
  auditLeadLinked: z.boolean().optional(),
});

/**
 * Emulator-only — writes orders/{orderId} + pending_orders/{orderId} without
 * handleSiteFixPayment side effects (no invite, no Loops, no analytics).
 */
export async function POST(req: NextRequest) {
  if (!isLocalEmulatorSmokeRequest(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  const parsed = SeedPendingOrderSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const {
    orderId,
    normalizedEmail,
    auditLeadId = '00000000-0000-0000-0000-000000000001',
    sku = 'speed_fix',
    auditLeadLinked = false,
  } = parsed.data;

  const email = normalizedEmail.toLowerCase().trim();
  const skuKey = sku as SiteFixSKU;
  const entitlements = expandEntitlements(skuKey);
  const now = FieldValue.serverTimestamp();

  const orderRef = adminDb.collection('orders').doc(orderId);
  const existingOrder = await orderRef.get();

  if (existingOrder.exists) {
    return NextResponse.json(
      { error: 'Order already exists — use a fresh orderId' },
      { status: 409 }
    );
  }

  const order = {
    orderId,
    auditLeadId,
    auditLeadLinked,
    sku: skuKey,
    entitlements,
    normalizedEmail: email,
    stripeSessionId: `smoke_seed_${orderId}`,
    stripePaymentIntentId: null,
    status: 'paid' as const,
    createdAt: now,
  };

  const pendingOrder = {
    orderId,
    auditLeadId,
    auditLeadLinked,
    sku: skuKey,
    entitlements,
    normalizedEmail: email,
    claimState: 'unclaimed' as const,
    claimedByUserId: null,
    claimedAt: null,
    createdAt: now,
  };

  const batch = adminDb.batch();
  batch.set(orderRef, order);
  batch.set(adminDb.collection('pending_orders').doc(orderId), pendingOrder);
  await batch.commit();

  return NextResponse.json({
    success: true,
    data: {
      orderId,
      normalizedEmail: email,
      claimState: 'unclaimed',
    },
  });
}
