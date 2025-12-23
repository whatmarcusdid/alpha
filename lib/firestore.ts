
import { db } from './firebase';

// Browser-only Firestore functions
let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { doc, getDoc, setDoc, updateDoc, serverTimestamp } = require('firebase/firestore');
  firestoreFunctions = { doc, getDoc, setDoc, updateDoc, serverTimestamp };
}

// Firestore data types
interface UserMetrics {
  websiteTraffic: number;
  averageSiteSpeed: number;
  supportHoursRemaining: number;
  maintenanceHoursRemaining: number;
  lastUpdated?: any;
}

interface CompanyInfo {
  legalName: string;
  websiteUrl: string;
  yearFounded: string;
  numEmployees: string;
  address: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  businessService: string;
  serviceArea: string;
  lastUpdated?: any;
}

interface UserProfile {
  email: string;
  displayName: string;
  createdAt?: any;
  subscription?: {
    tier: 'monthly' | 'quarterly' | 'yearly';
    status: 'active' | 'inactive' | 'cancelled';
    startDate?: any;
    endDate?: any;
  };
  metrics?: UserMetrics;
  company?: CompanyInfo;
}

export type { UserProfile, UserMetrics, CompanyInfo };

// Default metrics for new users
function getDefaultMetrics(): UserMetrics {
  return {
    websiteTraffic: 0,
    averageSiteSpeed: 0,
    supportHoursRemaining: 10,
    maintenanceHoursRemaining: 10
  };
}

// Get user data from Firestore
export async function getUserData(userId: string): Promise<UserProfile | null> {
  // Guard: Return null on server
  if (typeof window === 'undefined' || !db) {
    return null;
  }
  
  try {
    const userDocRef = firestoreFunctions.doc(db, 'users', userId);
    const userDoc = await firestoreFunctions.getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
}

// Get user metrics specifically
export async function getUserMetrics(userId: string): Promise<UserMetrics> {
  // Guard: Return defaults on server
  if (typeof window === 'undefined' || !db) {
    return getDefaultMetrics();
  }
  
  try {
    const userData = await getUserData(userId);
    if (userData && userData.metrics) {
      return userData.metrics;
    }
    return getDefaultMetrics();
  } catch (error) {
    console.error('Error fetching user metrics:', error);
    return getDefaultMetrics();
  }
}

// Initialize user profile
export async function initializeUserProfile(
  userId: string, 
  email: string, 
  displayName: string
): Promise<boolean> {
  // Guard: Return false on server
  if (typeof window === 'undefined' || !db) {
    return false;
  }
  
  try {
    const userDocRef = firestoreFunctions.doc(db, 'users', userId);
    await firestoreFunctions.setDoc(userDocRef, {
      email,
      displayName,
      createdAt: firestoreFunctions.serverTimestamp(),
      subscription: { tier: 'monthly', status: 'inactive' },
      metrics: getDefaultMetrics()
    });
    return true;
  } catch (error) {
    console.error('Error initializing user profile:', error);
    return false;
  }
}

// Update user metrics
export async function updateUserMetrics(
  userId: string, 
  metrics: Partial<UserMetrics>
): Promise<boolean> {
  // Guard: Return false on server
  if (typeof window === 'undefined' || !db) {
    return false;
  }
  
  try {
    const userDocRef = firestoreFunctions.doc(db, 'users', userId);
    await firestoreFunctions.setDoc(userDocRef, {
      metrics: { ...metrics, lastUpdated: firestoreFunctions.serverTimestamp() }
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating user metrics:', error);
    return false;
  }
}

export async function getCompanyInfo(userId: string): Promise<CompanyInfo | null> {
  // Guard: Return null on server
  if (typeof window === 'undefined' || !db) {
    return null;
  }
  
  try {
    const userData = await getUserData(userId);
    if (userData && userData.company) {
      return userData.company;
    }
    return null;
  } catch (error) {
    console.error('Error fetching company info:', error);
    return null;
  }
}

export async function updateCompanyInfo(
  userId: string,
  companyInfo: CompanyInfo
): Promise<boolean> {
  // Guard: Return false on server
  if (typeof window === 'undefined' || !db) {
    return false;
  }
  
  try {
    const userDocRef = firestoreFunctions.doc(db, 'users', userId);
    await firestoreFunctions.setDoc(userDocRef, {
      company: {
        ...companyInfo,
        lastUpdated: firestoreFunctions.serverTimestamp()
      }
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error updating company info:', error);
    return false;
  }
}
