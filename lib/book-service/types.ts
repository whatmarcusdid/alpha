import type { Timestamp } from 'firebase-admin/firestore';

import type { SiteFixEntitlement, SiteFixSKU } from './skus';

/**
 * Firestore security rules (server-write only):
 * - orders/{orderId}: no client reads/writes
 * - pending_orders/{orderId}: no client reads/writes
 *
 * Required composite indexes:
 * - orders: auditLeadId ASC + createdAt DESC
 * - pending_orders: normalizedEmail ASC + createdAt DESC
 */

export interface SiteFixOrder {
  orderId: string;
  auditLeadId: string;
  /** True when auditLeads/{auditLeadId} existed at webhook write time. */
  auditLeadLinked: boolean;
  sku: SiteFixSKU;
  entitlements: SiteFixEntitlement[];
  normalizedEmail: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  status: 'paid' | 'cancelled' | 'refunded';
  createdAt: Timestamp;
}

export interface SiteFixPendingOrder {
  orderId: string;
  auditLeadId: string;
  /** True when auditLeads/{auditLeadId} existed at webhook write time. */
  auditLeadLinked: boolean;
  sku: SiteFixSKU;
  entitlements: SiteFixEntitlement[];
  normalizedEmail: string;
  claimState: 'unclaimed' | 'claimed';
  claimedByUserId: string | null;
  claimedAt: Timestamp | null;
  createdAt: Timestamp;
}

/** Client-safe order summary returned by order-status API */
export interface SiteFixOrderStatusResponse {
  orderId: string;
  sku: SiteFixSKU;
  entitlements: SiteFixEntitlement[];
  status: 'paid' | 'cancelled' | 'refunded';
  createdAt: string;
  normalizedEmail?: string;
  firstName?: string;
  websiteUrl?: string;
  auditLeadId?: string;
}
