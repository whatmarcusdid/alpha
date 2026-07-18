// Emulator Firestore reads for Stripe failure-path e2e checks.
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
}
const adminDb = admin.firestore();

export type OrderFirestoreState = {
  orderExists: boolean;
  orderStatus: string | null;
  pendingOrderExists: boolean;
  pendingClaimState: string | null;
};

export async function getOrderFirestoreState(
  orderId: string
): Promise<OrderFirestoreState> {
  const [orderSnap, pendingSnap] = await Promise.all([
    adminDb.collection('orders').doc(orderId).get(),
    adminDb.collection('pending_orders').doc(orderId).get(),
  ]);

  const orderData = orderSnap.exists ? orderSnap.data() : null;
  const pendingData = pendingSnap.exists ? pendingSnap.data() : null;

  return {
    orderExists: orderSnap.exists,
    orderStatus: typeof orderData?.status === 'string' ? orderData.status : null,
    pendingOrderExists: pendingSnap.exists,
    pendingClaimState:
      typeof pendingData?.claimState === 'string' ? pendingData.claimState : null,
  };
}

export async function countPaidOrders(): Promise<number> {
  const snap = await adminDb.collection('orders').where('status', '==', 'paid').get();
  return snap.size;
}
