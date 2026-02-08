'use client';
import { db } from '@/lib/firebase';

// Browser-only Firestore functions
let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { doc, getDoc, updateDoc, collection } = require('firebase/firestore');
  firestoreFunctions = { doc, getDoc, updateDoc, collection };
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  role: string;
  stripeCustomerId?: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return null;
  }

  try {
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    const docSnap = await firestoreFunctions.getDoc(userRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        fullName: data.fullName || '',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || '',
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return { success: false, error: 'Firestore is not initialized' };
  }

  try {
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    await firestoreFunctions.updateDoc(userRef, updates);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
}
