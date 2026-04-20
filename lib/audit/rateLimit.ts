import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase-admin';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Returns true if this email already has an audit lead in the last 24 hours
 * (rate limited — caller should block). Returns false to allow the audit.
 * Firestore errors fail open (return false).
 */
export async function checkEmailRateLimit(email: string): Promise<boolean> {
  const normalizedEmail = email.toLowerCase().trim();

  if (!adminDb) {
    return false;
  }

  try {
    const cutoff = Timestamp.fromMillis(Date.now() - MS_PER_DAY);
    const snapshot = await adminDb
      .collection('auditLeads')
      .where('email', '==', normalizedEmail)
      .where('timestamp', '>=', cutoff)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error('checkEmailRateLimit:', error);
    return false;
  }
}
