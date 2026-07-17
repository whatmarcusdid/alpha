import type { NextRequest } from 'next/server';

/** Firebase emulator env vars that redirect Admin SDK away from live Firestore. */
export const FIREBASE_EMULATOR_ENV_KEYS = [
  'FIRESTORE_EMULATOR_HOST',
  'FIREBASE_AUTH_EMULATOR_HOST',
  'FIREBASE_STORAGE_EMULATOR_HOST',
] as const;

/**
 * Dev-only API tokens (devResetToken, devAccessToken) require BOTH emulator host
 * and non-production NODE_ENV — defense in depth against single-flag misconfig.
 */
export function isDevTokenExposureEnabled(): boolean {
  return (
    Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST) &&
    process.env.NODE_ENV !== 'production'
  );
}

/** Emulator smoke helpers: dev tokens + localhost host only. */
export function isLocalEmulatorSmokeRequest(req: NextRequest): boolean {
  if (!isDevTokenExposureEnabled()) {
    return false;
  }

  const host = req.headers.get('host') ?? '';
  return host.includes('localhost') || host.includes('127.0.0.1');
}

export function clearFirebaseEmulatorEnv(): void {
  for (const key of FIREBASE_EMULATOR_ENV_KEYS) {
    delete process.env[key];
  }
}

export function getFirestoreConnectionLabel(): string {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  return host ? `emulator (${host})` : 'live Firestore (cloud)';
}

export function assertLiveFirestoreForProductionFlag(useProduction: boolean): void {
  if (!useProduction) {
    return;
  }

  clearFirebaseEmulatorEnv();

  if (process.env.FIRESTORE_EMULATOR_HOST) {
    throw new Error(
      'FIRESTORE_EMULATOR_HOST is still set after --production cleanup — refusing to run'
    );
  }
}
