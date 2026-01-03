'use client';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, collection } from 'firebase/firestore';

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
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return null;
  }

  try {
    const userRef = doc(collection(db, 'users'), userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      const company = data.company || {};
      
      return {
        legalName: company.legalName || '',
        websiteUrl: data.websiteUrl || '',
        yearFounded: company.yearFounded || '',
        numEmployees: company.numEmployees || '',
        address: company.address || '',
        address2: company.address2 || '',
        city: company.city || '',
        state: company.state || '',
        zipCode: company.zipCode || '',
        businessService: company.businessService || '',
        serviceArea: company.serviceArea || data.serviceArea || '',
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching company data:', error);
    return null;
  }
}

export async function updateCompanyData(
  userId: string,
  companyData: Partial<CompanyData>
): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return { success: false, error: 'Firestore is not initialized' };
  }

  try {
    const userRef = doc(collection(db, 'users'), userId);
    
    const updatePayload: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(companyData)) {
      updatePayload[`company.${key}`] = value;
    }
    updatePayload['company.lastUpdated'] = new Date().toISOString();

    await updateDoc(userRef, updatePayload);
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating company data:', error);
    return { success: false, error: error.message };
  }
}
