import type { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';
import type { FixUpdatePillar, RecentFixUpdate } from '@/lib/types/fix-update';

const VALID_PILLARS: FixUpdatePillar[] = ['speed', 'security', 'seo', 'general'];

function timestampToIso(value: Timestamp | undefined): string | null {
  if (!value || typeof value.toDate !== 'function') {
    return null;
  }

  return value.toDate().toISOString();
}

function parsePillar(value: unknown): FixUpdatePillar {
  if (typeof value === 'string' && VALID_PILLARS.includes(value as FixUpdatePillar)) {
    return value as FixUpdatePillar;
  }

  return 'general';
}

export async function loadRecentFixUpdates(
  uid: string,
  limit = 10
): Promise<RecentFixUpdate[]> {
  if (!adminDb) {
    return [];
  }

  const updatesSnap = await adminDb
    .collection('users')
    .doc(uid)
    .collection('fixUpdates')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return updatesSnap.docs
    .map((docSnap) => {
      const data = docSnap.data();
      const message = typeof data.message === 'string' ? data.message.trim() : '';

      if (message.length === 0) {
        return null;
      }

      if (data.visibility != null && data.visibility !== 'client') {
        return null;
      }

      return {
        id: docSnap.id,
        message,
        createdAt: timestampToIso(data.createdAt as Timestamp | undefined),
        pillar: parsePillar(data.pillar),
        visibility: 'client' as const,
        pinned: data.pinned === true,
      };
    })
    .filter((update): update is RecentFixUpdate => update != null);
}
