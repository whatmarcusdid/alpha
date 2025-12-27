import { db } from '@/lib/firebase';
import { Site } from '@/types';

let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { 
    collection, 
    query, 
    where, 
    getDocs, 
    Timestamp 
  } = require('firebase/firestore');
  
  firestoreFunctions = { 
    collection, 
    query, 
    where, 
    getDocs, 
    Timestamp 
  };
}

export async function getSitesForUser(userId: string): Promise<Site[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  if (!db) {
    console.error('Firestore db is not initialized');
    return [];
  }

  try {
    const sitesRef = firestoreFunctions.collection(db, 'sites');
    const q = firestoreFunctions.query(
      sitesRef, 
      firestoreFunctions.where('userId', '==', userId)
    );
    
    const snapshot = await firestoreFunctions.getDocs(q);
    
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        name: data.name,
        url: data.url,
        type: data.type,
        status: data.status,
        thumbnailUrl: data.thumbnailUrl,
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