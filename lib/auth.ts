/**
 * Firebase Auth Helper Functions
 * 
 * CRITICAL: This file follows the browser-only initialization pattern.
 * - All Firebase Auth functions wrapped in typeof window !== 'undefined' checks
 * - Uses require() pattern instead of ES6 imports
 * - Firebase Auth only runs in the browser, never on the server
 */

import type { User } from 'firebase/auth';
import { auth } from './firebase'; // Browser-safe auth instance

// Load Firebase Auth functions only in browser
let authFunctions: any = {};

if (typeof window !== 'undefined') {
  const firebaseAuth = require('firebase/auth');
  authFunctions = {
    signInWithEmailAndPassword: firebaseAuth.signInWithEmailAndPassword,
    signInWithPopup: firebaseAuth.signInWithPopup,
    signOut: firebaseAuth.signOut,
    sendPasswordResetEmail: firebaseAuth.sendPasswordResetEmail,
    getRedirectResult: firebaseAuth.getRedirectResult,
    onAuthStateChanged: firebaseAuth.onAuthStateChanged,
    verifyBeforeUpdateEmail: firebaseAuth.verifyBeforeUpdateEmail,
    reauthenticateWithCredential: firebaseAuth.reauthenticateWithCredential,
    createUserWithEmailAndPassword: firebaseAuth.createUserWithEmailAndPassword,
    updateProfile: firebaseAuth.updateProfile,
    GoogleAuthProvider: firebaseAuth.GoogleAuthProvider,
    OAuthProvider: firebaseAuth.OAuthProvider,
    EmailAuthProvider: firebaseAuth.EmailAuthProvider,
  };
}

export async function signInWithGoogle(): Promise<User> {
  if (typeof window === 'undefined') {
    throw new Error('Auth functions only work in browser');
  }

  try {
    const provider = new authFunctions.GoogleAuthProvider();
    const result = await authFunctions.signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw new Error(error.message || 'Failed to sign in with Google');
  }
}

export async function signInWithApple(): Promise<User> {
  if (typeof window === 'undefined') {
    throw new Error('Auth functions only work in browser');
  }

  const provider = new authFunctions.OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  
  try {
    const result = await authFunctions.signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Apple sign-in error:', error);
    throw new Error(error.message || 'Failed to sign in with Apple');
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  if (typeof window === 'undefined') {
    throw new Error('Auth functions only work in browser');
  }

  try {
    const userCredential = await authFunctions.signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    console.error('Email sign-in error:', error);
    
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      throw new Error('Invalid email or password');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/user-disabled') {
      throw new Error('This account has been disabled');
    }
    
    throw new Error(error.message || 'Failed to sign in');
  }
}

export async function signUpWithEmail(
  email: string, 
  password: string,
  displayName?: string
): Promise<User> {
  if (typeof window === 'undefined') {
    throw new Error('Auth functions only work in browser');
  }

  try {
    const userCredential = await authFunctions.createUserWithEmailAndPassword(auth, email, password);
    
    // Optionally update display name if provided
    if (displayName && userCredential.user) {
      await authFunctions.updateProfile(userCredential.user, { displayName });
    }
    
    return userCredential.user;
  } catch (error: any) {
    console.error('Sign-up error:', error);
    
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('An account with this email already exists');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters');
    } else if (error.code === 'auth/operation-not-allowed') {
      throw new Error('Email/password accounts are not enabled');
    }
    
    throw new Error(error.message || 'Failed to create account');
  }
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  if (typeof window === 'undefined') {
    throw new Error('Auth functions only work in browser');
  }

  return authFunctions.onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return auth?.currentUser || null;
}

