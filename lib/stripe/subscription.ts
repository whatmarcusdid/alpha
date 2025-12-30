'use client';

import { db } from '@/lib/firebase';
import { collection, doc, getDoc, updateDoc } from 'firebase/firestore';

export interface Subscription {
  tier: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate: Date;
}

export async function getSubscriptionForUser(userId: string): Promise<Subscription | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!db) {
    console.error('Firestore db is not initialized');
    return null;
  }

  try {
    const userRef = doc(collection(db, 'users'), userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      const subscription = data.subscription;
      
      if (subscription) {
        return {
          tier: subscription.tier || 'monthly',
          status: subscription.status || 'inactive',
          startDate: subscription.startDate?.toDate() || new Date(),
          endDate: subscription.endDate?.toDate() || new Date(),
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return null;
  }
}

export async function updateSubscription(
  userId: string,
  subscription: Partial<Subscription>
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  if (!db) {
    console.error('Firestore db is not initialized');
    return false;
  }

  try {
    const userRef = doc(collection(db, 'users'), userId);
    await updateDoc(userRef, {
      subscription: subscription,
    });
    
    return true;
  } catch (error) {
    console.error('Error updating subscription:', error);
    return false;
  }
}
