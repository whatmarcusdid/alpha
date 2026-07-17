/**
 * Backfill users/* docs affected by the #38 processDashboardInvite bug:
 * literal top-level keys like "siteFix.inviteStatus" → nested siteFix.inviteStatus.
 *
 * Usage:
 *   npx tsx scripts/backfill-sitefix-literal-keys.ts              # dry-run (emulator if .env.local sets it)
 *   npx tsx scripts/backfill-sitefix-literal-keys.ts --production # dry-run against live Firestore
 *   npx tsx scripts/backfill-sitefix-literal-keys.ts --apply      # write changes
 *
 * Requires Firebase Admin env vars in .env.local (or FIRESTORE_EMULATOR_HOST for emulator).
 * Dry-run is safe against production — it only reads and reports.
 */

import admin from 'firebase-admin';

import { runSiteFixLiteralKeyBackfill } from '@/lib/book-service/backfill-sitefix-literal-keys';
import {
  assertLiveFirestoreForProductionFlag,
  clearFirebaseEmulatorEnv,
  FIREBASE_EMULATOR_ENV_KEYS,
  getFirestoreConnectionLabel,
} from '@/lib/firebase/emulator-env';
import { loadDotEnvFile } from '@/lib/fix-jobs/seed-fix-job-utils';

const apply = process.argv.includes('--apply');
const useProduction = process.argv.includes('--production');

// Parse --production before dotenv so we can strip emulator keys loaded from .env.local.
loadDotEnvFile('.env.local');
assertLiveFirestoreForProductionFlag(useProduction);

const projectId = process.env.FIREBASE_PROJECT_ID ?? '(not set)';
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? 'cloud';

type ConnectionProof = {
  firestoreTarget: string;
  authTarget: string;
  projectId: string;
  usersCollectionCount: number;
  proofEmail: string;
  proofAuthFound: boolean;
  proofAuthUid: string | null;
  proofUserDocExists: boolean;
  proofUserDocEmail: string | null;
  proofUserDocHasSiteFix: boolean;
};

async function proveFirestoreConnection(
  db: admin.firestore.Firestore,
  auth: admin.auth.Auth,
  proofEmail: string
): Promise<ConnectionProof> {
  const countSnap = await db.collection('users').count().get();
  const usersCollectionCount = countSnap.data().count;

  let proofAuthFound = false;
  let proofAuthUid: string | null = null;
  let proofUserDocExists = false;
  let proofUserDocEmail: string | null = null;
  let proofUserDocHasSiteFix = false;

  try {
    const authUser = await auth.getUserByEmail(proofEmail);
    proofAuthFound = true;
    proofAuthUid = authUser.uid;

    const userSnap = await db.collection('users').doc(authUser.uid).get();
    proofUserDocExists = userSnap.exists;
    if (userSnap.exists) {
      const data = userSnap.data() as Record<string, unknown>;
      proofUserDocEmail =
        typeof data.email === 'string' ? data.email : authUser.email ?? null;
      proofUserDocHasSiteFix =
        data.siteFix != null && typeof data.siteFix === 'object';
    }
  } catch {
    // proof lookup failure is reported via proofAuthFound=false
  }

  return {
    firestoreTarget: getFirestoreConnectionLabel(),
    authTarget: process.env.FIREBASE_AUTH_EMULATOR_HOST
      ? `emulator (${process.env.FIREBASE_AUTH_EMULATOR_HOST})`
      : 'live Auth (cloud)',
    projectId,
    usersCollectionCount,
    proofEmail,
    proofAuthFound,
    proofAuthUid,
    proofUserDocExists,
    proofUserDocEmail,
    proofUserDocHasSiteFix,
  };
}

function printConnectionProof(proof: ConnectionProof): void {
  console.log('\nConnection proof');
  console.log('  FIRESTORE_EMULATOR_HOST:', process.env.FIRESTORE_EMULATOR_HOST ?? '(unset → cloud)');
  console.log('  FIREBASE_AUTH_EMULATOR_HOST:', process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '(unset → cloud)');
  console.log('  Firestore target:', proof.firestoreTarget);
  console.log('  Auth target:', proof.authTarget);
  console.log('  Project ID:', proof.projectId);
  console.log('  users collection count:', proof.usersCollectionCount);
  console.log(`  Proof lookup (${proof.proofEmail}):`);
  console.log('    Auth user found:', proof.proofAuthFound);
  if (proof.proofAuthFound) {
    console.log('    Auth uid:', proof.proofAuthUid);
    console.log('    Firestore users/{uid} exists:', proof.proofUserDocExists);
    console.log('    Firestore user email:', proof.proofUserDocEmail ?? '(none)');
    console.log('    Firestore user has siteFix map:', proof.proofUserDocHasSiteFix);
  }
}

async function main(): Promise<void> {
  if (!admin.apps.length) {
    if (
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY &&
      process.env.FIREBASE_PROJECT_ID
    ) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
    } else {
      throw new Error('FIREBASE_PROJECT_ID is required');
    }
  }

  const db = admin.firestore();
  const auth = admin.auth();

  console.log('Site Fix literal-key backfill');
  console.log('  Project:', projectId);
  console.log('  Target:', getFirestoreConnectionLabel());
  console.log('  Auth:', authHost === 'cloud' ? 'cloud' : `emulator (${authHost})`);
  console.log('  Mode:', apply ? 'APPLY (writes enabled)' : 'DRY-RUN (read-only)');
  if (useProduction) {
    console.log('  --production: emulator env vars cleared:', FIREBASE_EMULATOR_ENV_KEYS.join(', '));
  }

  const proof = await proveFirestoreConnection(db, auth, 'whitem0824@gmail.com');
  printConnectionProof(proof);

  const result = await runSiteFixLiteralKeyBackfill(db, { apply });

  console.log('\nBackfill scan summary');
  console.log('  users scanned (paginated):', result.scanned);
  console.log('  users collection count (aggregation):', proof.usersCollectionCount);
  if (result.scanned !== proof.usersCollectionCount) {
    console.warn(
      `  ⚠️  scanned count (${result.scanned}) != aggregation count (${proof.usersCollectionCount})`
    );
  }
  console.log('  users with literal siteFix.* keys:', result.affected);
  if (apply) {
    console.log('  users updated:', result.applied);
  }
  console.log('  users with nested/literal value conflicts (nested kept):', result.skippedConflicts);

  if (result.plans.length > 0) {
    console.log('\nAffected users (first 20):');
    for (const plan of result.plans.slice(0, 20)) {
      console.log(`  ${plan.userId}`);
      console.log(`    literal keys: ${plan.literalKeys.join(', ')}`);
      if (Object.keys(plan.nestedWrites).length > 0) {
        console.log(
          `    copy to nested: ${Object.keys(plan.nestedWrites)
            .map((k) => k.replace(/^siteFix\./, ''))
            .join(', ')}`
        );
      }
      if (plan.skippedNestedFields.length > 0) {
        console.log(`    nested already set: ${plan.skippedNestedFields.join(', ')}`);
      }
      if (plan.conflicts.length > 0) {
        console.log(
          `    nested kept over literal: ${plan.conflicts.map((c) => c.field).join(', ')}`
        );
      }
      console.log(`    delete literal keys: ${plan.literalDeletes.join(', ')}`);
    }
    if (result.plans.length > 20) {
      console.log(`  ... and ${result.plans.length - 20} more`);
    }
  }

  if (!apply && result.affected > 0) {
    console.log('\nDry-run complete — no documents were modified.');
    console.log('Re-run with --apply to write changes after review.');
  }
}

main().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