export async function updateUserEmail(
  newEmail: string,
  currentPassword?: string
): Promise<{ success: boolean; error?: string; requiresVerification?: boolean }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Auth functions only work in browser' };
  }

  try {
    const user = auth?.currentUser;

    if (!user || !user.email) {
      return { success: false, error: 'No user is currently logged in' };
    }

    // Check if user has email/password provider
    const hasPasswordProvider = user.providerData.some(
      provider => provider.providerId === 'password'
    );

    // Re-authenticate if user has password authentication
    if (hasPasswordProvider) {
      if (!currentPassword) {
        return { success: false, error: 'Password required to change email' };
      }
      
      const credential = authFunctions.EmailAuthProvider.credential(user.email, currentPassword);
      await authFunctions.reauthenticateWithCredential(user, credential);
    }

    // Send verification email to new address (user must click link to complete update)
    const actionCodeSettings = {
      url: `${window.location.origin}/dashboard/profile`,
      handleCodeInApp: false,
    };
    
    await authFunctions.verifyBeforeUpdateEmail(user, newEmail, actionCodeSettings);

    return { 
      success: true, 
      requiresVerification: true 
    };
  } catch (error: any) {
    console.error('Email update error:', error);
    
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      return { success: false, error: 'Incorrect password' };
    } else if (error.code === 'auth/email-already-in-use') {
      return { success: false, error: 'This email is already in use' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, error: 'Invalid email address' };
    } else if (error.code === 'auth/requires-recent-login') {
      return { success: false, error: 'Please log out and log back in before changing your email' };
    }
    
    return { success: false, error: error.message || 'Failed to update email' };
  }
}

export async function signOut(): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Auth functions only work in browser' };
  }

  try {
    await authFunctions.signOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return { success: false, error: error.message || 'Failed to sign out' };
  }
}

export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Auth functions only work in browser' };
  }

  console.group('🔐 Password Reset Debug');
  console.log('📧 Email:', email);
  console.log('🔥 Auth initialized:', !!auth);
  console.log('🔥 Auth functions available:', !!authFunctions.sendPasswordResetEmail);
  console.log('🌍 Current domain:', window.location.hostname);
  console.log('🌐 Full origin:', window.location.origin);

  if (!authFunctions.sendPasswordResetEmail) {
    console.error('❌ Firebase Auth not initialized');
    console.groupEnd();
    return { success: false, error: 'Firebase Auth not initialized' };
  }

  try {
    console.log('📤 Calling Firebase sendPasswordResetEmail...');
    
    // Add actionCodeSettings to ensure correct domain handling
    const actionCodeSettings = {
      url: `${window.location.origin}/signin`,
      handleCodeInApp: false,
    };
    
    console.log('⚙️ Action code settings:', actionCodeSettings);
    
    await authFunctions.sendPasswordResetEmail(auth, email, actionCodeSettings);
    
    console.log('✅ Firebase API call succeeded (HTTP 200)');
    console.log('📨 Email should be queued for:', email);
    console.log('');
    console.log('⚠️  IMPORTANT: 200 status does NOT guarantee email delivery!');
    console.log('');
    console.log('📋 VERIFICATION CHECKLIST:');
    console.log('1. Check Firebase Console → Authentication → Usage tab');
    console.log('2. Look for "Authentication activity" spike at current time');
    console.log('3. Verify email quota (should show X/100 daily emails used)');
    console.log('4. Check email inbox AND spam folder');
    console.log('5. Verify Firebase email templates are configured');
    console.log('6. Check authorized domains in Firebase Console');
    console.log('');
    console.log('📧 Email provider details:');
    console.log('   From: noreply@[project-id].firebaseapp.com');
    console.log('   Template: Password reset');
    console.log('   Action URL:', actionCodeSettings.url);
    console.groupEnd();
    
    return { success: true };
  } catch (error: any) {
    console.error('❌ Firebase sendPasswordResetEmail failed:');
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);
    console.error('   Full error:', error);
    console.groupEnd();
    
    if (error.code === 'auth/user-not-found') {
      return { success: false, error: 'No account found with this email address' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, error: 'Invalid email address' };
    } else if (error.code === 'auth/too-many-requests') {
      return { success: false, error: 'Too many attempts. Please wait before trying again.' };
    }
    
    return { success: false, error: error.message || 'Failed to send reset email' };
  }
}

export async function handleRedirectResult() {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const result = await authFunctions.getRedirectResult(auth);
    return result?.user || null;
  } catch (error: any) {
    console.error('Redirect result error:', error);
    throw new Error(error.message || 'Failed to handle redirect result');
  }
}
