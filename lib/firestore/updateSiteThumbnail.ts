'use client';
import { db } from '@/lib/firebase';

// Browser-only Firestore functions
let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { doc, updateDoc } = require('firebase/firestore');
  firestoreFunctions = { doc, updateDoc };
}

/**
 * Updates the thumbnail URL for a specific site in Firestore.
 *
 * @param {string} siteId - The ID of the site document to update.
 * @param {string} thumbnailUrl - The new URL for the site's thumbnail.
 * @returns {Promise<boolean>} - True if the update was successful, false otherwise.
 */
export async function updateSiteThumbnail(
  siteId: string,
  thumbnailUrl: string
): Promise<boolean> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return false;
  }

  try {
    const siteRef = firestoreFunctions.doc(db, 'sites', siteId);
    await firestoreFunctions.updateDoc(siteRef, {
      thumbnailUrl: thumbnailUrl,
    });

    return true;
  } catch (error) {
    console.error('Error updating site thumbnail:', error);
    return false;
  }
}
