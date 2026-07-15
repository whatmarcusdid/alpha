// Node-side helper (runs in the Playwright test process) that seeds Firestore
// directly via the Admin SDK, so Journey C doesn't need to chain off a real
// checkout run. Requires the Firebase Emulator Suite running — this connects
// via FIRESTORE_EMULATOR_HOST (loaded from .env.local by playwright.config.ts),
// same as the app server.
//
// Deliberately self-initializes rather than importing @/lib/firebase/admin:
// that module does `import * as admin from 'firebase-admin'`, and under
// Playwright's native Node ESM loader (this repo is "type": "module") that
// namespace import resolves `admin.apps` to undefined — a CJS/ESM interop
// gap specific to firebase-admin outside Next.js's own bundler. The default
// import below (`import admin from ...`) gets the real CJS module.exports
// object and works correctly.

import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}
const adminDb = admin.firestore();

export type SiteFixSKU =
  | 'speed_fix'
  | 'security_fix'
  | 'seo_ai_visibility_fix'
  | 'full_bundle';

function expandEntitlements(sku: SiteFixSKU): string[] {
  switch (sku) {
    case 'full_bundle':
      return ['speed', 'security', 'seo_ai_visibility'];
    case 'speed_fix':
      return ['speed'];
    case 'security_fix':
      return ['security'];
    case 'seo_ai_visibility_fix':
      return ['seo_ai_visibility'];
  }
}

export async function seedSiteFixOrder(params: {
  orderId: string;
  auditLeadId: string;
  sku: SiteFixSKU;
  normalizedEmail: string;
  firstName: string;
  businessName: string;
  websiteUrl: string;
}): Promise<void> {
  await adminDb.collection('auditLeads').doc(params.auditLeadId).set({
    auditLeadId: params.auditLeadId,
    firstName: params.firstName,
    businessName: params.businessName,
    email: params.normalizedEmail,
    websiteUrl: params.websiteUrl,
    source: 'public_audit',
    schemaVersion: 'v2',
    timestamp: FieldValue.serverTimestamp(),
  });

  await adminDb.collection('pending_orders').doc(params.orderId).set({
    orderId: params.orderId,
    auditLeadId: params.auditLeadId,
    sku: params.sku,
    entitlements: expandEntitlements(params.sku),
    normalizedEmail: params.normalizedEmail,
    claimState: 'unclaimed',
    claimedByUserId: null,
    claimedAt: null,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function getUserDoc(
  uid: string
): Promise<FirebaseFirestore.DocumentData | undefined> {
  const snap = await adminDb.collection('users').doc(uid).get();
  return snap.data();
}

export async function getClaimedUserId(orderId: string): Promise<string | null> {
  const snap = await adminDb.collection('pending_orders').doc(orderId).get();
  const claimedByUserId = snap.data()?.claimedByUserId;
  return typeof claimedByUserId === 'string' ? claimedByUserId : null;
}

export async function getFixSessionStage(
  uid: string,
  orderId: string
): Promise<FirebaseFirestore.DocumentData | undefined> {
  const snap = await adminDb
    .collection('users')
    .doc(uid)
    .collection('fixSessions')
    .doc(orderId)
    .get();
  return snap.data();
}
