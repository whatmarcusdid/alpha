'use client';
import { doc, getDoc, collection, updateDoc, serverTimestamp } from 'firebase/firestore';
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
      // Access stats object instead of metrics
      const stats = data.stats || {};
      
      return {
        websiteTraffic: stats.websiteTraffic || 0,
        averageSiteSpeed: stats.siteSpeedSeconds || 0,
        supportHoursRemaining: stats.supportHoursRemaining || 0,
        maintenanceHoursRemaining: stats.maintenanceHoursRemaining || 0,
      };
    }

    // Return default values if document doesn't exist
    return {
      websiteTraffic: 0,
      averageSiteSpeed: 0,
      supportHoursRemaining: 0,
      maintenanceHoursRemaining: 0,
    };
  } catch (error) {
    console.error('Error fetching user metrics:', error);
    // Return default values on error
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

// User Subscription Data Function
export async function getUserSubscription(userId: string) {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return null;
  }
  
  try {
    const userRef = doc(collection(db, 'users'), userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        tier: data.subscription?.tier || 'essential',
        renewalDate: data.subscription?.renewalDate || null,
        status: data.subscription?.status || 'active',
        price: data.subscription?.price || null,
        billingCycle: data.subscription?.billingCycle || 'yearly',
        expiresAt: data.subscription?.expiresAt || null,
        canceledAt: data.subscription?.canceledAt || null,
      };
    }

    return null;
  } catch (error) {
    console.error('Error getting user subscription:', error);
    return null;
  }
}

// WordPress Credentials Function
export async function updateWordPressCredentials(
  userId: string,
  credentials: {
    dashboardUrl: string;
    adminEmail: string;
    adminPassword: string;
  }
) {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    throw new Error('Firestore not initialized');
  }

  try {
    const userRef = doc(collection(db, 'users'), userId);
    
    // TODO: Encrypt adminPassword before storing in production
    await updateDoc(userRef, {
      wordpressCredentials: {
        dashboardUrl: credentials.dashboardUrl,
        adminEmail: credentials.adminEmail,
        adminPassword: credentials.adminPassword, // TODO: Encrypt this in production
        lastUpdated: serverTimestamp(),
      },
    });
  } catch (error) {
    console.error('Error updating WordPress credentials:', error);
    throw error;
  }
}
