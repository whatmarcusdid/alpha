'use client';
/**
 * Firestore Helper Functions
 * 
 * CRITICAL: This file follows the browser-only initialization pattern.
 * - All Firestore functions wrapped in typeof window !== 'undefined' checks
 * - Uses require() pattern instead of ES6 imports
 * - Firestore only runs in the browser, never on the server
 */

import { db } from '@/lib/firebase';

// Load Firestore functions only in browser
let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const firebaseFirestore = require('firebase/firestore');
  firestoreFunctions = {
    doc: firebaseFirestore.doc,
    getDoc: firebaseFirestore.getDoc,
    collection: firebaseFirestore.collection,
    updateDoc: firebaseFirestore.updateDoc,
    setDoc: firebaseFirestore.setDoc,
    serverTimestamp: firebaseFirestore.serverTimestamp,
  };
}

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
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    const userDoc = await firestoreFunctions.getDoc(userRef);

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
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    const userDoc = await firestoreFunctions.getDoc(userRef);

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
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    const userDoc = await firestoreFunctions.getDoc(userRef);

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
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    
    // TODO: Encrypt adminPassword before storing in production
    await firestoreFunctions.updateDoc(userRef, {
      wordpressCredentials: {
        dashboardUrl: credentials.dashboardUrl,
        adminEmail: credentials.adminEmail,
        adminPassword: credentials.adminPassword, // TODO: Encrypt this in production
        lastUpdated: firestoreFunctions.serverTimestamp(),
      },
    });
  } catch (error) {
    console.error('Error updating WordPress credentials:', error);
    throw error;
  }
}

// Create User with Subscription Function
export async function createUserWithSubscription(
  userId: string,
  email: string,
  fullName: string,
  subscriptionData: {
    tier: 'essential' | 'advanced' | 'premium';
    billingCycle: 'monthly' | 'yearly';
    amount: number;
    paymentIntentId: string;
  }
) {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    throw new Error('Firestore not initialized');
  }

  try {
    // Calculate hours based on tier
    const tierHours = {
      essential: { support: 4, maintenance: 8 },
      advanced: { support: 6, maintenance: 12 },
      premium: { support: 8, maintenance: 16 },
    };

    const hours = tierHours[subscriptionData.tier];

    const userData = {
      email,
      fullName,
      createdAt: firestoreFunctions.serverTimestamp(),
      subscription: {
        tier: subscriptionData.tier,
        billingCycle: subscriptionData.billingCycle,
        status: 'active' as const,
        amount: subscriptionData.amount,
        startDate: firestoreFunctions.serverTimestamp(),
        paymentIntentId: subscriptionData.paymentIntentId,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
      },
      metrics: {
        websiteTraffic: 0,
        averageSiteSpeed: 0,
        supportHoursRemaining: hours.support,
        maintenanceHoursRemaining: hours.maintenance,
        lastUpdated: firestoreFunctions.serverTimestamp(),
      },
      wordpress: null,
      company: null,
    };

    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    await firestoreFunctions.setDoc(userRef, userData);

    return userData;
  } catch (error) {
    console.error('Error creating user with subscription:', error);
    throw error;
  }
}

// Link Stripe Customer to User Function
export async function linkStripeCustomer(
  userId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string
) {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    throw new Error('Firestore not initialized');
  }

  try {
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    
    await firestoreFunctions.updateDoc(userRef, {
      'subscription.stripeCustomerId': stripeCustomerId,
      'subscription.stripeSubscriptionId': stripeSubscriptionId,
    });
  } catch (error) {
    console.error('Error linking Stripe customer:', error);
    throw error;
  }
}
