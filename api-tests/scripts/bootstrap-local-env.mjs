/**
 * Bootstrap api-tests/local.postman_environment.json for localhost + emulator runs.
 * Reads .env.local; never targets production.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import admin from 'firebase-admin';

const OUTPUT = resolve(process.cwd(), 'api-tests/local.postman_environment.json');

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
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile('.env.local');

process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID ?? 'tradesitegenie' });
}

const auth = admin.auth();

async function mintIdToken(email, password) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'fake-api-key';
  const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
  const url = `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to mint ID token for ${email}: ${res.status} ${text}`);
  }

  const json = await res.json();
  return json.idToken;
}

async function main() {
  const adminEmail = `admin-api-smoke-${Date.now()}@bookservice.test`;
  const adminPassword = 'api-smoke-admin-password-123';

  const adminUser = await auth.createUser({
    email: adminEmail,
    password: adminPassword,
    displayName: 'API Smoke Admin',
  });
  await auth.setCustomUserClaims(adminUser.uid, { admin: true });
  const adminToken = await mintIdToken(adminEmail, adminPassword);

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY ?? '';
  if (!stripeSecretKey.startsWith('sk_test_')) {
    throw new Error(
      'STRIPE_SECRET_KEY must be sk_test_... in .env.local — local API smoke refuses live-mode Stripe keys.'
    );
  }

  const env = {
    id: 'book-service-local-env',
    name: 'Book Service — Local (emulator)',
    values: [
      { key: 'baseUrl', value: 'http://localhost:3000', type: 'default', enabled: true },
      { key: 'appUrl', value: 'http://localhost:3000', type: 'default', enabled: true },
      { key: 'adminToken', value: adminToken, type: 'secret', enabled: true },
      { key: 'userToken', value: '', type: 'secret', enabled: true },
      {
        key: 'firebaseApiKey',
        value: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'fake-api-key',
        type: 'secret',
        enabled: true,
      },
      {
        key: 'firebaseAuthEmulatorHost',
        value: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099',
        type: 'default',
        enabled: true,
      },
      {
        key: 'stripeWebhookSecret',
        value: process.env.STRIPE_WEBHOOK_SECRET ?? '',
        type: 'secret',
        enabled: true,
      },
      {
        key: 'stripeSecretKey',
        value: stripeSecretKey,
        type: 'secret',
        enabled: true,
      },
      { key: 'testEmail', value: '', type: 'default', enabled: true },
      { key: 'testPassword', value: 'api-smoke-test-password-123', type: 'secret', enabled: true },
      { key: 'resetPasswordNewPassword', value: 'api-smoke-reset-password-456', type: 'secret', enabled: true },
      { key: 'passwordResetToken', value: '', type: 'default', enabled: true },
      {
        key: 'firebaseProjectId',
        value: process.env.FIREBASE_PROJECT_ID ?? 'tradesitegenie',
        type: 'default',
        enabled: true,
      },
      {
        key: 'firestoreEmulatorHost',
        value: process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080',
        type: 'default',
        enabled: true,
      },
      {
        key: 'cronSecret',
        value: process.env.CRON_SECRET ?? '',
        type: 'secret',
        enabled: true,
      },
      { key: 'auditLeadId', value: '', type: 'default', enabled: true },
      { key: 'orderId', value: '', type: 'default', enabled: true },
      { key: 'userId', value: '', type: 'default', enabled: true },
      { key: 'fixJobId', value: '', type: 'default', enabled: true },
      { key: 'siteAccessRequestId', value: '', type: 'default', enabled: true },
      { key: 'grantedToken', value: '', type: 'default', enabled: true },
      { key: 'declineToken', value: '', type: 'default', enabled: true },
      { key: 'checkoutUrl', value: '', type: 'default', enabled: true },
      { key: 'stripeCheckoutSessionId', value: '', type: 'default', enabled: true },
      { key: 'stripeNormalizedEmail', value: '', type: 'default', enabled: true },
      { key: 'customToken', value: '', type: 'default', enabled: true },
      { key: 'runMutatingSmoke', value: 'true', type: 'default', enabled: true },
      { key: 'allowSyntheticWebhook', value: 'true', type: 'default', enabled: true },
      { key: 'testSku', value: 'speed_fix', type: 'default', enabled: true },
    ],
    _postman_variable_scope: 'environment',
    _postman_exported_at: new Date().toISOString(),
    _postman_exported_using: 'bootstrap-local-env.mjs',
  };

  if (!env.values.find((v) => v.key === 'stripeWebhookSecret')?.value) {
    throw new Error('STRIPE_WEBHOOK_SECRET missing from .env.local — required for synthetic webhook signing.');
  }

  writeFileSync(OUTPUT, `${JSON.stringify(env, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT}`);
  console.log(`Admin bootstrap user: ${adminEmail}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
