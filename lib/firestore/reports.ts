'use client';

import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp, doc } from 'firebase/firestore';

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
  if (typeof window === 'undefined') {
    return [];
  }

  if (!db) {
    console.error('Firestore db is not initialized');
    return [];
  }

  try {
    const reportsRef = collection(db, 'users', userId, 'reports');
    const q = query(reportsRef, orderBy('createdDate', 'desc'));
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        createdDate: (data.createdDate as Timestamp).toDate().toISOString(),
        updatedDate: (data.updatedDate as Timestamp).toDate().toISOString(),
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
  if (typeof window === 'undefined') {
    return [];
  }

  if (!db) {
    console.error('Firestore db is not initialized');
    return [];
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reportsRef = collection(db, 'users', userId, 'reports');
    const q = query(
      reportsRef,
      where('createdDate', '>=', thirtyDaysAgo),
      orderBy('createdDate', 'desc'),
      limit(3)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        title: data.title || '',
        subtitle: data.subtitle || '',
        createdDate: (data.createdDate as Timestamp).toDate().toISOString(),
        updatedDate: (data.updatedDate as Timestamp).toDate().toISOString(),
        fileUrl: data.fileUrl || '',
        type: data.type || 'performance',
      } as Report;
    });
  } catch (error) {
    console.error('Error fetching recent reports:', error);
    return [];
  }
}
