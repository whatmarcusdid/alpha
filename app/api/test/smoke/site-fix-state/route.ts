import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase/admin';
import { isLocalEmulatorSmokeRequest } from '@/lib/firebase/emulator-env';

function timestampToIso(value: unknown): string | null {
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return null;
}

/**
 * Emulator-only smoke helper for API tests — reads users/{uid} + pending_orders/{orderId}.
 * Not available in production (requires emulator host, non-production NODE_ENV, localhost).
 */
export async function GET(req: NextRequest) {
  if (!isLocalEmulatorSmokeRequest(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const uid = req.nextUrl.searchParams.get('uid')?.trim() ?? '';
  const orderId = req.nextUrl.searchParams.get('orderId')?.trim() ?? '';

  if (!uid || !orderId) {
    return NextResponse.json({ error: 'uid and orderId are required' }, { status: 400 });
  }

  const [userSnap, pendingSnap, orderSnap] = await Promise.all([
    adminDb.collection('users').doc(uid).get(),
    adminDb.collection('pending_orders').doc(orderId).get(),
    adminDb.collection('orders').doc(orderId).get(),
  ]);

  const userData = userSnap.exists ? (userSnap.data() as Record<string, unknown>) : null;
  const siteFix =
    userData?.siteFix && typeof userData.siteFix === 'object'
      ? (userData.siteFix as Record<string, unknown>)
      : {};

  const pendingData = pendingSnap.exists
    ? (pendingSnap.data() as Record<string, unknown>)
    : null;
  const orderData = orderSnap.exists ? (orderSnap.data() as Record<string, unknown>) : null;

  return NextResponse.json({
    success: true,
    data: {
      userExists: userSnap.exists,
      auditLeadLinked: userData?.auditLeadLinked ?? null,
      siteFix: userSnap.exists
        ? {
            orderId: siteFix.orderId ?? null,
            auditLeadId: siteFix.auditLeadId ?? null,
            claimedByUserId: siteFix.claimedByUserId ?? null,
            accountCreatedAt: timestampToIso(siteFix.accountCreatedAt),
            contactName: siteFix.contactName ?? null,
            businessName: siteFix.businessName ?? null,
            contactEmail: siteFix.contactEmail ?? null,
            inviteStatus: siteFix.inviteStatus ?? null,
            sku: siteFix.sku ?? null,
          }
        : null,
      pendingOrder: pendingData
        ? {
            claimState: pendingData.claimState ?? null,
            claimedByUserId: pendingData.claimedByUserId ?? null,
            auditLeadLinked: pendingData.auditLeadLinked ?? null,
          }
        : null,
      order: orderData
        ? {
            status: orderData.status ?? null,
            auditLeadLinked: orderData.auditLeadLinked ?? null,
          }
        : null,
    },
  });
}
