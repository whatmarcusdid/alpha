import { auth } from '@/lib/firebase';

let authFunctions: any = {};

if (typeof window !== 'undefined') {
  const { updatePassword, EmailAuthProvider, reauthenticateWithCredential } = require('firebase/auth');
  authFunctions = { updatePassword, EmailAuthProvider, reauthenticateWithCredential };
}

function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  return { valid: true };
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined') {
      return { success: false, error: 'This function can only be called in the browser' };
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      return { success: false, error: 'No user is currently logged in' };
    }

    // Validate new password
    const validation = validatePassword(newPassword);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Re-authenticate user with current password
    const credential = authFunctions.EmailAuthProvider.credential(
      user.email,
      currentPassword
    );

    await authFunctions.reauthenticateWithCredential(user, credential);

    // Update password
    await authFunctions.updatePassword(user, newPassword);

    return { success: true };
  } catch (error: any) {
    console.error('Error changing password:', error);
    
    if (error.code === 'auth/wrong-password') {
      return { success: false, error: 'Current password is incorrect' };
    }
    if (error.code === 'auth/weak-password') {
      return { success: false, error: 'Password is too weak' };
    }
    if (error.code === 'auth/requires-recent-login') {
      return { success: false, error: 'Please log out and log back in, then try again' };
    }
    
    return { success: false, error: error.message || 'Failed to change password' };
  }
}