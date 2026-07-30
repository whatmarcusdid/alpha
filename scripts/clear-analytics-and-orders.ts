/**
 * Deletes all documents in the analyticsEvents and orders Firestore collections.
 *
 * Usage:
 *   npx tsx scripts/clear-analytics-and-orders.ts              # uses .env.local (emulator if configured)
 *   npx tsx scripts/clear-analytics-and-orders.ts --production # live Firestore (strips emulator env)
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

async function clearCollection(collectionName: string): Promise<number> {
  const snap = await db.collection(collectionName).get();
  console.log(`Found ${snap.size} document(s) in ${collectionName}.`);

  if (snap.empty) {
    console.log('Nothing to delete.');
    return 0;
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

  console.log(`Done. Removed ${deleted} document(s) from ${collectionName}.`);
  return deleted;
}

async function clearAnalyticsAndOrders(): Promise<void> {
  console.log('Project:', projectId);
  console.log('Target:', getFirestoreConnectionLabel());

  const analyticsDeleted = await clearCollection('analyticsEvents');
  const ordersDeleted = await clearCollection('orders');

  const totalDeleted = analyticsDeleted + ordersDeleted;
  console.log(
    `Finished. Removed ${totalDeleted} document(s) total (${analyticsDeleted} from analyticsEvents, ${ordersDeleted} from orders).`
  );
}

clearAnalyticsAndOrders().catch((error) => {
  console.error('Failed to clear analyticsEvents and orders:', error);
  process.exit(1);
});
