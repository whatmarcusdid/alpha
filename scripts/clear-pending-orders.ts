/**
 * Deletes all documents in the pending_orders Firestore collection.
 *
 * Usage:
 *   npx tsx scripts/clear-pending-orders.ts              # uses .env.local (emulator if configured)
 *   npx tsx scripts/clear-pending-orders.ts --production # live Firestore (strips emulator env)
 */

import admin from 'firebase-admin';

import {
  assertLiveFirestoreForProductionFlag,
  getFirestoreConnectionLabel,
} from '@/lib/firebase/emulator-env';
import { loadDotEnvFile } from '@/lib/fix-jobs/seed-fix-job-utils';

const useProduction = process.argv.includes('--production');

loadDotEnvFile('.env.local');
assertLiveFirestoreForProductionFlag(useProduction);

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase Admin env vars in .env.local');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const BATCH_SIZE = 500;

async function clearPendingOrders(): Promise<void> {
  console.log('Project:', projectId);
  console.log('Target:', getFirestoreConnectionLabel());

  const snap = await db.collection('pending_orders').get();
  console.log(`Found ${snap.size} pending order(s).`);

  if (snap.empty) {
    console.log('Nothing to delete.');
    return;
  }

  let deleted = 0;

  for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = snap.docs.slice(i, i + BATCH_SIZE);

    for (const doc of chunk) {
      batch.delete(doc.ref);
    }

    await batch.commit();
    deleted += chunk.length;
    console.log(`Deleted ${deleted}/${snap.size}...`);
  }

  console.log(`Done. Removed ${deleted} document(s) from pending_orders.`);
}

clearPendingOrders().catch((error) => {
  console.error('Failed to clear pending_orders:', error);
  process.exit(1);
});
