import { reauthenticateWithCredential, EmailAuthProvider, updatePassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = auth.currentUser;

    if (!user || !user.email) {
      return { success: false, error: 'No user is currently logged in' };
    }

    const credential = EmailAuthProvider.credential(user.email, currentPassword);

    await reauthenticateWithCredential(user, credential);

    await updatePassword(user, newPassword);

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
