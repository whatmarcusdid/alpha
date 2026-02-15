'use client';
import { db } from '@/lib/firebase';
import { doc, collection, onSnapshot, getDoc } from 'firebase/firestore';

export const ESSENTIAL_ANNUAL = 'price_1S8hrpAFl7pIsUOsWA9XFhQJ';
export const ADVANCED_ANNUAL = 'price_1SlR6lAFl7pIsUOs2C9HqP3f';
export const PREMIUM_ANNUAL = 'price_1SlR6lAFl7pIsUOssc19PMYR';
export const SAFETY_NET_ANNUAL = 'price_1SlRYNPTDVjQnuCnm9lCoiQT';

export interface Subscription {
  tier: 'essential' | 'advanced' | 'premium' | 'safety_net';
  status: 'active' | 'cancelled' | 'expired';
  startDate: Date;
  endDate: Date;
  stripeSubscriptionId: string;
  billingFrequency?: 'monthly' | 'quarterly' | 'yearly';
}

export function listenForActiveSubscription(userId: string, callback: (hasActive: boolean) => void): () => void {
  if (!db) {
    console.error('Firestore is not initialized. This function must be called on the client side.');
    return () => {};
  }

  const userDocRef = doc(collection(db, 'users'), userId);
  const subscriptionsRef = collection(userDocRef, 'subscriptions');

  const unsubscribe = onSnapshot(subscriptionsRef, (snapshot) => {
    const hasActive = snapshot.docs.some(doc => {
      const data = doc.data();
      return data.status === 'active' || data.status === 'trialing';
    });
    callback(hasActive);
  });

  return unsubscribe;
}

export async function getSubscriptionForUser(userId: string): Promise<Subscription | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!db) {
    console.error('Firestore not initialized');
    return null;
  }

  try {
    const userRef = doc(collection(db, 'users'), userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      const sub = data.subscription;
      
      if (sub) {
        return {
          tier: sub.tier || 'essential',
          status: sub.status || 'active',
          startDate: sub.startDate?.toDate() || new Date(),
          endDate: sub.endDate?.toDate() || new Date(),
          stripeSubscriptionId: sub.stripeSubscriptionId || '',
          billingFrequency: sub.billingFrequency || 'yearly',
        };
      }
    }
    return null;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return null;
  }
}

export async function cancelSubscription(
  userId: string,
  stripeSubscriptionId: string,
  cancellationReason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/stripe/cancel-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscriptionId: stripeSubscriptionId,
        reason: cancellationReason,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to cancel' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error cancelling subscription:', error);
    return { success: false, error: error.message || 'An unknown error occurred' };
  }
}

export async function switchToSafetyNet(
  userId: string,
  stripeSubscriptionId: string,
  cancellationReason: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('/api/stripe/switch-to-safety-net', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentSubscriptionId: stripeSubscriptionId,
        reason: cancellationReason,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to switch to Safety Net' };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error switching to Safety Net:', error);
    return { success: false, error: error.message || 'An unknown error occurred' };
  }
}
