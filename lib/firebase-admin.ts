/**
 * Firebase Admin SDK - Server-side only
 *
 * This file initializes the Firebase Admin SDK for API routes and server-side code.
 * NEVER import this file in client components, pages, or any browser-executed code.
 * Use the browser-only Firebase client SDK (lib/firebase.ts) for client-side code.
 */

import { initializeApp, getApps, cert, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import type { Firestore } from 'firebase-admin/firestore';
import type { Auth } from 'firebase-admin/auth';

let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

// Validate required environment variables
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const hasAllEnvVars = !!projectId && !!clientEmail && !!privateKey;

if (!hasAllEnvVars) {
  console.error(
    '⚠️ Firebase Admin SDK not initialized - missing required environment variables in .env.local:'
  );
  if (!projectId) console.error('  • FIREBASE_PROJECT_ID');
  if (!clientEmail) console.error('  • FIREBASE_CLIENT_EMAIL');
  if (!privateKey) console.error('  • FIREBASE_PRIVATE_KEY');
  console.error(
    'Get these from Firebase Console → Project Settings → Service Accounts → Generate new private key'
  );
} else if (getApps().length === 0) {
  try {
    const firebaseAdminConfig: ServiceAccount = {
      projectId,
      clientEmail,
      privateKey,
    };

    initializeApp({
      credential: cert(firebaseAdminConfig),
    });

    adminDb = getFirestore();
    adminAuth = getAuth();

    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error);
    console.error(
      'Verify your FIREBASE_PRIVATE_KEY format (ensure newlines are escaped as \\n in .env.local)'
    );
    adminDb = null;
    adminAuth = null;
  }
} else {
  // App already initialized (e.g. by another module)
  adminDb = getFirestore();
  adminAuth = getAuth();
}

export { adminDb, adminAuth };
