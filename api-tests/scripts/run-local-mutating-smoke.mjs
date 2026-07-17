/**
 * Run Folders 1–3 + 7 mutating API smoke against localhost + Firebase emulator.
 * Does NOT target production.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const LOCAL_BASE = 'http://localhost:3000';

function assertLocalhostReachable() {
  // Synchronous check via curl would need shell — use fetch
}

async function preflight() {
  try {
    const res = await fetch(`${LOCAL_BASE}/`);
    if (!res.ok) {
      throw new Error(`GET / returned ${res.status}`);
    }
  } catch (err) {
    throw new Error(
      `Local app not reachable at ${LOCAL_BASE}. Start emulator + dev server first:\n` +
        '  firebase emulators:start --only auth,firestore,storage\n' +
        '  NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true NEXT_PUBLIC_APP_URL=http://localhost:3000 NEXT_PUBLIC_BASE_URL=http://localhost:3000 SITE_FIX_ENCRYPTION_KEY=... npm run dev'
    );
  }

  try {
    const res = await fetch('http://127.0.0.1:9099/');
    if (!res.ok && res.status !== 404) {
      console.warn('Auth emulator HTTP check returned', res.status);
    }
  } catch {
    throw new Error('Firebase Auth emulator not reachable on 127.0.0.1:9099');
  }

  try {
    const res = await fetch('http://127.0.0.1:9199/');
    // Storage emulator returns 501 on GET / — any TCP response means it is up
    if (!res.ok && res.status !== 404 && res.status !== 501) {
      console.warn('Storage emulator HTTP check returned', res.status);
    }
  } catch {
    throw new Error(
      'Firebase Storage emulator not reachable on 127.0.0.1:9199 — required for Folder 7 report/generate.\n' +
        'Restart emulators with storage:\n' +
        '  firebase emulators:start --only auth,firestore,storage'
    );
  }
}

async function main() {
  await preflight();

  if (process.env.FORCE_PRODUCTION_API_TESTS === 'true') {
    throw new Error('Refusing to run local mutating smoke with FORCE_PRODUCTION_API_TESTS=true');
  }

  const emulatorEnv = {
    ...process.env,
    FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080',
    FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099',
    FIREBASE_STORAGE_EMULATOR_HOST: process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199',
  };

  const bootstrap = spawnSync('node', ['api-tests/scripts/bootstrap-local-env.mjs'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: emulatorEnv,
  });
  if (bootstrap.status !== 0) {
    process.exit(bootstrap.status ?? 1);
  }

  const collection = resolve('api-tests/book-service-api.postman_collection.json');
  const environment = resolve('api-tests/local.postman_environment.json');

  const newman = spawnSync(
    'npx',
    ['newman', 'run', collection, '-e', environment, '--reporters', 'cli'],
    { cwd: process.cwd(), stdio: 'inherit', env: emulatorEnv }
  );

  process.exit(newman.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
