import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, sendPasswordResetEmail, getRedirectResult, OAuthProvider, signInWithRedirect, signInWithEmailAndPassword, onAuthStateChanged, User, updateEmail, reauthenticateWithCredential, EmailAuthProvider, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { app } from './firebase';

export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error('Google sign-in error:', error);
    throw new Error(error.message || 'Failed to sign in with Google');
  }
}

export async function signInWithApple(): Promise<User> {
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error('Apple sign-in error:', error);
    throw new Error(error.message || 'Failed to sign in with Apple');
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
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
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Optionally update display name if provided
    if (displayName && userCredential.user) {
      await updateProfile(userCredential.user, { displayName });
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
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export async function updateUserEmail(
  newEmail: string,
  currentPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = auth.currentUser;

    if (!user || !user.email) {
      return { success: false, error: 'No user is currently logged in' };
    }

    // Re-authenticate user before sensitive operation
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update email
    await updateEmail(user, newEmail);

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
  try {
    await firebaseSignOut(auth);
    return { success: true };
  } catch (error: any) {
    console.error('Sign-out error:', error);
    return { success: false, error: error.message || 'Failed to sign out' };
  }
}

export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email);
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
  try {
    const result = await getRedirectResult(auth);
    return result?.user || null;
  } catch (error: any) {
    console.error('Redirect result error:', error);
    throw new Error(error.message || 'Failed to handle redirect result');
  }
}
