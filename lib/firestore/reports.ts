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
 * Handles reports created by both the Reports system and Delivery Scout API.
 * 
 * @param userId - The ID of the user to fetch reports for.
 * @returns A promise that resolves to an array of Report objects.
 */
export async function getReportsForUser(userId: string): Promise<Report[]> {
  if (typeof window === 'undefined' || !db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return [];
  }

  try {
    const reportsRef = firestoreFunctions.collection(db, 'users', userId, 'reports');
    
    // Don't order by field name since documents may have different field names
    // (Delivery Scout uses createdAt/lastUpdated, Reports system uses createdDate/updatedDate)
    const snapshot = await firestoreFunctions.getDocs(reportsRef);
    
    const reports = snapshot.docs.map((docSnap: any) => {
      const data = docSnap.data();
      
      // Handle both field name patterns
      const createdTimestamp = data.createdDate || data.createdAt;
      const updatedTimestamp = data.updatedDate || data.lastUpdated;
      
      return {
        id: docSnap.id,
        title: data.title || '',
        subtitle: data.subtitle || data.summary || '',
        createdDate: createdTimestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedDate: updatedTimestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
        fileUrl: data.fileUrl || '',
        type: data.type || 'performance',
      } as Report;
    });
    
    // Sort client-side by createdDate descending
    return reports.sort((a: Report, b: Report) => 
      new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    );
  } catch (error) {
    console.error('Error fetching reports:', error);
    return [];
  }
}

/**
 * Fetches the 3 most recent reports for a user created within the last 30 days.
 * Handles reports created by both the Reports system and Delivery Scout API.
 * 
 * @param userId - The ID of the user to fetch recent reports for.
 * @returns A promise that resolves to an array of up to 3 Report objects.
 */
export async function getRecentReportsForUser(userId: string): Promise<Report[]> {
  if (typeof window === 'undefined' || !db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return [];
  }

  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const reportsRef = firestoreFunctions.collection(db, 'users', userId, 'reports');
    
    // Fetch all reports and filter/sort client-side to handle mixed field names
    const snapshot = await firestoreFunctions.getDocs(reportsRef);

    if (snapshot.empty) {
      return [];
    }

    interface ReportWithDate extends Report {
      _createdDateObj: Date;
    }

    const reports: ReportWithDate[] = snapshot.docs
      .map((docSnap: any) => {
        const data = docSnap.data();
        
        // Handle both field name patterns
        const createdTimestamp = data.createdDate || data.createdAt;
        const updatedTimestamp = data.updatedDate || data.lastUpdated;
        
        const createdDate = createdTimestamp?.toDate?.() || new Date();
        
        return {
          id: docSnap.id,
          title: data.title || '',
          subtitle: data.subtitle || data.summary || '',
          createdDate: createdDate.toISOString(),
          updatedDate: updatedTimestamp?.toDate?.()?.toISOString() || new Date().toISOString(),
          fileUrl: data.fileUrl || '',
          type: data.type || 'performance',
          _createdDateObj: createdDate, // Temporary field for filtering
        };
      })
      .filter((report: ReportWithDate) => report._createdDateObj >= thirtyDaysAgo)
      .sort((a: ReportWithDate, b: ReportWithDate) => b._createdDateObj.getTime() - a._createdDateObj.getTime())
      .slice(0, 3);

    // Remove temporary field and return as Report[]
    return reports.map(({ _createdDateObj, ...report }) => report as Report);
  } catch (error) {
    console.error('Error fetching recent reports:', error);
    return [];
  }
}
