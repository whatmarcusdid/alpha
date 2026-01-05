'use client';

import { db } from '@/lib/firebase';

// Use a browser-only pattern to avoid SSR errors
let firestoreFunctions: any = {};
if (typeof window !== 'undefined') {
  const firestore = require('firebase/firestore');
  firestoreFunctions = {
    collection: firestore.collection,
    doc: firestore.doc,
    addDoc: firestore.addDoc,
    query: firestore.query,
    orderBy: firestore.orderBy,
    getDocs: firestore.getDocs,
    Timestamp: firestore.Timestamp,
  };
}

export interface Transaction {
  id: string;
  amount: number;
  date: Date;
  description: string;
  status: 'completed' | 'pending' | 'failed';
  paymentMethodBrand: string;
  paymentMethodLast4: string;
  orderId: string;
  invoiceUrl?: string;
}

export async function getTransactionsForUser(userId: string): Promise<Transaction[]> {
  console.log('🔍 getTransactionsForUser called with userId:', userId);
  
  if (typeof window === 'undefined' || !firestoreFunctions.collection || !db) {
    console.log('❌ Browser check failed or Firestore not initialized');
    return [];
  }

  try {
    console.log('✅ Building Firestore query...');
    
    const transactionsRef = firestoreFunctions.collection(
      firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId),
      'transactions'
    );
    
    console.log('✅ Transactions ref created');
    
    const q = firestoreFunctions.query(transactionsRef, firestoreFunctions.orderBy('date', 'desc'));
    
    console.log('✅ Query created, executing...');
    
    const snapshot = await firestoreFunctions.getDocs(q);
    
    console.log('📊 Snapshot received. Empty?', snapshot.empty);
    console.log('📊 Number of docs:', snapshot.docs?.length || 0);

    if (snapshot.empty) {
      console.log('⚠️ No transactions found');
      return [];
    }

    console.log('✅ Processing', snapshot.docs.length, 'transactions...');
    
    const transactions = snapshot.docs.map((doc: any) => {
      const data = doc.data();
      console.log('📄 Processing doc:', doc.id, data);
      
      return {
        id: doc.id,
        amount: data.amount,
        date: data.date instanceof firestoreFunctions.Timestamp ? data.date.toDate() : new Date(data.date),
        description: data.description,
        status: data.status,
        paymentMethodBrand: data.paymentMethodBrand,
        paymentMethodLast4: data.paymentMethodLast4,
        orderId: data.orderId,
        invoiceUrl: data.invoiceUrl,
      };
    });
    
    console.log('✅ Returning', transactions.length, 'transactions:', transactions);
    
    return transactions;
  } catch (error) {
    console.error('❌ Error fetching transactions:', error);
    return [];
  }
}

export async function addTransaction(
  userId: string,
  transaction: Omit<Transaction, 'id'>
): Promise<string | null> {
  if (typeof window === 'undefined' || !firestoreFunctions.collection || !db) {
    console.error('Cannot add transaction on the server-side or Firestore is not initialized.');
    return null;
  }

  try {
    const transactionsRef = firestoreFunctions.collection(
      firestoreFunctions.doc(firestoreFunctions.collection(db, 'users'), userId),
      'transactions'
    );

    const docRef = await firestoreFunctions.addDoc(transactionsRef, transaction);

    return docRef.id;
  } catch (error) {
    console.error('Error adding transaction:', error);
    return null;
  }
}
