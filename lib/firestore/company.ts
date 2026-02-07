'use client';
import { db } from '@/lib/firebase';

// Browser-only Firestore functions
let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { doc, getDoc, updateDoc, collection } = require('firebase/firestore');
  firestoreFunctions = { doc, getDoc, updateDoc, collection };
}

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
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    const userDoc = await firestoreFunctions.getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      const company = data.company || {};
      
      return {
        legalName: company.legalName || '',
        websiteUrl: company.websiteUrl || '',
        yearFounded: company.yearFounded || '',
        numEmployees: company.numEmployees || '',
        address: company.address || '',
        address2: company.address2 || '',
        city: company.city || '',
        state: company.state || '',
        zipCode: company.zipCode || '',
        businessService: company.businessService || '',
        serviceArea: company.serviceArea || '',
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
): Promise<boolean> {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return false;
  }

  try {
    const userRef = firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId);
    
    const updatePayload: { [key: string]: any } = {};
    for (const [key, value] of Object.entries(companyData)) {
      updatePayload[`company.${key}`] = value;
    }
    updatePayload['company.lastUpdated'] = new Date().toISOString();

    await firestoreFunctions.updateDoc(userRef, updatePayload);
    
    return true;
  } catch (error: any) {
    console.error('Error updating company data:', error);
    return false;
  }
}
