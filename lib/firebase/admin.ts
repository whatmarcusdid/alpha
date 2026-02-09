/**
 * Firebase Admin Configuration
 * 
 * SAFETY GUARDS:
 * - Checks for build-time context and skips initialization
 * - Validates environment variables before attempting initialization
 * - Wraps initialization in try-catch for graceful failure
 * - Exports null-safe values that can be checked at runtime
 * 
 * This pattern prevents Firebase Admin from causing build failures on Vercel
 * while maintaining full functionality in production.
 */

import * as admin from 'firebase-admin';

let adminDb: admin.firestore.Firestore | null = null;
let adminAuth: admin.auth.Auth | null = null;

// Check if we're in a build context (Vercel builds, CI/CD, etc.)
// During builds, environment variables may not be available or may cause initialization issues
const isBuildTime = 
  process.env.NEXT_PHASE === 'phase-production-build' ||
  process.env.NEXT_PHASE === 'phase-export' ||
  process.env.CI === 'true' && !process.env.VERCEL_ENV;

if (isBuildTime) {
  console.log('🔨 Build-time detected - skipping Firebase Admin initialization');
  console.log('Firebase Admin will be initialized at runtime when environment variables are available');
} else {
  // Validate that all required environment variables exist
  const hasProjectId = !!process.env.FIREBASE_PROJECT_ID;
  const hasClientEmail = !!process.env.FIREBASE_CLIENT_EMAIL;
  const hasPrivateKey = !!process.env.FIREBASE_PRIVATE_KEY;
  const hasAllEnvVars = hasProjectId && hasClientEmail && hasPrivateKey;

  if (!hasAllEnvVars) {
    console.warn('⚠️ Firebase Admin not initialized - missing required environment variables:');
    if (!hasProjectId) console.warn('  ✗ FIREBASE_PROJECT_ID');
    if (!hasClientEmail) console.warn('  ✗ FIREBASE_CLIENT_EMAIL');
    if (!hasPrivateKey) console.warn('  ✗ FIREBASE_PRIVATE_KEY');
    console.warn('Add these to your .env.local file or deployment environment variables');
  } else {
    try {
      // Store environment variables in local variables for TypeScript null safety
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      // Singleton pattern - only initialize once
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: projectId!,
            clientEmail: clientEmail!,
            // Convert escaped newlines (\n) to actual newlines
            privateKey: privateKey!.replace(/\\n/g, '\n'),
          }),
        });
        
        console.log('✅ Firebase Admin initialized successfully');
        console.log('🔥 Firebase Admin Config:', {
          projectId,
          clientEmail: clientEmail?.substring(0, 30) + '...',
        });
      }

      // Initialize Firestore and Auth services
      adminDb = admin.firestore();
      adminAuth = admin.auth();
      
      console.log('✅ Firebase Admin services ready (Firestore, Auth)');
    } catch (error) {
      console.error('❌ Firebase Admin initialization failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        name: error instanceof Error ? error.name : 'Unknown',
      });
      console.error('Firebase Admin will not be available. Check your environment variables.');
      
      // Ensure exports remain null on failure
      adminDb = null;
      adminAuth = null;
    }
  }
}

// Export Firebase Admin instances (will be null if not initialized or on build-time)
export { adminDb, adminAuth };
