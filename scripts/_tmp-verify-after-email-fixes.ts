/**
 * Verify payment-confirmed + delivery-ready emails on production after after() fix.
 * Delete after use.
 */
import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

import { loadDotEnvFile } from '../lib/fix-jobs/seed-fix-job-utils';
import { createTestEmail, type TestmailMessage } from '../e2e/support/testmail';
import { ONBOARDING_STATUS } from '../lib/book-service/onboarding-constants';

loadDotEnvFile('.env.local');
delete process.env.FIRESTORE_EMULATOR_HOST;
delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
delete process.env.FIREBASE_STORAGE_EMULATOR_HOST;

const PROD_BASE = 'https://my.bookservice.tech';
const MARKER = `bs-afterfix-${Date.now().toString(36)}`;
const PASSWORD = 'AfterFixVerify-123!';

const cleanup: {
  uids: string[];
  orderIds: string[];
  auditLeadIds: string[];
} = { uids: [], orderIds: [], auditLeadIds: [] };

function initFirebase(): void {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
    }),
  });
}

async function pollTestmail(
  tag: string,
  subjectMatch: RegExp,
  timeoutMs = 120_000
): Promise<TestmailMessage | null> {
  const apiKey = process.env.TESTMAIL_API_KEY;
  const namespace = process.env.TESTMAIL_NAMESPACE;
  if (!apiKey || !namespace) return null;

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const url = new URL('https://api.testmail.app/api/json');
    url.searchParams.set('apikey', apiKey);
    url.searchParams.set('namespace', namespace);
    url.searchParams.set('tag', tag);
    const res = await fetch(url.toString());
    const payload = (await res.json()) as { emails: TestmailMessage[] };
    const match = payload.emails?.find((e) => subjectMatch.test(e.subject));
    if (match) return match;
    await new Promise((r) => setTimeout(r, 3000));
  }
  return null;
}

async function idTokenForUid(uid: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY!;
  const customToken = await admin.auth().createCustomToken(uid);
  const signInRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  );
  const signIn = (await signInRes.json()) as { idToken?: string };
  if (!signIn.idToken) throw new Error('Failed to get id token');
  return signIn.idToken;
}

async function testPaymentConfirmed(): Promise<void> {
  console.log('\n=== PAYMENT CONFIRMED (checkout.session.completed → handleSiteFixPayment) ===');
  const test = createTestEmail(`pay-${Date.now().toString(36)}`);
  const orderId = `order-${MARKER}-pay`;
  const auditLeadId = `audit-${MARKER}-pay`;
  cleanup.orderIds.push(orderId);
  cleanup.auditLeadIds.push(auditLeadId);

  const db = admin.firestore();
  await db.collection('auditLeads').doc(auditLeadId).set({
    auditLeadId,
    firstName: 'QA',
    businessName: 'QA Plumbing',
    email: test.email,
    websiteUrl: 'https://qa-plumbing.example.com',
    source: 'public_audit',
    schemaVersion: 'v2',
    timestamp: FieldValue.serverTimestamp(),
  });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) throw new Error('STRIPE_SECRET_KEY required');
  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(stripeKey, { apiVersion: '2025-12-15.clover' });

  const prices = await stripe.prices.list({ active: true, limit: 30 });
  const speedPrice =
    prices.data.find((p) => p.lookup_key === 'speed_fix') ??
    prices.data.find((p) => p.unit_amount === 79900) ??
    prices.data[0];
  if (!speedPrice) throw new Error('No Stripe price found for speed_fix');

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{ price: speedPrice.id, quantity: 1 }],
    customer_email: test.email,
    metadata: {
      productType: 'site_fix',
      orderId,
      auditLeadId,
      sku: 'speed_fix',
      normalizedEmail: test.email,
    },
    success_url: `${PROD_BASE}/book-service/confirmation?orderId=${orderId}`,
    cancel_url: `${PROD_BASE}/book-service/select`,
  });

  const retrieved = await stripe.checkout.sessions.retrieve(session.id, {
    expand: ['payment_intent'],
  });
  const pi = retrieved.payment_intent;
  const piId = typeof pi === 'string' ? pi : pi?.id;
  if (piId) {
    try {
      await stripe.paymentIntents.confirm(piId, { payment_method: 'pm_card_visa' });
      console.log('payment_intent confirmed:', piId);
    } catch (err) {
      console.log('payment_intent.confirm error:', err instanceof Error ? err.message : err);
    }
  } else {
    console.log('no payment_intent on checkout session');
  }

  const finalSession = await stripe.checkout.sessions.retrieve(session.id);
  console.log('checkout session:', session.id, 'status:', finalSession.status, 'payment_status:', finalSession.payment_status);

  const inbox = await pollTestmail(test.tag, /payment|confirmed|order|Site Fix/i);
  if (inbox) {
    console.log('INBOX subject:', inbox.subject);
    console.log('INBOX from:', inbox.from);
    console.log('INBOX timestamp:', new Date(inbox.timestamp).toISOString());
  } else {
    console.log('INBOX: (timeout)');
  }
}

