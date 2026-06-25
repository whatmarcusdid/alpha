/**
 * Server-side Site Fix analytics — non-blocking writes to analyticsEvents.
 */

import { FieldValue } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';

export const SITE_FIX_SERVER_EVENTS = [
  'site_fix_account_created',
  'site_fix_site_confirmed',
  'site_fix_access_submitted',
  'site_fix_delivery_ready',
  'site_fix_onboarding_stuck',
] as const;

export type SiteFixServerAnalyticsEvent =
  (typeof SITE_FIX_SERVER_EVENTS)[number];

export function trackSiteFixServerEvent(
  event: SiteFixServerAnalyticsEvent,
  params: { userId: string; orderId: string }
): void {
  if (!adminDb) return;

  void adminDb
    .collection('analyticsEvents')
    .add({
      event,
      userId: params.userId,
      orderId: params.orderId,
      createdAt: FieldValue.serverTimestamp(),
    })
    .catch((err) =>
      console.warn(`[book-service/analytics] ${event} failed (non-blocking):`, err)
    );
}
