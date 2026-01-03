'use client';

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  query,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

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
  if (!db) {
    console.error('Firestore is not initialized.');
    return [];
  }

  try {
    const transactionsRef = collection(doc(collection(db, 'users'), userId), 'transactions');
    const q = query(transactionsRef, orderBy('date', 'desc'));

    const snapshot = await getDocs(q);

    return snapshot.docs.map((docSnap: any) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        amount: data.amount || 0,
        date: data.date instanceof Timestamp ? data.date.toDate() : new Date(),
        description: data.description || '',
        status: data.status || 'pending',
        paymentMethodBrand: data.paymentMethodBrand || '',
        paymentMethodLast4: data.paymentMethodLast4 || '',
        orderId: data.orderId || '',
        invoiceUrl: data.invoiceUrl || undefined,
      } as Transaction;
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}

export async function addTransaction(
  userId: string,
  transaction: Omit<Transaction, 'id'>
): Promise<string | null> {
  if (!db) {
    console.error('Firestore is not initialized.');
    return null;
  }

  try {
    const transactionsRef = collection(doc(collection(db, 'users'), userId), 'transactions');
    
    const docRef = await addDoc(transactionsRef, {
      ...transaction,
      createdAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding transaction:', error);
    return null;
  }
}