async function testDeliveryReady(): Promise<void> {
  console.log('\n=== DELIVERY READY (POST /api/book-service/submit-access) ===');
  const test = createTestEmail(`del-${Date.now().toString(36)}`);
  const orderId = `order-${MARKER}-del`;

  const user = await admin.auth().createUser({
    email: test.email,
    password: PASSWORD,
    displayName: 'Jordan',
  });
  cleanup.uids.push(user.uid);
  cleanup.orderIds.push(orderId);

  const db = admin.firestore();
  await db
    .collection('users')
    .doc(user.uid)
    .set({
      email: test.email,
      fullName: 'Jordan',
      siteFix: {
        orderId,
        contactEmail: test.email,
        contactName: 'Jordan',
        businessName: 'Bright Path Plumbing',
        websiteUrl: 'https://brightpath-plumbing.example.com',
        purchasedPackages: ['speed'],
        onboardingStatus: ONBOARDING_STATUS.AWAITING_ACCESS,
      },
    });

  await db
    .collection('users')
    .doc(user.uid)
    .collection('fixSessions')
    .doc(orderId)
    .set({
      stage: 'awaiting_access',
      orderId,
      createdAt: FieldValue.serverTimestamp(),
    });

  const idToken = await idTokenForUid(user.uid);
  const res = await fetch(`${PROD_BASE}/api/book-service/submit-access`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      orderId,
      partial: false,
      accessMethod: 'WordPress admin',
      loginUrl: 'https://brightpath-plumbing.example.com/wp-admin',
      username: 'qa_admin',
      password: 'TestPassword-123!',
      confirmed: true,
    }),
  });
  const body = await res.json();
  console.log('submit-access HTTP:', res.status, JSON.stringify(body));

  const inbox = await pollTestmail(test.tag, /delivery|ready|access submitted/i);
  if (inbox) {
    console.log('INBOX subject:', inbox.subject);
    console.log('INBOX from:', inbox.from);
    console.log('INBOX timestamp:', new Date(inbox.timestamp).toISOString());
  } else {
    console.log('INBOX: (timeout)');
  }
}

async function cleanupArtifacts(): Promise<void> {
  const db = admin.firestore();
  for (const orderId of cleanup.orderIds) {
    await db.collection('orders').doc(orderId).delete().catch(() => undefined);
    await db.collection('pending_orders').doc(orderId).delete().catch(() => undefined);
  }
  for (const auditLeadId of cleanup.auditLeadIds) {
    await db.collection('auditLeads').doc(auditLeadId).delete().catch(() => undefined);
  }
  for (const uid of cleanup.uids) {
    try {
      const sessions = await db.collection('users').doc(uid).collection('fixSessions').listDocuments();
      for (const s of sessions) await s.delete();
      await db.collection('users').doc(uid).delete();
      await admin.auth().deleteUser(uid);
    } catch {
      /* ignore */
    }
  }
}

async function main(): Promise<void> {
  initFirebase();
  console.log('MARKER:', MARKER);
  console.log('Expected deploy commit: 7c9a86f');

  await testPaymentConfirmed();
  await testDeliveryReady();

  console.log('\nCleaning up…');
  await cleanupArtifacts();
  console.log('Done.');
}

main().catch(async (err) => {
  console.error('FATAL:', err);
  try {
    await cleanupArtifacts();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
