import { db } from '@/lib/firebase';

let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { doc, getDoc, updateDoc, serverTimestamp } = require('firebase/firestore');
  firestoreFunctions = { doc, getDoc, updateDoc, serverTimestamp };
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  role: string;
  email: string;
  displayName: string;
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    const userRef = firestoreFunctions.doc(db, 'users', userId);
    const userSnap = await firestoreFunctions.getDoc(userRef);

    if (!userSnap.exists()) {
      return null;
    }

    const data = userSnap.data();
    
    return {
      firstName: data.profile?.firstName || '',
      lastName: data.profile?.lastName || '',
      role: data.profile?.role || '',
      email: data.email || '',
      displayName: data.displayName || ''
    };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

export async function updateUserProfile(
  userId: string,
  data: { firstName: string; lastName: string; role: string; email: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    if (typeof window === 'undefined') {
      return { success: false, error: 'This function can only be called in the browser' };
    }

    // Validate inputs
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const role = data.role.trim();

    if (!firstName || !lastName) {
      return { success: false, error: 'First name and last name are required' };
    }

    if (firstName.length > 50 || lastName.length > 50) {
      return { success: false, error: 'Names must be 50 characters or less' };
    }

    const displayName = `${firstName} ${lastName}`;

    const userRef = firestoreFunctions.doc(db, 'users', userId);
    
    await firestoreFunctions.updateDoc(userRef, {
      'profile.firstName': firstName,
      'profile.lastName': lastName,
      'profile.role': role,
      'profile.lastUpdated': firestoreFunctions.serverTimestamp(),
      displayName: displayName,
      email: data.email
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}