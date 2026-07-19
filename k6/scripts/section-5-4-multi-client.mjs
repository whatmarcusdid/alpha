/**
 * Section 5.4 — multi-client admin site-access rate limit isolation test.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const LOCAL = 'http://localhost:3000';

function loadDotEnvFile(relativePath) {
  const filePath = resolve(process.cwd(), relativePath);
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnvFile('.env.local');
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'tradesitegenie' });
}

const auth = admin.auth();
const db = admin.firestore();

async function mintIdToken(email, password) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'fake-api-key';
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
  const url = `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  if (!res.ok) throw new Error(`token mint failed: ${res.status}`);
  return (await res.json()).idToken;
}

async function setupAdmin(label) {
  const stamp = Date.now();
  const email = `s54-${label}-${stamp}@bookservice.test`;
  const password = 's54-admin-password-123456';
  const user = await auth.createUser({ email, password, displayName: `S54 ${label}` });
  await auth.setCustomUserClaims(user.uid, { admin: true });
  const token = await mintIdToken(email, password);
  return { uid: user.uid, token, email };
}

async function setupCustomer(prefix) {
  const stamp = Date.now();
  const email = `s54-customer-${prefix}-${stamp}@bookservice.test`;
  const user = await auth.createUser({ email, password: 's54-customer-pw-123456' });
  await db.collection('users').doc(user.uid).set({ email, firstName: 'S54', lastName: prefix });
  return user.uid;
}

async function seedFixSessions(customerUid, prefix, count) {
  const ids = [];
  for (let i = 0; i < count; i++) {
    const sessionId = `s54-${prefix}-fix-${Date.now()}-${i}`;
    ids.push(sessionId);
    await db
      .collection('users')
      .doc(customerUid)
      .collection('fixSessions')
      .doc(sessionId)
      .set({
        stage: 'awaiting_access',
        deliveryStatus: 'in_progress',
        accessStatus: 'needed',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
  }
  return ids;
}

async function postSiteAccess(adminToken, customerUid, sessionId, label) {
  const t0 = performance.now();
  const res = await fetch(`${LOCAL}/api/admin/site-access/request`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      uid: customerUid,
      sessionId,
      accessType: 'wp_admin',
      scopeDescription: `Section 5.4 ${label} concurrent isolation probe with enough chars.`,
      expiryDays: 7,
    }),
  });
  const ms = Math.round(performance.now() - t0);
  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }
  return {
    ms,
    status: res.status,
    error: json.error,
    limit: res.headers.get('x-ratelimit-limit'),
    remaining: res.headers.get('x-ratelimit-remaining'),
    retryAfter: res.headers.get('retry-after'),
  };
}

async function main() {
  const adminA = await setupAdmin('adminA');
  const adminB = await setupAdmin('adminB');
  const customerA = await setupCustomer('custA');
  const customerB = await setupCustomer('custB');
  const sessionsA = await seedFixSessions(customerA, 'A', 8);
  const sessionsB = await seedFixSessions(customerB, 'B', 8);

  console.log(
    JSON.stringify(
      {
        adminAUid: adminA.uid,
        adminBUid: adminB.uid,
        limitKeyA: `admin-site-access-request:${adminA.uid}`,
        limitKeyB: `admin-site-access-request:${adminB.uid}`,
      },
      null,
      2
    )
  );

  const clientBResults = [];
  const clientBStart = performance.now();

  const clientBWorker = (async () => {
    for (let i = 0; i < 4; i++) {
      const r = await postSiteAccess(
        adminB.token,
        customerB,
        sessionsB[i],
        `clientB-${i + 1}`
      );
      clientBResults.push({ n: i + 1, elapsedMs: Math.round(performance.now() - clientBStart), ...r });
      if (i < 3) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  })();

  const clientAResults = [];
  const clientAStart = performance.now();
  for (let i = 0; i < 6; i++) {
    const r = await postSiteAccess(
      adminA.token,
      customerA,
      sessionsA[i],
      `clientA-${i + 1}`
    );
    clientAResults.push({ n: i + 1, elapsedMs: Math.round(performance.now() - clientAStart), ...r });
  }

  await clientBWorker;

  const a429 = clientAResults.filter((r) => r.status === 429);
  const b429 = clientBResults.filter((r) => r.status === 429);
  const b200 = clientBResults.filter((r) => r.status === 200);

  console.log('\n=== Section 5.4 Results ===');
  console.log('CLIENT_A (burst 6, limit 5/min per admin uid):');
  console.log(JSON.stringify(clientAResults, null, 2));
  console.log('CLIENT_B (normal ~250ms interval during A burst):');
  console.log(JSON.stringify(clientBResults, null, 2));
  console.log(
    JSON.stringify(
      {
        pass:
          clientAResults.filter((r) => r.status === 200).length === 5 &&
          clientAResults.some((r) => r.status === 429) &&
          b429.length === 0 &&
          b200.length === clientBResults.length &&
          clientBResults.length > 0,
        clientA: {
          status200: clientAResults.filter((r) => r.status === 200).length,
          first429At: clientAResults.find((r) => r.status === 429)?.n ?? null,
          total429: a429.length,
        },
        clientB: {
          totalRequests: clientBResults.length,
          status200: b200.length,
          status429: b429.length,
          avgMs: Math.round(b200.reduce((s, r) => s + r.ms, 0) / Math.max(b200.length, 1)),
        },
        limitScope: 'per admin uid (admin-site-access-request:{adminUid})',
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
