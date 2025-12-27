import { db } from '@/lib/firebase';

export interface Report {
  id: string;
  title: string;
  subtitle: string;
  createdDate: Date;
  updatedDate: Date;
  fileUrl: string;
  type: 'performance' | 'traffic';
}

let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { 
    collection, 
    query, 
    orderBy, 
    getDocs, 
    Timestamp 
  } = require('firebase/firestore');
  
  firestoreFunctions = { 
    collection, 
    query, 
    orderBy, 
    getDocs, 
    Timestamp 
  };
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
    const reportsRef = firestoreFunctions.collection(db, 'users', userId, 'reports');
    const q = firestoreFunctions.query(
      reportsRef, 
      firestoreFunctions.orderBy('createdDate', 'desc')
    );
    
    const snapshot = await firestoreFunctions.getDocs(q);
    
    return snapshot.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        subtitle: data.subtitle,
        createdDate: data.createdDate instanceof firestoreFunctions.Timestamp 
          ? data.createdDate.toDate() 
          : new Date(),
        updatedDate: data.updatedDate instanceof firestoreFunctions.Timestamp 
          ? data.updatedDate.toDate()  // ✅ FIXED: Changed from updatedAt to updatedDate
          : new Date(),
        fileUrl: data.fileUrl,
        type: data.type,
      } as Report;
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}