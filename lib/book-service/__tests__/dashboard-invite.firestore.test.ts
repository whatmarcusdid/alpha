import { loadDotEnvFile } from '@/lib/fix-jobs/seed-fix-job-utils';

loadDotEnvFile('.env.local');

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.CI = '';

import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/book-service/emails', () => ({
  sendDashboardInviteEmail: vi.fn(async () => undefined),
}));

vi.mock('@/lib/book-service/validate-base-url', () => ({
  warnIfBaseUrlLooksWrong: vi.fn(),
}));

vi.mock('@/lib/base-url', () => ({
  getAppBaseUrl: () => 'http://localhost:3000',
}));

const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;

describe.skipIf(!emulatorHost)('processDashboardInvite — Firestore storage semantics', () => {
  let db: Firestore;
  let processDashboardInvite: typeof import('@/lib/book-service/dashboard-invite').processDashboardInvite;
  const testUid = `dashboard-invite-firestore-${Date.now()}`;

  beforeAll(async () => {
    const { getAdminDb } = await import('@/lib/firebase/helpers');
    db = getAdminDb();
    ({ processDashboardInvite } = await import('@/lib/book-service/dashboard-invite'));
  });

  beforeEach(async () => {
    await db.collection('users').doc(testUid).delete();
  });

  afterAll(async () => {
    await db.collection('users').doc(testUid).delete();
  });

  it('documents .set(merge) bug: dotted keys become literal top-level fields', async () => {
    const ref = db.collection('users').doc(`${testUid}-set-bug`);
    await ref.set({
      siteFix: {
        contactName: 'API',
        orderId: 'order-signup',
      },
    });
    await ref.set(
      {
        'siteFix.inviteStatus': 'sent',
        'siteFix.sku': 'speed_fix',
      },
      { merge: true }
    );

    const data = (await ref.get()).data()!;
    expect(data.siteFix).toMatchObject({
      contactName: 'API',
      orderId: 'order-signup',
    });
    expect(data.siteFix.inviteStatus).toBeUndefined();
    expect(data['siteFix.inviteStatus']).toBe('sent');
    expect(data['siteFix.sku']).toBe('speed_fix');

    await ref.delete();
  });

  it('.update() dot paths nest under siteFix without clobbering signup pre-fill', async () => {
    const ref = db.collection('users').doc(`${testUid}-update-fix`);
    await ref.set({
      email: 'buyer@example.com',
      siteFix: {
        contactName: 'API',
        orderId: 'order-signup',
        purchasedPackages: ['speed'],
      },
    });

    await ref.update({
      email: 'buyer@example.com',
      'siteFix.sku': 'speed_fix',
      'siteFix.entitlements': ['speed'],
      'siteFix.orderId': 'order-signup',
      'siteFix.inviteStatus': 'sent',
      'siteFix.invitedAt': FieldValue.serverTimestamp(),
      'siteFix.acceptedAt': null,
      'siteFix.purchasedAt': FieldValue.serverTimestamp(),
      'siteFix.activeFixSessionId': null,
    });

    const data = (await ref.get()).data()!;
    expect(data['siteFix.inviteStatus']).toBeUndefined();
    expect(data['siteFix.sku']).toBeUndefined();
    expect(data.siteFix).toMatchObject({
      contactName: 'API',
      orderId: 'order-signup',
      purchasedPackages: ['speed'],
      sku: 'speed_fix',
      entitlements: ['speed'],
      inviteStatus: 'sent',
      acceptedAt: null,
      activeFixSessionId: null,
    });

    await ref.delete();
  });

  it('processDashboardInvite stores inviteStatus in nested siteFix (signup-then-invite)', async () => {
    const uid = `${testUid}-integration`;
    await db.collection('users').doc(uid).set({
      email: 'buyer@example.com',
      siteFix: {
        contactName: 'API',
        orderId: 'order-signup-first',
        purchasedPackages: ['speed'],
      },
    });

    await processDashboardInvite({
      userId: uid,
      email: 'buyer@example.com',
      orderId: 'order-signup-first',
      sku: 'speed_fix',
    });

    const data = (await db.collection('users').doc(uid).get()).data()!;
    expect(data['siteFix.inviteStatus']).toBeUndefined();
    expect(data.siteFix).toMatchObject({
      contactName: 'API',
      orderId: 'order-signup-first',
      purchasedPackages: ['speed'],
      inviteStatus: 'sent',
      sku: 'speed_fix',
      entitlements: ['speed'],
    });

    await db.collection('users').doc(uid).delete();
  });
});
