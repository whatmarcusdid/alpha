/**
 * Firestore security rules tests — runs against the local emulator.
 *
 * Execute via:
 *   npm run test:firestore-rules
 *
 * Loads rules from repo-root firestore.rules (same file firebase deploy uses).
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

const RULES_PATH = resolve(
  fileURLToPath(new URL('../../../firestore.rules', import.meta.url))
);
const PROJECT_ID = 'firestore-rules-test';
const EMULATOR_HOST = '127.0.0.1';
const EMULATOR_PORT = 8080;

const OWNER_UID = 'rules-test-owner';
const OTHER_UID = 'rules-test-other';

let testEnv: RulesTestEnvironment;

async function seedOwnerDoc(extra: Record<string, unknown> = {}): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', OWNER_UID), {
      email: 'owner@example.com',
      fullName: 'Owner User',
      ...extra,
    });
  });
}

describe.sequential('Firestore users/{userId} security rules (emulator)', () => {
  beforeAll(async () => {
    const rules = readFileSync(RULES_PATH, 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: EMULATOR_HOST,
        port: EMULATOR_PORT,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('owner can update company.* on own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', OWNER_UID), {
        'company.legalName': 'Acme Plumbing LLC',
        'company.city': 'Columbus',
      })
    );
  });

  it('owner can update settings.* on own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', OWNER_UID), {
        'settings.timezone': 'America/New_York',
        'settings.emailFrequency': 'weekly',
      })
    );
  });

  it('owner can update fullName, phone, role on own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', OWNER_UID), {
        fullName: 'Owner Updated',
        phone: '555-0100',
        role: 'Owner',
      })
    );
  });

  it('owner can update upcomingMeetings on own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', OWNER_UID), {
        upcomingMeetings: [
          {
            id: 'm1',
            title: 'Q1 Review',
            status: 'scheduled',
          },
        ],
      })
    );
  });

  it('owner can update siteFix.contactName and siteFix.contactLastName on own doc', async () => {
    await seedOwnerDoc({ siteFix: { contactName: 'Jane' } });
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      updateDoc(doc(db, 'users', OWNER_UID), {
        'siteFix.contactName': 'Jane',
        'siteFix.contactLastName': 'Doe',
      })
    );
  });

  it('owner cannot write siteFix.access_request (any sub-field) on own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'users', OWNER_UID), {
        'siteFix.access_request': {
          username: 'attacker',
          passwordEncrypted: 'fake:cipher:blob',
          method: 'wp_admin',
        },
      })
    );
  });

  it('owner cannot write subscription.stripeSubscriptionId on own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'users', OWNER_UID), {
        'subscription.stripeSubscriptionId': 'sub_attacker_controlled',
      })
    );
  });

  it('owner cannot write subscription.status on own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'users', OWNER_UID), {
        'subscription.status': 'active',
      })
    );
  });

  it('owner cannot write subscription.stripeCustomerId on own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'users', OWNER_UID), {
        'subscription.stripeCustomerId': 'cus_attacker_controlled',
      })
    );
  });

  it('owner cannot write hostingContext.* on own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'users', OWNER_UID), {
        'hostingContext.host': 'evil-host',
        'hostingContext.confirmedBy': 'fake-admin-uid',
      })
    );
  });

  it('owner cannot write auditLeadLinked on own doc', async () => {
    await seedOwnerDoc({ auditLeadLinked: false });
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'users', OWNER_UID), {
        auditLeadLinked: true,
      })
    );
  });

  it('owner cannot write top-level stripeCustomerId on own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'users', OWNER_UID), {
        stripeCustomerId: 'cus_attacker_controlled',
      })
    );
  });

  it('other authenticated user cannot read owner doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OTHER_UID).firestore();
    await assertFails(getDoc(doc(db, 'users', OWNER_UID)));
  });

  it('other authenticated user cannot write owner doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OTHER_UID).firestore();
    await assertFails(
      updateDoc(doc(db, 'users', OWNER_UID), {
        fullName: 'Hijacked',
      })
    );
  });

  it('unauthenticated client cannot read owner doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, 'users', OWNER_UID)));
  });

  it('unauthenticated client cannot write owner doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      setDoc(doc(db, 'users', OWNER_UID), {
        fullName: 'Anonymous overwrite',
      })
    );
  });

  it('owner cannot delete own doc', async () => {
    await seedOwnerDoc();
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(deleteDoc(doc(db, 'users', OWNER_UID)));
  });

  it('legacy client signup create with allowed fields only succeeds', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertSucceeds(
      setDoc(doc(db, 'users', OWNER_UID), {
        email: 'newuser@example.com',
        fullName: 'New User',
        createdAt: new Date(),
        company: null,
        settings: {
          timezone: 'America/New_York',
          emailFrequency: 'real-time',
        },
        metrics: {
          websiteTraffic: 0,
          siteSpeedSeconds: 0,
          supportHoursRemaining: 4,
          maintenanceHoursRemaining: 8,
        },
      })
    );
  });

  it('legacy client signup create with disallowed subscription field is denied', async () => {
    const db = testEnv.authenticatedContext(OWNER_UID).firestore();
    await assertFails(
      setDoc(doc(db, 'users', OWNER_UID), {
        email: 'newuser@example.com',
        fullName: 'New User',
        createdAt: new Date(),
        company: null,
        settings: {
          timezone: 'America/New_York',
          emailFrequency: 'real-time',
        },
        metrics: {
          websiteTraffic: 0,
          siteSpeedSeconds: 0,
          supportHoursRemaining: 4,
          maintenanceHoursRemaining: 8,
        },
        subscription: {
          tier: 'premium',
          status: 'active',
          stripeSubscriptionId: 'sub_forged_at_signup',
          stripeCustomerId: 'cus_forged_at_signup',
        },
      })
    );
  });
});
