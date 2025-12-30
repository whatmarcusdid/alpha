'use client';

import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Site } from '@/types';

export async function getSitesForUser(userId: string): Promise<Site[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  if (!db) {
    console.error('Firestore db is not initialized');
    return [];
  }

  try {
    const sitesRef = collection(db, 'sites');
    const q = query(sitesRef, where('userId', '==', userId));
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        userId: data.userId || '',
        name: data.name || '',
        url: data.url || '',
        type: data.type || 'wordpress',
        status: data.status || 'active',
        thumbnailUrl: data.thumbnailUrl || '',
        createdAt: data.createdAt instanceof Timestamp 
          ? data.createdAt.toDate() 
          : new Date(),
        updatedAt: data.updatedAt instanceof Timestamp 
          ? data.updatedAt.toDate() 
          : new Date(),
      } as Site;
    });
  } catch (error) {
    console.error('Error fetching sites:', error);
    return [];
  }
}
