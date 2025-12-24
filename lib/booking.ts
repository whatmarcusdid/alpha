'use server'

import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from './firebase'

export async function saveBookingIntake(formData: any) {
  try {
    const docRef = await addDoc(collection(db, 'bookingIntakes'), {
      ...formData,
      createdAt: serverTimestamp(),
      status: 'intake-complete',
    })
    return docRef.id
  } catch (error) {
    console.error('Error adding document: ', error)
    throw new Error('Could not save booking intake.')
  }
}

export async function updateBookingIntake(id: string, data: any) {
  try {
    const docRef = doc(db, 'bookingIntakes', id)
    await updateDoc(docRef, data)
  } catch (error) {
    console.error('Error updating document: ', error)
    throw new Error('Could not update booking intake.')
  }
}
