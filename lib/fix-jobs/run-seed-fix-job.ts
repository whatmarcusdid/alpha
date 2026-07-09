import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp, type Firestore } from 'firebase-admin/firestore';

import { encryptSecret } from '@/lib/book-service/encryption';
import { ONBOARDING_STATUS } from '@/lib/book-service/onboarding-constants';
import { buildInitialFixProgress } from '@/lib/fix-jobs/helpers';
import {
  buildSeedAuditLeadDoc,
  getAppBaseUrl,
  parseSeedCliArgs,
  PILLAR_MAP,
  pillarsToSku,
  type SeedCliArgs,
} from '@/lib/fix-jobs/seed-fix-job-utils';
import { ensureFixSessionForOrder } from '@/lib/fix-jobs/seed-fix-session';

const TEST_PASSWORD = 'SeedTest123!';

function initFirebaseAdmin(): { adminDb: Firestore; adminAuth: Auth } {
  if (!getApps().length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      console.error('❌ Missing Firebase Admin env vars in .env.local');
      process.exit(1);
    }

    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  }

  return {
    adminDb: getFirestore(),
    adminAuth: getAuth(),
  };
}

export async function runSeedFixJob(argv: string[]): Promise<void> {
  const cli: SeedCliArgs = parseSeedCliArgs(argv);
  const { adminDb, adminAuth } = initFirebaseAdmin();

  const entitlements = PILLAR_MAP[cli.pillars];
  const sku = pillarsToSku(cli.pillars);
  const testEmail = `seed-${Date.now()}@tsg-test.dev`;
  const normalizedEmail = testEmail.toLowerCase().trim();

  let uid: string;
  try {
    const existing = await adminAuth.getUserByEmail(normalizedEmail);
    uid = existing.uid;
    console.log('↻ Reusing existing Auth user for', normalizedEmail);
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code !== 'auth/user-not-found') {
      throw error;
    }

    const created = await adminAuth.createUser({
      email: normalizedEmail,
      password: TEST_PASSWORD,
      displayName: 'Seed Customer',
    });
    uid = created.uid;
    console.log('✓ Created Auth user', normalizedEmail);
  }

  const auditLeadRef = adminDb.collection('auditLeads').doc();
  const auditLeadId = auditLeadRef.id;
  const orderRef = adminDb.collection('orders').doc();
  const orderId = orderRef.id;

  const auditLeadDoc = buildSeedAuditLeadDoc({
    auditLeadId,
    email: normalizedEmail,
    entitlements,
  });

  await auditLeadRef.set({
    ...auditLeadDoc,
    timestamp: FieldValue.serverTimestamp(),
  });

  await adminDb.collection('users').doc(uid).set(
    {
      email: normalizedEmail,
      fullName: 'Seed Customer',
      company: {
        legalName: 'Seed Trade Co',
        websiteUrl: 'https://example-trade.com',
      },
      siteFix: {
        orderId,
        auditLeadId,
        entitlements,
        purchasedPackages: entitlements,
        activeFixSessionId: orderId,
        onboardingStatus: cli.withAccess
          ? ONBOARDING_STATUS.DELIVERY_READY
          : ONBOARDING_STATUS.AWAITING_ACCESS,
        businessName: 'Seed Trade Co',
        websiteUrl: 'https://example-trade.com',
        contactName: 'Seed Customer',
        contactEmail: normalizedEmail,
        access_request: {
          submittedAt: null,
          method: null,
          notes: null,
        },
      },
    },
    { merge: true }
  );

  await orderRef.set({
    orderId,
    uid,
    email: normalizedEmail,
    normalizedEmail,
    auditLeadId,
    sku,
    entitlements,
    status: 'paid',
    createdAt: FieldValue.serverTimestamp(),
  });

  await adminDb.collection('auditLeads').doc(auditLeadId).update({ orderId });

  await ensureFixSessionForOrder({
    userId: uid,
    orderId,
    auditLeadId,
    entitlements,
    firestore: adminDb,
  });

  const sessionRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('fixSessions')
    .doc(orderId);

  if (cli.withAccess) {
    const passwordEncrypted = encryptSecret('SeedPassword123!');
    const accessRequest = {
      method: 'wp_admin',
      loginUrl: 'https://example-trade.com/wp-admin',
      username: 'seedadmin',
      passwordEncrypted,
      hostingProvider: 'SiteGround',
      notes: 'Seeded credentials for walkthrough',
      status: 'submitted' as const,
      submittedAt: FieldValue.serverTimestamp(),
    };

    await adminDb.collection('users').doc(uid).update({
      'siteFix.access_request': accessRequest,
      'siteFix.onboardingStatus': ONBOARDING_STATUS.DELIVERY_READY,
      'siteFix.onboardingCompletedAt': FieldValue.serverTimestamp(),
    });

    await sessionRef.update({
      stage: 'ready',
      accessStatus: 'received',
      stageHistory: FieldValue.arrayUnion({
        stage: 'ready',
        at: Timestamp.now(),
        by: 'seed-script',
      }),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const sessionSnap = await sessionRef.get();
  const sessionData = sessionSnap.data();
  const fixProgress = sessionData?.fixProgress ?? {};
  const expectedProgress = buildInitialFixProgress(
    { ...auditLeadDoc, timestamp: Timestamp.now() },
    entitlements
  );

  const sampleKey = Object.keys(expectedProgress)[0];
  if (sampleKey && fixProgress[sampleKey]) {
    console.log(
      `✓ fixProgress spot-check: ${sampleKey} →`,
      JSON.stringify(fixProgress[sampleKey])
    );
  }

  const baseUrl = getAppBaseUrl();
  const projectId = process.env.FIREBASE_PROJECT_ID ?? '(not set)';
  const accessLabel = cli.withAccess ? 'pre-seeded (ready stage)' : 'not pre-seeded (awaiting_access)';

  console.log('');
  console.log('✓ Seed complete');
  console.log('─────────────────────────────────────────────');
  console.log(`Project:      ${projectId}`);
  console.log(`Pillars:      ${entitlements.join(', ')}`);
  console.log(`Access:       ${accessLabel}`);
  console.log('');
  console.log(`Test user:    ${testEmail}`);
  console.log(`Password:     ${TEST_PASSWORD}`);
  console.log(`UID:          ${uid}`);
  console.log('');
  console.log(`Queue URL:    ${baseUrl}/admin/fix-jobs`);
  console.log(`Detail URL:   ${baseUrl}/admin/fix-jobs/${orderId}?uid=${uid}`);
  console.log('');
  console.log(`auditLeadId:  ${auditLeadId}`);
  console.log(`orderId:      ${orderId}`);
  console.log('─────────────────────────────────────────────');
  console.log('Sign in as the test user to see the customer dashboard:');
  console.log(`${baseUrl}/dashboard`);
  console.log('');
}
