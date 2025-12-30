'use client';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';

export interface CompanyData {
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
}

export async function getCompanyData(userId: string): Promise<CompanyData | null> {
  console.log('🔍 getCompanyData called with userId:', userId);
  
  if (typeof window === 'undefined') {
    console.log('❌ Not in browser, returning null');
    return null;
  }

  if (!db) {
    console.error('❌ Firestore db is not initialized');
    return null;
  }

  try {
    console.log('🔍 Fetching user document...');
    const userRef = doc(collection(db, 'users'), userId);
    const userDoc = await getDoc(userRef);

    console.log('📊 User document exists:', userDoc.exists());

    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log('📄 Full user data:', data);
      console.log('📄 Company data from user doc:', data.company);
      
      const company = data.company || {};
      
      const companyData = {
        legalName: company.legalName || '',
        websiteUrl: data.websiteUrl || '',  // websiteUrl is at root level
        yearFounded: company.yearFounded || '',
        numEmployees: company.numEmployees || '',
        address: company.address || '',
        address2: company.address2 || '',
        city: company.city || '',
        state: company.state || '',
        zipCode: company.zipCode || '',
        businessService: company.businessService || '',
        serviceArea: company.serviceArea || data.serviceArea || '',  // Can be at root or in company
      };
      
      console.log('✅ Returning company data:', companyData);
      return companyData;
    }

    console.log('⚠️ User document does not exist');
    return null;
  } catch (error) {
    console.error('❌ Error fetching company data:', error);
    return null;
  }
}

export async function updateCompanyData(
  userId: string,
  companyData: Partial<CompanyData>
): Promise<{ success: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not in browser environment' };
  }

  if (!db) {
    return { success: false, error: 'Firestore is not initialized' };
  }

  try {
    const userRef = doc(collection(db, 'users'), userId);
    await updateDoc(userRef, {
      company: companyData,
      'company.lastUpdated': new Date(),
    });
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating company data:', error);
    return { success: false, error: error.message };
  }
}
