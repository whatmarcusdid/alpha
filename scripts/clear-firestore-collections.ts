/**
 * Deletes all documents from one or more top-level Firestore collections.
 *
 * Usage:
 *   npx tsx scripts/clear-firestore-collections.ts orders analyticsEvents
 *   npx tsx scripts/clear-firestore-collections.ts --production orders analyticsEvents
 */

import admin from 'firebase-admin';

import {
  assertLiveFirestoreForProductionFlag,
  getFirestoreConnectionLabel,
} from '@/lib/firebase/emulator-env';
import { loadDotEnvFile } from '@/lib/fix-jobs/seed-fix-job-utils';

const useProduction = process.argv.includes('--production');
const collectionNames = process.argv.filter((arg) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(arg));

loadDotEnvFile('.env.local');
assertLiveFirestoreForProductionFlag(useProduction);

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (!projectId || !clientEmail || !privateKey) {
  console.error('Missing Firebase Admin env vars in .env.local');
  process.exit(1);
}

if (collectionNames.length === 0) {
  console.error('Usage: npx tsx scripts/clear-firestore-collections.ts [--production] <collection> [...]');
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

async function clearCollection(name: string): Promise<number> {
  const snap = await db.collection(name).get();
  console.log(`\n${name}: found ${snap.size} document(s).`);

  if (snap.empty) {
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
    console.log(`${name}: deleted ${deleted}/${snap.size}...`);
  }

  return deleted;
}

async function main(): Promise<void> {
  console.log('Project:', projectId);
  console.log('Target:', getFirestoreConnectionLabel());
  console.log('Collections:', collectionNames.join(', '));

  let totalDeleted = 0;

  for (const name of collectionNames) {
    totalDeleted += await clearCollection(name);
  }

  console.log(`\nDone. Removed ${totalDeleted} document(s) total.`);
}

main().catch((error) => {
  console.error('Failed to clear collections:', error);
  process.exit(1);
});
