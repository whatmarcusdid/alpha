import { NextRequest, NextResponse } from 'next/server';

import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';
import { isLocalEmulatorSmokeRequest } from '@/lib/firebase/emulator-env';
import { SITE_ACCESS_REQUESTS_COLLECTION } from '@/lib/site-access/create-site-access-request';

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
 * Emulator-only smoke helper — read/patch siteAccessRequests/{requestId}.
 * PATCH backdateExpiresAt sets expiresAt to 1 hour ago (cron expire testing).
 */
export async function GET(req: NextRequest) {
  if (!isLocalEmulatorSmokeRequest(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const requestId = req.nextUrl.searchParams.get('requestId')?.trim() ?? '';
  if (!requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
  }

  const snap = await adminDb.collection(SITE_ACCESS_REQUESTS_COLLECTION).doc(requestId).get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Access request not found' }, { status: 404 });
  }

  const data = snap.data() as Record<string, unknown>;

  return NextResponse.json({
    success: true,
    data: {
      requestId: snap.id,
      clientUid: data.clientUid ?? null,
      sessionId: data.sessionId ?? null,
      status: data.status ?? null,
      expiresAt: timestampToIso(data.expiresAt),
      grantedAt: timestampToIso(data.grantedAt),
      revokedAt: timestampToIso(data.revokedAt),
      requestedAt: timestampToIso(data.requestedAt),
      tokenUsed: data.tokenUsed ?? null,
      expiryDays: data.expiryDays ?? null,
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!isLocalEmulatorSmokeRequest(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const requestId = req.nextUrl.searchParams.get('requestId')?.trim() ?? '';
  if (!requestId) {
    return NextResponse.json({ error: 'requestId is required' }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as { backdateExpiresAt?: boolean } | null;
  if (!body?.backdateExpiresAt) {
    return NextResponse.json(
      { error: 'Only { backdateExpiresAt: true } is supported' },
      { status: 400 }
    );
  }

  const ref = adminDb.collection(SITE_ACCESS_REQUESTS_COLLECTION).doc(requestId);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: 'Access request not found' }, { status: 404 });
  }

  const past = new Date(Date.now() - 60 * 60 * 1000);
  await ref.update({ expiresAt: Timestamp.fromDate(past) });

  const updated = (await ref.get()).data() as Record<string, unknown>;

  return NextResponse.json({
    success: true,
    data: {
      requestId,
      status: updated.status ?? null,
      expiresAt: timestampToIso(updated.expiresAt),
    },
  });
}
