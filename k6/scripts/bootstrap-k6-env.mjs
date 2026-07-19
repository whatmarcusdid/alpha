/**
 * Mint emulator admin token for k6 admin read tests. Prints export lines.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import admin from 'firebase-admin';

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
const stamp = Date.now();
const email = `k6-admin-${stamp}@bookservice.test`;
const password = 'k6-admin-password-123456';

const user = await auth.createUser({ email, password, displayName: 'K6 Admin' });
await auth.setCustomUserClaims(user.uid, { admin: true });

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'fake-api-key';
const emulatorHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
const signInUrl = `http://${emulatorHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
const signInRes = await fetch(signInUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, returnSecureToken: true }),
});
if (!signInRes.ok) {
  throw new Error(`Failed to mint admin token: ${signInRes.status} ${await signInRes.text()}`);
}
const { idToken } = await signInRes.json();

console.log(`export K6_BASE_URL=http://localhost:3000`);
console.log(`export K6_ADMIN_TOKEN='${idToken}'`);
console.log(`# admin uid: ${user.uid}`);
