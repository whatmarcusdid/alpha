'use client';
import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { SupportTicket } from '@/types/supportTicket';

const supportTicketsCollection = (userId: string) => {
    if (typeof window === 'undefined') {
        const { getFirestore } = require('firebase-admin/firestore');
        const adminDb = getFirestore();
        return adminDb.collection('users').doc(userId).collection('supportTickets');
    }
    // Check if db is initialized (browser-only pattern)
    if (!db) {
        throw new Error('Firestore is not initialized');
    }
    return collection(db, 'users', userId, 'supportTickets');
};

export async function createSupportTicket(
  userId: string,
  ticketData: Partial<SupportTicket>
): Promise<{ success: boolean; ticketId?: string; error?: string }> {
  if (!db) {
    return { success: false, error: 'Firestore is not initialized' };
  }

  try {
    const newTicketRef = doc(supportTicketsCollection(userId));
    const newTicket: Partial<SupportTicket> = {
      ...ticketData,
      id: newTicketRef.id,
      userId,
      status: 'open',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    await addDoc(supportTicketsCollection(userId), newTicket);
    return { success: true, ticketId: newTicketRef.id };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getSupportTicket(
  userId: string,
  ticketId: string
): Promise<{ ticket?: SupportTicket; error?: string }> {
  if (!db) {
    return { error: 'Firestore is not initialized' };
  }

  try {
    const ticketRef = doc(supportTicketsCollection(userId), ticketId);
    const ticketSnap = await getDoc(ticketRef);

    if (ticketSnap.exists()) {
      return { ticket: ticketSnap.data() as SupportTicket };
    } else {
      return { error: 'Ticket not found' };
    }
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getUserSupportTickets(
  userId: string,
  filters?: { status?: string }
): Promise<{ tickets?: SupportTicket[]; error?: string }> {
  if (!db) {
    return { error: 'Firestore is not initialized' };
  }

  try {
    let q = query(supportTicketsCollection(userId));

    if (filters?.status) {
      q = query(q, where('status', '==', filters.status));
    }

    const querySnapshot = await getDocs(q);
    const tickets = querySnapshot.docs.map(doc => doc.data() as SupportTicket);
    return { tickets };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function updateSupportTicket(
  userId: string,
  ticketId: string,
  updates: Partial<SupportTicket>
): Promise<{ success: boolean; error?: string }> {
  if (!db) {
    return { success: false, error: 'Firestore is not initialized' };
  }

  try {
    const ticketRef = doc(supportTicketsCollection(userId), ticketId);
    await updateDoc(ticketRef, {
      ...updates,
      updatedAt: Timestamp.now(),
    });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function resolveSupportTicket(
  userId: string,
  ticketId: string
): Promise<{ success: boolean; error?: string }> {
  return updateSupportTicket(userId, ticketId, {
    status: 'resolved',
    resolvedAt: Timestamp.now(),
  });
}

export async function closeSupportTicket(
  userId: string,
  ticketId: string
): Promise<{ success: boolean; error?: string }> {
  return updateSupportTicket(userId, ticketId, { status: 'closed' });
}
