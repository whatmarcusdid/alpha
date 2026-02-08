/**
 * Advanced Password Reset Debugging Utilities
 * 
 * Use these functions to diagnose password reset email delivery issues.
 * These provide more detailed logging and alternative configuration options.
 */

import { auth } from '@/lib/firebase';

// Load Firebase Auth functions only in browser
let authFunctions: any = {};

if (typeof window !== 'undefined') {
  const firebaseAuth = require('firebase/auth');
  authFunctions = {
    sendPasswordResetEmail: firebaseAuth.sendPasswordResetEmail,
  };
}

/**
 * Send password reset with explicit production domain settings
 * Use this if the standard function returns 200 but emails don't arrive
 */
export async function sendPasswordResetWithExplicitDomain(
  email: string,
  productionDomain: string = 'https://my.tradesitegenie.com'
): Promise<{ success: boolean; error?: string; diagnostics?: any }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Auth functions only work in browser' };
  }

  console.group('🧪 ADVANCED PASSWORD RESET DEBUG');
  console.log('📧 Email:', email);
  console.log('🌐 Forcing production domain:', productionDomain);
  console.log('🔥 Current environment:');
  console.log('   - Window origin:', window.location.origin);
  console.log('   - Hostname:', window.location.hostname);
  console.log('   - Protocol:', window.location.protocol);

  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    email,
    domain: productionDomain,
    environment: {
      origin: window.location.origin,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
    },
    authInitialized: !!auth,
    functionsAvailable: !!authFunctions.sendPasswordResetEmail,
  };

  if (!authFunctions.sendPasswordResetEmail) {
    console.error('❌ Firebase Auth not initialized');
    console.groupEnd();
    return {
      success: false,
      error: 'Firebase Auth not initialized',
      diagnostics,
    };
  }

  try {
    // Use explicit production domain
    const actionCodeSettings = {
      url: `${productionDomain}/signin`,
      handleCodeInApp: false,
    };

    console.log('⚙️  Action code settings:', actionCodeSettings);
    console.log('📤 Calling Firebase sendPasswordResetEmail...');

    const startTime = Date.now();
    await authFunctions.sendPasswordResetEmail(auth, email, actionCodeSettings);
    const endTime = Date.now();

    diagnostics.apiCallDuration = `${endTime - startTime}ms`;
    diagnostics.success = true;

    console.log('✅ Firebase API succeeded');
    console.log('⏱️  API call duration:', diagnostics.apiCallDuration);
    console.log('');
    console.log('🔍 NEXT STEPS:');
    console.log('1. Wait 1-2 minutes for email delivery');
    console.log('2. Check inbox AND spam folder for:', email);
    console.log('3. If no email after 5 minutes:');
    console.log('   → Open Firebase Console');
    console.log('   → Go to Authentication → Usage');
    console.log('   → Check if email quota exceeded');
    console.log('   → Review "Authentication activity" log');
    console.log('');
    console.log('📧 Expected sender: noreply@[firebase-project].firebaseapp.com');
    console.log('📧 Expected subject: Reset your password for [App Name]');
    console.groupEnd();

    return { success: true, diagnostics };
  } catch (error: any) {
    diagnostics.success = false;
    diagnostics.error = {
      code: error.code,
      message: error.message,
      fullError: error,
    };

    console.error('❌ Firebase API call failed:');
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.error('   Full error:', error);
    console.groupEnd();

    let userMessage = 'Failed to send reset email';

    if (error.code === 'auth/user-not-found') {
      userMessage = 'No account found with this email address';
    } else if (error.code === 'auth/invalid-email') {
      userMessage = 'Invalid email address';
    } else if (error.code === 'auth/too-many-requests') {
      userMessage = 'Too many attempts. Please wait before trying again.';
    } else if (error.code === 'auth/network-request-failed') {
      userMessage = 'Network error. Please check your connection.';
    } else if (error.code === 'auth/invalid-continue-uri') {
      userMessage = 'Invalid continue URL configuration';
    }

    return {
      success: false,
      error: userMessage,
      diagnostics,
    };
  }
}

/**
 * Check Firebase Auth configuration and quota
 */
export function checkFirebaseAuthConfig(): void {
  console.group('🔍 Firebase Auth Configuration Check');
  console.log('🔥 Auth instance:', auth);
  console.log('🔥 Auth initialized:', !!auth);
  
  if (auth) {
    console.log('📧 Current user:', auth.currentUser?.email || 'None');
    console.log('🌐 App name:', auth.app.name);
    console.log('🌐 Project ID:', auth.app.options.projectId);
    console.log('🌐 Auth domain:', auth.app.options.authDomain);
  }
  
  console.log('');
  console.log('📋 CONFIGURATION CHECKLIST:');
  console.log('1. Firebase Console → Authentication → Settings');
  console.log('2. Verify "Authorized domains" includes:', window.location.hostname);
  console.log('3. Check "Email enumeration protection" setting');
  console.log('4. Review email template customization');
  console.log('5. Verify sender email configuration');
  console.log('');
  console.log('📊 QUOTA INFORMATION:');
  console.log('• Free tier: 100 emails/day');
  console.log('• Check usage: Firebase Console → Authentication → Usage');
  console.log('• Reset daily at midnight UTC');
  console.groupEnd();
}

/**
 * Test email delivery by attempting to send to a test address
 */
export async function testEmailDelivery(
  testEmail: string
): Promise<{ success: boolean; message: string }> {
  console.group('🧪 Email Delivery Test');
  console.log('📧 Test email:', testEmail);
  
  if (!testEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
    console.error('❌ Invalid email format');
    console.groupEnd();
    return { success: false, message: 'Invalid email format' };
  }
  
  console.log('⏳ Attempting to send test password reset email...');
  
  const result = await sendPasswordResetWithExplicitDomain(testEmail);
  
  if (result.success) {
    console.log('✅ Test email request succeeded');
    console.log('📨 Check', testEmail, 'inbox in 1-2 minutes');
    console.groupEnd();
    return {
      success: true,
      message: `Test email sent to ${testEmail}. Check inbox and spam folder.`,
    };
  } else {
    console.error('❌ Test email request failed:', result.error);
    console.groupEnd();
    return {
      success: false,
      message: result.error || 'Test email failed',
    };
  }
}
