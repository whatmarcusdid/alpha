'use client';
import { doc, getDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// User Metrics Function
export async function getUserMetrics(userId: string) {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return {
      websiteTraffic: 0,
      averageSiteSpeed: 0,
      supportHoursRemaining: 0,
      maintenanceHoursRemaining: 0,
    };
  }

  try {
    const userRef = doc(collection(db, 'users'), userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      const metrics = data.metrics || {};
      
      return {
        websiteTraffic: metrics.websiteTraffic || 0,
        averageSiteSpeed: metrics.siteSpeedSeconds || 0,
        supportHoursRemaining: metrics.supportHoursRemaining || 0,
        maintenanceHoursRemaining: metrics.maintenanceHoursRemaining || 0,
      };
    }

    return {
      websiteTraffic: 0,
      averageSiteSpeed: 0,
      supportHoursRemaining: 0,
      maintenanceHoursRemaining: 0,
    };
  } catch (error) {
    console.error('Error fetching user metrics:', error);
    return {
      websiteTraffic: 0,
      averageSiteSpeed: 0,
      supportHoursRemaining: 0,
      maintenanceHoursRemaining: 0,
    };
  }
}

// User Company Data Function
export async function getUserCompany(userId: string) {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return null;
  }
  
  try {
    const userRef = doc(collection(db, 'users'), userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      return data.company || null;
    }

    return null;
  } catch (error) {
    console.error('Error fetching company data:', error);
    return null;
  }
}
