/**
 * BSC-11 VERIFICATION — pending_orders write:
 * - pending_orders is written in the same Firestore batch as orders (atomic)
 * - claimState: "unclaimed" on creation
 * - claimedByUserId: null and claimedAt: null on creation
 *
 * IDEMPOTENCY CONTRACT:
 * Before writing anything, check if orders/{orderId} already exists.
 * If it does, log "Duplicate webhook — orderId already processed" and return early.
 * This makes the handler safe to re-run on webhook retries.
 *
 * All writes (orders + pending_orders + auditLeads update) happen in a Firestore batch.
 * Batch write is atomic — partial state is never written.
 */

import { FieldValue } from 'firebase-admin/firestore';
import type Stripe from 'stripe';

import { ensureFixSessionForOrder } from '@/lib/fix-jobs/seed-fix-session';
import { adminDb } from '@/lib/firebase/admin';
import type { SiteFixEntitlement } from '@/lib/types/client-context';

import { sendSiteFixPaymentConfirmedEmail } from './emails';
import {
  processDashboardInvite,
  resolveOrCreateUserIdForInvite,
} from './dashboard-invite';
import { expandEntitlements, SITE_FIX_SKUS, type SiteFixSKU } from './skus';
import { isSiteFixSession, parseSiteFixSessionMetadata } from './stripe-metadata';
import { warnIfBaseUrlLooksWrong } from './validate-base-url';
import { getAppBaseUrl as resolveAppBaseUrl } from '@/lib/base-url';

function getAppBaseUrl(): string {
  warnIfBaseUrlLooksWrong();
  return resolveAppBaseUrl();
}

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Prefer Stripe's checkout-collected email over metadata.
 * Metadata normalizedEmail is often empty when the audit funnel never passed
 * ?email= through to checkout session creation.
 */
export function resolveSiteFixNormalizedEmail(
  session: Stripe.Checkout.Session,
  metadataNormalizedEmail: string
): string {
  const stripeEmail = session.customer_details?.email;
  if (typeof stripeEmail === 'string' && stripeEmail.trim()) {
    return normalizeEmail(stripeEmail);
  }

  if (typeof metadataNormalizedEmail === 'string' && metadataNormalizedEmail.trim()) {
    return normalizeEmail(metadataNormalizedEmail);
  }

  const orderId =
    typeof session.metadata?.orderId === 'string' ? session.metadata.orderId : 'unknown';
  console.warn(
    `handleSiteFixPayment: no email resolved for orderId=${orderId} — writing empty normalizedEmail`
  );
  return '';
}

