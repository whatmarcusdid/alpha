'use client';
import { db } from '@/lib/firebase';

// Browser-only Firestore functions
let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs, 
    Timestamp 
  } = require('firebase/firestore');
  
  firestoreFunctions = { 
    collection, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs, 
    Timestamp 
  };
}

export interface Report {
  id: string;
  title: string;
  subtitle: string;
  createdDate: string; // Serialized as ISO string
  updatedDate: string; // Serialized as ISO string
  fileUrl: string;
  type: 'performance' | 'traffic';
}

/**
 * Fetches all reports for a given user, ordered by creation date.
 * @param userId - The ID of the user to fetch reports for.
 * @returns A promise that resolves to an array of Report objects.
 */
export async function getReportsForUser(userId: string): Promise<Report[]> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return [];
  }

  try {
    const reportsRef = firestoreFunctions.collection(db, 'users', userId, 'reports');
    const q = firestoreFunctions.query(reportsRef, firestoreFunctions.orderBy('createdDate', 'desc'));
    
    const snapshot = await firestoreFunctions.getDocs(q);
    
    return snapshot.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        createdDate: (data.createdDate as any).toDate().toISOString(),
        updatedDate: (data.updatedDate as any).toDate().toISOString(),
        fileUrl: data.fileUrl || '',
        type: data.type || 'performance',
      } as Report;
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}

/**
 * Fetches the 3 most recent reports for a user created within the last 30 days.
 * @param userId - The ID of the user to fetch recent reports for.
 * @returns A promise that resolves to an array of up to 3 Report objects.
 */
export async function getRecentReportsForUser(userId: string): Promise<Report[]> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return [];
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoTimestamp = firestoreFunctions.Timestamp.fromDate(thirtyDaysAgo);

    const reportsRef = firestoreFunctions.collection(db, 'users', userId, 'reports');
    const q = firestoreFunctions.query(
      reportsRef,
      firestoreFunctions.where('createdDate', '>=', thirtyDaysAgoTimestamp),
      firestoreFunctions.orderBy('createdDate', 'desc'),
      firestoreFunctions.limit(3)
    );

    const snapshot = await firestoreFunctions.getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        createdDate: (data.createdDate as any).toDate().toISOString(),
        updatedDate: (data.updatedDate as any).toDate().toISOString(),
        fileUrl: data.fileUrl || '',
        type: data.type || 'performance',
      } as Report;
    });
  } catch (error) {
    console.error('Error fetching recent reports:', error);
    return [];
  }
}
