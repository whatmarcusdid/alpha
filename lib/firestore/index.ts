'use client';

import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Re-export functions from other files
export * from './profile';
export * from './reports';
export * from './sites';
export * from './support';

// User Metrics Function
export async function getUserMetrics(userId: string) {
  console.log('🔍 getUserMetrics called with userId:', userId);
  
  if (typeof window === 'undefined') {
    console.log('❌ Not in browser environment');
    return {
      websiteTraffic: 1,
      averageSiteSpeed: 2,
      supportHoursRemaining: 3,
      maintenanceHoursRemaining: 4,
    };
  }

  if (!db) {
    console.error('❌ Firestore db is not initialized');
    return {
      websiteTraffic: 0,
      averageSiteSpeed: 0,
      supportHoursRemaining: 10,
      maintenanceHoursRemaining: 10,
    };
  }

  try {
    console.log('🔍 Fetching user document for metrics...');
    
    const userRef = doc(collection(db, 'users'), userId);
    const userDoc = await getDoc(userRef);

    console.log('📊 User document exists:', userDoc.exists());

    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log('📄 Full user data:', data);
      console.log('📄 Stats data:', data.stats);
      
      const stats = data.stats || {};
      
      const metrics = {
        websiteTraffic: stats.websiteTraffic || 0,
        averageSiteSpeed: stats.siteSpeedSeconds || 0,
        supportHoursRemaining: stats.supportHoursRemaining || 10,
        maintenanceHoursRemaining: stats.maintenanceHoursRemaining || 10,
      };
      
      console.log('✅ Returning metrics:', metrics);
      return metrics;
    }

    console.log('⚠️ User document does not exist, returning defaults');
    return {
      websiteTraffic: 0,
      averageSiteSpeed: 0,
      supportHoursRemaining: 10,
      maintenanceHoursRemaining: 10,
    };
  } catch (error) {
    console.error('❌ Error fetching user metrics:', error);
    
    return {
      websiteTraffic: 0,
      averageSiteSpeed: 0,
      supportHoursRemaining: 10,
      maintenanceHoursRemaining: 10,
    };
  }
}

// User Company Data Function
export async function getUserCompany(userId: string) {
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
