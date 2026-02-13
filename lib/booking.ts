'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendBookingCompletedNotification } from '@/lib/slack';

/** Serialize Firestore data for client components (Timestamps → ISO strings) */
function serializeForClient(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null;
  const serialized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'toDate' in value && typeof (value as { toDate: () => Date }).toDate === 'function') {
      serialized[key] = (value as { toDate: () => Date }).toDate().toISOString();
    } else if (value && typeof value === 'object' && '_seconds' in value) {
      const ts = value as { _seconds: number; _nanoseconds?: number };
      serialized[key] = new Date(ts._seconds * 1000).toISOString();
    } else {
      serialized[key] = value;
    }
  }
  return serialized;
}

export async function saveBookingIntake(formData: any) {
  if (!adminDb) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const docRef = await adminDb.collection('bookingIntakes').add({
      ...formData,
      createdAt: FieldValue.serverTimestamp(),
      status: 'intake-complete',
    });

    // Send Slack notification to #tsg-sales (non-blocking)
    sendBookingCompletedNotification({
      firstName: formData.firstName,
      lastName: formData.lastName,
      businessName: formData.businessName,
      email: formData.email,
      websiteUrl: formData.websiteUrl,
      tradeType: formData.tradeType,
      numEmployees: formData.numEmployees,
      biggestFrustration: formData.biggestFrustration,
    }).catch((err) => {
      console.error('[Booking] Failed to send Slack notification:', err);
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding document: ', error);
    throw new Error('Could not save booking intake.');
  }
}

export async function updateBookingIntake(id: string, data: any) {
  if (!adminDb) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const docRef = adminDb.collection('bookingIntakes').doc(id);
    await docRef.update(data);
  } catch (error) {
    console.error('Error updating document: ', error);
    throw new Error('Could not update booking intake.');
  }
}

export async function getBookingIntake(id: string) {
  if (!adminDb) {
    throw new Error('Firestore is not initialized');
  }

  const docRef = adminDb.collection('bookingIntakes').doc(id);
  const docSnap = await docRef.get();
  const raw = docSnap.exists ? docSnap.data() : null;
  return raw ? serializeForClient(raw as Record<string, unknown>) : null;
}
