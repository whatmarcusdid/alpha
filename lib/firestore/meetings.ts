'use client';
import { db } from '@/lib/firebase';

// Browser-only Firestore functions
let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const {
    doc,
    updateDoc,
    getDoc,
    arrayUnion,
    arrayRemove,
  } = require('firebase/firestore');
  firestoreFunctions = {
    doc,
    updateDoc,
    getDoc,
    arrayUnion,
    arrayRemove,
  };
}

import { Meeting } from '@/types/user';
import { UserProfile, getUserProfile } from './profile';

const generateMeetingId = () => `meeting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getUserDocRef = (userId: string) => {
    if (typeof window === 'undefined') {
        const { getFirestore } = require('firebase-admin/firestore');
        const adminDb = getFirestore();
        return adminDb.collection('users').doc(userId);
    }
    // Check if db is initialized (browser-only pattern)
    if (!db) {
        throw new Error('Firestore is not initialized');
    }
    return firestoreFunctions.doc(db, 'users', userId);
};

export async function addMeeting(
  userId: string,
  meetingData: Omit<Meeting, 'id'>
): Promise<{ success: boolean; meetingId?: string; error?: string }> {
  if (!db) {
    return { success: false, error: 'Firestore is not initialized' };
  }

  try {
    const meetingId = generateMeetingId();
    const newMeeting: Meeting = {
      ...meetingData,
      id: meetingId,
    };

    await firestoreFunctions.updateDoc(getUserDocRef(userId), {
      upcomingMeetings: firestoreFunctions.arrayUnion(newMeeting),
    });

    return { success: true, meetingId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getMeetings(
  userId: string
): Promise<{ meetings?: Meeting[]; error?: string }> {
  if (!db) {
    return { error: 'Firestore is not initialized' };
  }

  try {
    const userDoc = await firestoreFunctions.getDoc(getUserDocRef(userId));
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserProfile;
      return { meetings: (userData as any).upcomingMeetings || [] };
    }
    return { meetings: [] };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateMeeting(
  userId: string,
  meetingId: string,
  updates: Partial<Meeting>
): Promise<{ success: boolean; error?: string }> {
    if (!db) {
        return { success: false, error: 'Firestore is not initialized' };
    }

    try {
        const userDoc = await firestoreFunctions.getDoc(getUserDocRef(userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const meetings = (userData as any).upcomingMeetings || [];
            const meetingIndex = meetings.findIndex((m: Meeting) => m.id === meetingId);

            if (meetingIndex > -1) {
                const updatedMeeting = { ...meetings[meetingIndex], ...updates };
                const updatedMeetings = [...meetings];
                updatedMeetings[meetingIndex] = updatedMeeting;

                await firestoreFunctions.updateDoc(getUserDocRef(userId), { upcomingMeetings: updatedMeetings });
                return { success: true };
            } else {
                return { success: false, error: 'Meeting not found' };
            }
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function cancelMeeting(
  userId: string,
  meetingId: string
): Promise<{ success: boolean; error?: string }> {
  return updateMeeting(userId, meetingId, { status: 'cancelled' });
}

export async function completeMeeting(
  userId: string,
  meetingId: string
): Promise<{ success: boolean; error?: string }> {
  return updateMeeting(userId, meetingId, { status: 'completed' });
}

export async function deletePastMeetings(
  userId: string
): Promise<{ success: boolean; error?: string }> {
    if (!db) {
        return { success: false, error: 'Firestore is not initialized' };
    }

    try {
        const userDoc = await firestoreFunctions.getDoc(getUserDocRef(userId));
        if (userDoc.exists()) {
            const userData = userDoc.data();
            const meetings = (userData as any).upcomingMeetings || [];
            const now = new Date();
            const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));

            const meetingsToKeep = meetings.filter((m: Meeting) => {
                const meetingDate = (m.date as any).toDate();
                return !((m.status === 'completed' || m.status === 'cancelled') && meetingDate < thirtyDaysAgo);
            });

            await firestoreFunctions.updateDoc(getUserDocRef(userId), { upcomingMeetings: meetingsToKeep });
            return { success: true };
        } else {
            return { success: false, error: 'User not found' };
        }
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
