'use client';
import { db } from '@/lib/firebase';

// Browser-only Firestore functions
let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { collection, query, where, getDocs, Timestamp } = require('firebase/firestore');
  firestoreFunctions = { collection, query, where, getDocs, Timestamp };
}

import { Site } from '@/types';

export async function getSitesForUser(userId: string): Promise<Site[]> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return [];
  }

  try {
    console.log('🔍 Fetching sites for userId:', userId);
    const sitesRef = firestoreFunctions.collection(db, 'sites');
    const q = firestoreFunctions.query(sitesRef, firestoreFunctions.where('userId', '==', userId));
    
    const snapshot = await firestoreFunctions.getDocs(q);
    console.log('📊 Found', snapshot.docs.length, 'sites');
    
    return snapshot.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId || '',
        name: data.name || '',
        url: data.url || '',
        type: data.type || 'wordpress',
        status: data.status || 'active',
        thumbnailUrl: data.thumbnailUrl || '',
        createdAt: data.createdAt instanceof firestoreFunctions.Timestamp 
          ? data.createdAt.toDate() 
          : new Date(),
        updatedAt: data.updatedAt instanceof firestoreFunctions.Timestamp 
          ? data.updatedAt.toDate() 
          : new Date(),
      } as Site;
    });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return [];
  }
}
