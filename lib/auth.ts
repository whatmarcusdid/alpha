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
    updateEmail: firebaseAuth.updateEmail,
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
  currentPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Auth functions only work in browser' };
  }

  try {
    const user = auth?.currentUser;

    if (!user || !user.email) {
      return { success: false, error: 'No user is currently logged in' };
    }

    // Re-authenticate user before sensitive operation
    const credential = authFunctions.EmailAuthProvider.credential(user.email, currentPassword);
    await authFunctions.reauthenticateWithCredential(user, credential);

    // Update email
    await authFunctions.updateEmail(user, newEmail);

    return { success: true };
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

  try {
    await authFunctions.sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error: any) {
    console.error('Password reset error:', error);
    
    if (error.code === 'auth/user-not-found') {
      return { success: false, error: 'No account found with this email address' };
    } else if (error.code === 'auth/invalid-email') {
      return { success: false, error: 'Invalid email address' };
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
