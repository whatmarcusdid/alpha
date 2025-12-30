'use client';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  role: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!db) {
    console.error('Firestore db is not initialized');
    return null;
  }

  try {
    const userRef = doc(collection(db, 'users'), userId);
    const docSnap = await getDoc(userRef);

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
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not in browser environment' };
  }

  if (!db) {
    return { success: false, error: 'Firestore db is not initialized' };
  }

  try {
    const userRef = doc(collection(db, 'users'), userId);
    await updateDoc(userRef, updates);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message };
  }
}
