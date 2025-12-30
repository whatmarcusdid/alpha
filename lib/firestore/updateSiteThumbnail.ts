
import { db } from '@/lib/firebase';

/**
 * Updates the thumbnail URL for a specific site in Firestore.
 * This function is designed to run only in the browser.
 *
 * @param {string} siteId - The ID of the site document to update.
 * @param {string} thumbnailUrl - The new URL for the site's thumbnail.
 * @returns {Promise<boolean>} - True if the update was successful, false otherwise.
 */
export async function updateSiteThumbnail(
  siteId: string,
  thumbnailUrl: string
): Promise<boolean> {
  // Guard: This function should only run in the browser environment.
  if (typeof window === 'undefined') {
    return false;
  }

  // Guard: Ensure Firestore is initialized.
  if (!db) {
    console.error('Firestore db is not initialized');
    return false;
  }

  try {
    // Dynamically require Firestore functions for browser-only usage.
    const { doc, updateDoc, collection } = require('firebase/firestore');

    // Get a reference to the specific site document.
    const siteRef = doc(collection(db, 'sites'), siteId);

    // Update the 'thumbnailUrl' field of the document.
    await updateDoc(siteRef, {
      thumbnailUrl: thumbnailUrl,
    });

    return true;
  } catch (error) {
    console.error('Error updating site thumbnail:', error);
    return false;
  }
}
