/**
 * Password Management Functions
 * 
 * CRITICAL: This file follows the browser-only initialization pattern.
 * - All Firebase Auth functions wrapped in typeof window !== 'undefined' checks
 * - Uses require() pattern instead of ES6 imports
 * - Firebase Auth only runs in the browser, never on the server
 */

import { auth } from '@/lib/firebase';

// Load Firebase Auth functions only in browser
let authFunctions: any = {};

if (typeof window !== 'undefined') {
  const firebaseAuth = require('firebase/auth');
  authFunctions = {
    reauthenticateWithCredential: firebaseAuth.reauthenticateWithCredential,
    EmailAuthProvider: firebaseAuth.EmailAuthProvider,
    updatePassword: firebaseAuth.updatePassword,
  };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Auth functions only work in browser' };
  }

  try {
    // Check if auth is initialized (browser-only pattern)
    if (!auth) {
      return { success: false, error: 'Authentication is not initialized' };
    }

    const user = auth.currentUser;

    if (!user || !user.email) {
      return { success: false, error: 'No user is currently logged in' };
    }

    const credential = authFunctions.EmailAuthProvider.credential(user.email, currentPassword);

    await authFunctions.reauthenticateWithCredential(user, credential);

    await authFunctions.updatePassword(user, newPassword);

    return { success: true };
  } catch (error: any) {
    console.error('Password change error:', error);
    
    if (error.code === 'auth/wrong-password') {
      return { success: false, error: 'Current password is incorrect' };
    } else if (error.code === 'auth/weak-password') {
      return { success: false, error: 'New password is too weak. Please use at least 6 characters' };
    } else if (error.code === 'auth/requires-recent-login') {
      return { success: false, error: 'Please log out and log back in before changing your password' };
    } else if (error.code === 'auth/invalid-credential') {
      return { success: false, error: 'Current password is incorrect' };
    }
    
    return { success: false, error: error.message || 'Failed to change password' };
  }
}
