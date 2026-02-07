/**
 * Firebase Client Configuration
 * 
 * CRITICAL: This file follows the browser-only initialization pattern.
 * - All Firebase imports wrapped in typeof window !== 'undefined' checks
 * - Uses require() pattern instead of ES6 imports
 * - Firebase only runs in the browser, never on the server
 * 
 * This pattern prevents Firebase from attempting to initialize on the server,
 * which would cause errors and security issues.
 */

// Import Firebase types for TypeScript support (types are safe at top-level)
import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase exports object
interface FirebaseExports {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
}

const firebaseExports: FirebaseExports = {
  app: null,
  auth: null,
  db: null,
  storage: null,
};

// Browser-only Firebase initialization
if (typeof window !== 'undefined') {
  // Validate configuration values (check actual config object, not process.env)
  // NEXT_PUBLIC_ vars are inlined at build time, so we check the resulting values
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
    console.error('⚠️ Firebase not initialized due to missing configuration');
    console.error('Required environment variables:');
    console.error('- NEXT_PUBLIC_FIREBASE_API_KEY');
    console.error('- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
    console.error('- NEXT_PUBLIC_FIREBASE_PROJECT_ID');
    console.error('- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
    console.error('- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
    console.error('- NEXT_PUBLIC_FIREBASE_APP_ID');
    console.error('Add these to your .env.local file and restart the dev server.');
  } else {
    try {
      // Use require() to load Firebase modules (browser-only)
      const { initializeApp, getApps, getApp } = require('firebase/app');
      const { getAuth } = require('firebase/auth');
      const { getFirestore } = require('firebase/firestore');
      const { getStorage } = require('firebase/storage');

      // Initialize Firebase app (singleton pattern)
      const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

      // Initialize Firebase services
      firebaseExports.app = app;
      firebaseExports.auth = getAuth(app);
      firebaseExports.db = getFirestore(app);
      firebaseExports.storage = getStorage(app);

      console.log('✅ Firebase initialized successfully');
      console.log('🔥 Firebase Config Check:', {
        apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.substring(0, 20)}...` : 'MISSING',
        authDomain: firebaseConfig.authDomain || 'MISSING',
        projectId: firebaseConfig.projectId || 'MISSING',
        storageBucket: firebaseConfig.storageBucket || 'MISSING',
      });

      // Test Firebase Auth connection
      const { onAuthStateChanged } = require('firebase/auth');
      onAuthStateChanged(firebaseExports.auth, (user: any) => {
        console.log('🔥 Firebase Auth State:', user ? `Connected (${user.email})` : 'Not signed in');
      });
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        name: error instanceof Error ? error.name : 'Unknown',
      });
    }
  }
} else {
  // Server-side: Firebase not available
  console.log('⚠️ Firebase initialization skipped (server-side render)');
}

// Export Firebase instances (will be null on server, initialized on client)
export const app = firebaseExports.app;
export const auth = firebaseExports.auth;
export const db = firebaseExports.db;
export const storage = firebaseExports.storage;

// Export default for convenience
export default firebaseExports;
