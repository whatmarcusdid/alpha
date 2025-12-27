import { db } from '@/lib/firebase';

let firestoreFunctions: any = {};

if (typeof window !== 'undefined') {
  const { doc, getDoc } = require('firebase/firestore');
  firestoreFunctions = { doc, getDoc };
}

export interface Subscription {
  planName: string;
  planCadence: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'past_due' | 'unpaid' | 'canceled' | 'cancel_at_period_end';
  renewalDate: Date;
  amount: number;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
}

export async function getSubscriptionForUser(userId: string): Promise<Subscription | null> {
  if (typeof window === 'undefined' || !db) {
    return null;
  }

  try {
    const userDocRef = firestoreFunctions.doc(db, 'users', userId);
    const userDocSnap = await firestoreFunctions.getDoc(userDocRef);

    if (userDocSnap.exists()) {
      const userData = userDocSnap.data();
      const subscriptionData = userData.subscription;

      if (!subscriptionData || !subscriptionData.tier || !subscriptionData.endDate) {
        return null;
      }

      let planName = '';
      let amount = 0;

      switch (subscriptionData.tier) {
        case 'monthly':
          planName = 'Genie Maintenance - Monthly $69/mo';
          amount = 69;
          break;
        case 'quarterly':
          planName = 'Genie Maintenance - Quarterly $207/qtr';
          amount = 207;
          break;
        case 'yearly':
          planName = 'Genie Maintenance - Yearly $679/yr';
          amount = 679;
          break;
        default:
          return null; // or handle as an error
      }
      
      let subStatus: Subscription['status'] = 'canceled';
      if (subscriptionData.status === 'active') {
        subStatus = 'active';
      }

      const subscription: Subscription = {
        planName,
        planCadence: subscriptionData.tier,
        status: subStatus,
        renewalDate: subscriptionData.endDate.toDate(),
        amount,
        stripeCustomerId: 'cus_placeholder_mvp', // MVP: Not stored in Firestore
        stripeSubscriptionId: 'sub_placeholder_mvp', // MVP: Not stored in Firestore
      };

      return subscription;
    }

    return null;
  } catch (error) {
    console.error('Error fetching subscription data:', error);
    return null;
  }
}
