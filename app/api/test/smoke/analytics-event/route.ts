import { NextRequest, NextResponse } from 'next/server';

import { adminDb } from '@/lib/firebase/admin';
import { isLocalEmulatorSmokeRequest } from '@/lib/firebase/emulator-env';

/**
 * Emulator-only — finds a recent analyticsEvents doc with properties.smokeMarker.
 */
export async function GET(req: NextRequest) {
  if (!isLocalEmulatorSmokeRequest(req)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const marker = req.nextUrl.searchParams.get('marker')?.trim() ?? '';
  if (!marker) {
    return NextResponse.json({ error: 'marker is required' }, { status: 400 });
  }

  const snap = await adminDb
    .collection('analyticsEvents')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const match = snap.docs.find((doc) => {
    const data = doc.data() as { properties?: Record<string, unknown> };
    return data.properties?.smokeMarker === marker;
  });

  if (!match) {
    return NextResponse.json({ success: true, data: { found: false, event: null } });
  }

  const data = match.data() as {
    event?: string;
    properties?: Record<string, unknown>;
  };

  return NextResponse.json({
    success: true,
    data: {
      found: true,
      event: data.event ?? null,
      properties: data.properties ?? null,
    },
  });
}
