import { auth } from "./firebase";
import { User } from "firebase/auth";

// Browser-only Firebase Auth functions
let authFunctions: any = {};

if (typeof window !== 'undefined') {
  const {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    signOut: firebaseSignOut,
    onAuthStateChanged,
    OAuthProvider,
  } = require("firebase/auth");

  authFunctions = {
    createUserWithEmailAndPassword,
    updateProfile,
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    firebaseSignOut,
    onAuthStateChanged,
    OAuthProvider,
  };
}

// --- ERROR HANDLING ---
type AuthErrorCode = 
  | "auth/invalid-email"
  | "auth/user-disabled"
  | "auth/user-not-found"
  | "auth/wrong-password"
  | "auth/email-already-in-use"
  | "auth/popup-closed-by-user"
  | "auth/cancelled-popup-request"
  | "auth/account-exists-with-different-credential";

const authErrorMap: Record<AuthErrorCode, string> = {
  "auth/invalid-email": "Invalid email address format.",
  "auth/user-disabled": "This user account has been disabled.",
  "auth/user-not-found": "No user found with this email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/email-already-in-use": "This email is already in use by another account.",
  "auth/popup-closed-by-user": "Sign-in process was cancelled. Please try again.",
  "auth/cancelled-popup-request": "Sign-in process was cancelled. Please try again.",
  "auth/account-exists-with-different-credential": "An account already exists with this email address. Please sign in using the method you originally used."
};

function getFriendlyErrorMessage(error: any): string {
    return authErrorMap[error.code as AuthErrorCode] || "An unexpected error occurred. Please try again.";
}

// --- AUTHENTICATION FUNCTIONS ---

async function signUpWithEmail(email: string, password: string, displayName: string): Promise<User> {
  if (!auth) throw new Error("Firebase Auth is not available.");
  try {
    const userCredential = await authFunctions.createUserWithEmailAndPassword(auth, email, password);
    await authFunctions.updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
}

async function signInWithEmail(email: string, password: string): Promise<User> {
  if (!auth) throw new Error("Firebase Auth is not available.");
  try {
    const userCredential = await authFunctions.signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
}

async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error("Firebase Auth is not available.");
  try {
    const provider = new authFunctions.GoogleAuthProvider();
    const result = await authFunctions.signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
}

async function signInWithApple(): Promise<User> {
  if (!auth) throw new Error("Firebase Auth is not available.");
  try {
    const provider = new authFunctions.OAuthProvider('apple.com');
    const result = await authFunctions.signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw new Error(getFriendlyErrorMessage(error));
  }
}

async function signOut(): Promise<void> {
  if (!auth) throw new Error("Firebase Auth is not available.");
  try {
    await authFunctions.firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
    throw new Error("Failed to sign out.");
  }
}

function onAuthStateChange(callback: (user: User | null) => void) {
  if (!auth) return () => {};
  return authFunctions.onAuthStateChanged(auth, callback);
}

export async function getCurrentUser(): Promise<User | null> {
  if (typeof window === 'undefined') {
    return null;
  }
  return new Promise<User | null>((resolve) => {
    const unsubscribe = onAuthStateChange((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export {
  signUpWithEmail,
  signInWithEmail,
  signInWithGoogle,
  signInWithApple,
  signOut,
  onAuthStateChange,
  getFriendlyErrorMessage,
};
export type { User };
