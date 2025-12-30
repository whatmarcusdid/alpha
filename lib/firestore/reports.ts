'use client';

import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, Timestamp, doc } from 'firebase/firestore';

export interface Report {
  id: string;
  title: string;
  subtitle: string;
  createdDate: Date;
  updatedDate: Date;
  fileUrl: string;
  type: 'performance' | 'traffic';
}

export async function getReportsForUser(userId: string): Promise<Report[]> {
  if (typeof window === 'undefined') {
    return [];
  }

  if (!db) {
    console.error('Firestore db is not initialized');
    return [];
  }

  try {
    const userDocRef = doc(collection(db, 'users'), userId);
    const reportsRef = collection(userDocRef, 'reports');
    const q = query(reportsRef, orderBy('createdDate', 'desc'));
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        createdDate: data.createdDate instanceof Timestamp 
          ? data.createdDate.toDate() 
          : new Date(),
        updatedDate: data.updatedDate instanceof Timestamp 
          ? data.updatedDate.toDate() 
          : new Date(),
        fileUrl: data.fileUrl || '',
        type: data.type || 'performance',
      } as Report;
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}