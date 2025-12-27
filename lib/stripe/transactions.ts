import { db } from '@/lib/firebase';

// Browser-only Firestore functions
let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { collection, getDocs, query, orderBy } = require('firebase/firestore');
  firestoreFunctions = { collection, getDocs, query, orderBy };
}

export interface Transaction {
  id: string;
  orderId: string;
  description: string;
  date: Date;
  amount: number;
  status: 'completed' | 'failed' | 'processing' | 'refunded';
  paymentMethod: {
    brand: string;
    last4: string;
  };
  invoiceUrl?: string;
}

export async function getTransactionsForUser(userId: string): Promise<Transaction[]> {
  if (typeof window === 'undefined' || !db) {
    return [];
  }

  try {
    const transactionsRef = firestoreFunctions.collection(db, `users/${userId}/transactions`);
    const q = firestoreFunctions.query(transactionsRef, firestoreFunctions.orderBy('date', 'desc'));
    const querySnapshot = await firestoreFunctions.getDocs(q);

    const transactions: Transaction[] = [];
    querySnapshot.forEach((doc: any) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        orderId: data.orderId,
        description: data.description,
        date: data.date.toDate(),
        amount: data.amount,
        status: data.status,
        paymentMethod: {
          brand: data.paymentMethodBrand,
          last4: data.paymentMethodLast4,
        },
        invoiceUrl: data.invoiceUrl,
      });
    });

    return transactions;
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return [];
  }
}
