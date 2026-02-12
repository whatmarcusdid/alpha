'use client';
import { db } from '@/lib/firebase';

// Browser-only Firestore functions
let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { doc, getDoc, updateDoc, collection, serverTimestamp } = require('firebase/firestore');
  firestoreFunctions = { doc, getDoc, updateDoc, collection, serverTimestamp };
}

export interface UserSettings {
  timezone: string;
  timezoneLabel: string;
  emailFrequency: 'real-time' | 'daily' | 'weekly' | 'critical';
}

export const DEFAULT_SETTINGS: UserSettings = {
  timezone: 'America/New_York',
  timezoneLabel: 'Eastern Standard Time (EST)',
  emailFrequency: 'real-time',
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return DEFAULT_SETTINGS;
  }

  try {
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    const userDoc = await firestoreFunctions.getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      const settings = data?.settings || {};

      return {
        timezone: settings.timezone ?? DEFAULT_SETTINGS.timezone,
        timezoneLabel: settings.timezoneLabel ?? DEFAULT_SETTINGS.timezoneLabel,
        emailFrequency: settings.emailFrequency ?? DEFAULT_SETTINGS.emailFrequency,
      };
    }

    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateUserSettings(
  userId: string,
  settings: Partial<UserSettings>
): Promise<boolean> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return false;
  }

  try {
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);

    const updatePayload: { [key: string]: unknown } = {
      'settings.lastUpdated': firestoreFunctions.serverTimestamp(),
    };

    if (settings.timezone !== undefined) {
      updatePayload['settings.timezone'] = settings.timezone;
    }
    if (settings.timezoneLabel !== undefined) {
      updatePayload['settings.timezoneLabel'] = settings.timezoneLabel;
    }
    if (settings.emailFrequency !== undefined) {
      updatePayload['settings.emailFrequency'] = settings.emailFrequency;
    }

    await firestoreFunctions.updateDoc(userRef, updatePayload);

    return true;
  } catch (error) {
    console.error('Error updating user settings:', error);
    return false;
  }
}