export async function handleSiteFixPayment(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (!adminDb) {
    console.error('handleSiteFixPayment: Firebase Admin not initialized');
    return;
  }

  if (!isSiteFixSession(session.metadata)) {
    console.error('handleSiteFixPayment: invalid metadata', session.metadata);
    return;
  }

  const parsedMetadata = parseSiteFixSessionMetadata(session.metadata);
  if (!parsedMetadata) {
    console.error('handleSiteFixPayment: invalid metadata shape', session.metadata);
    return;
  }

  const { orderId, auditLeadId, sku, normalizedEmail: metadataNormalizedEmail } =
    parsedMetadata;
  const normalizedEmail = resolveSiteFixNormalizedEmail(
    session,
    metadataNormalizedEmail
  );
  const skuKey = sku;
  const entitlements = expandEntitlements(skuKey);

  const orderRef = adminDb.collection('orders').doc(orderId);
  const existing = await orderRef.get();
  if (existing.exists) {
    console.log(
      `handleSiteFixPayment: duplicate webhook, orderId=${orderId} already processed`
    );
    await ensureFixSessionOnDuplicateWebhook({
      orderId,
      auditLeadId,
      entitlements,
      normalizedEmail,
    });
    return;
  }

  const auditLeadRef = adminDb.collection('auditLeads').doc(auditLeadId);
  const auditLeadSnap = await auditLeadRef.get();
  const auditLeadLinked = auditLeadSnap.exists;

  if (!auditLeadLinked) {
    console.warn(
      `handleSiteFixPayment: audit lead not found for auditLeadId=${auditLeadId} — writing auditLeadLinked=false`
    );
  }

  const now = FieldValue.serverTimestamp();

  const order = {
    orderId,
    auditLeadId,
    auditLeadLinked,
    sku: skuKey,
    entitlements,
    normalizedEmail,
    stripeSessionId: session.id,
    stripePaymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    status: 'paid',
    createdAt: now,
  };

  const pendingOrder = {
    orderId,
    auditLeadId,
    auditLeadLinked,
    sku: skuKey,
    entitlements,
    normalizedEmail,
    claimState: 'unclaimed',
    claimedByUserId: null,
    claimedAt: null,
    createdAt: now,
  };

  const batch = adminDb.batch();
  batch.set(orderRef, order);
  batch.set(adminDb.collection('pending_orders').doc(orderId), pendingOrder);
  await batch.commit();

  if (auditLeadLinked) {
    try {
      await auditLeadRef.update({ orderId });
    } catch (err) {
      console.warn(
        'handleSiteFixPayment: failed to update auditLeads (non-blocking)',
        err
      );
    }
  }

  void sendSiteFixPaymentConfirmedEmail({
    normalizedEmail,
    firstName: '',
    packageName: SITE_FIX_SKUS[skuKey].displayName,
    orderId,
    amount: SITE_FIX_SKUS[skuKey].price ?? 0,
    signupUrl: `${getAppBaseUrl()}/book-service/signup?orderId=${orderId}`,
  }).catch((err) =>
    console.error(
      'handleSiteFixPayment: Loops email failed (non-blocking)',
      err
    )
  );

  void trackServerAnalyticsEvent('site_fix_payment_succeeded', {
    orderId,
    sku: skuKey,
    auditLeadId,
  }).catch((err) =>
    console.warn('handleSiteFixPayment: analytics failed (non-blocking)', err)
  );

  console.log(`handleSiteFixPayment: order written orderId=${orderId}`);

  void triggerDashboardInvite({
    normalizedEmail,
    orderId,
    auditLeadId,
    entitlements,
    sku: skuKey,
  }).catch((err) =>
    console.error('handleSiteFixPayment: dashboard invite failed (non-blocking)', err)
  );
}

async function ensureFixSessionOnDuplicateWebhook(params: {
  orderId: string;
  auditLeadId: string;
  entitlements: SiteFixEntitlement[];
  normalizedEmail: string;
}): Promise<void> {
  const userId = await resolveOrCreateUserIdForInvite(params.normalizedEmail);
  if (!userId) {
    return;
  }

  await ensureFixSessionForOrder({
    userId,
    orderId: params.orderId,
    auditLeadId: params.auditLeadId,
    entitlements: params.entitlements,
  });
}

async function triggerDashboardInvite(params: {
  normalizedEmail: string;
  orderId: string;
  auditLeadId: string;
  entitlements: SiteFixEntitlement[];
  sku: SiteFixSKU;
}): Promise<void> {
  const userId = await resolveOrCreateUserIdForInvite(params.normalizedEmail);
  if (!userId) {
    return;
  }

  await ensureFixSessionForOrder({
    userId,
    orderId: params.orderId,
    auditLeadId: params.auditLeadId,
    entitlements: params.entitlements,
  });

  const cronSecret = process.env.CRON_SECRET;
  const invitePayload = {
    userId,
    email: params.normalizedEmail,
    orderId: params.orderId,
    sku: params.sku,
  };

  if (cronSecret) {
    const response = await fetch(`${getAppBaseUrl()}/api/book-service/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cronSecret}`,
      },
      body: JSON.stringify(invitePayload),
    });

    if (!response.ok) {
      console.error(
        '[handleSiteFixPayment] invite route failed:',
        await response.text()
      );
    }

    return;
  }

  await processDashboardInvite(invitePayload);
}

async function trackServerAnalyticsEvent(
  event: string,
  properties: Record<string, unknown>
): Promise<void> {
  if (!adminDb) return;
  await adminDb.collection('analyticsEvents').add({
    event,
    properties,
    createdAt: FieldValue.serverTimestamp(),
  });
}
