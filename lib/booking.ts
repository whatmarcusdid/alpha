'use server';

import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function saveBookingIntake(formData: any) {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const docRef = await addDoc(collection(db, 'bookingIntakes'), {
      ...formData,
      createdAt: serverTimestamp(),
      status: 'intake-complete',
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding document: ', error);
    throw new Error('Could not save booking intake.');
  }
}

export async function updateBookingIntake(id: string, data: any) {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  try {
    const docRef = doc(collection(db, 'bookingIntakes'), id);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error('Error updating document: ', error);
    throw new Error('Could not update booking intake.');
  }
}

export async function getBookingIntake(id: string) {
  if (!db) {
    throw new Error('Firestore is not initialized');
  }

  const docRef = doc(collection(db, 'bookingIntakes'), id);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}
