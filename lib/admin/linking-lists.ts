import { Timestamp } from 'firebase-admin/firestore';

import { adminDb } from '@/lib/firebase/admin';
import { SITE_FIX_SKUS, type SiteFixSKU } from '@/lib/book-service/skus';
import type {
  AdminAuditLeadListItem,
  AdminClientListItem,
  AdminOrderListItem,
} from '@/lib/types/admin-linking';

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(0).toISOString();
}

function formatDisplaySuffix(id: string, prefix: string): string {
  const suffix = id.replace(/-/g, '').slice(-4).toUpperCase();
  return `${prefix}-${suffix.padStart(4, '0')}`;
}

export async function listAdminClients(): Promise<AdminClientListItem[]> {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb.collection('users').get();

  return snapshot.docs
    .map((doc) => {
      const data = doc.data();
      const company =
        data.company && typeof data.company === 'object'
          ? (data.company as Record<string, unknown>)
          : {};

      const businessName =
        typeof company.legalName === 'string' && company.legalName.length > 0
          ? company.legalName
          : typeof data.fullName === 'string'
            ? data.fullName
            : 'Unknown business';

      const websiteUrl =
        typeof company.websiteUrl === 'string' && company.websiteUrl.length > 0
          ? company.websiteUrl
          : null;

      const industry =
        typeof company.businessService === 'string' && company.businessService.length > 0
          ? company.businessService
          : null;

      return {
        userId: doc.id,
        businessName,
        contactName: typeof data.fullName === 'string' ? data.fullName : '',
        websiteUrl,
        industry,
        email: typeof data.email === 'string' ? data.email : '',
      };
    })
    .filter((client) => client.email.length > 0 || client.businessName.length > 0)
    .sort((a, b) => a.businessName.localeCompare(b.businessName));
}

export async function listAdminAuditLeads(): Promise<AdminAuditLeadListItem[]> {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb.collection('auditLeads').orderBy('timestamp', 'desc').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      auditLeadId: doc.id,
      displayId: formatDisplaySuffix(doc.id, 'GSA'),
      websiteUrl: typeof data.websiteUrl === 'string' ? data.websiteUrl : '',
      email: typeof data.email === 'string' ? data.email : '',
      businessName: typeof data.businessName === 'string' ? data.businessName : '',
      timestamp: toIsoDate(data.timestamp),
    };
  });
}

export async function listAdminOrders(): Promise<AdminOrderListItem[]> {
  if (!adminDb) {
    return [];
  }

  const snapshot = await adminDb.collection('orders').orderBy('createdAt', 'desc').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const sku = data.sku as SiteFixSKU | undefined;
    const skuDescription =
      sku && sku in SITE_FIX_SKUS ? SITE_FIX_SKUS[sku].displayName : 'Site Fix order';
    const amount = sku && sku in SITE_FIX_SKUS ? SITE_FIX_SKUS[sku].price : null;

    return {
      orderId: doc.id,
      displayId: formatDisplaySuffix(doc.id, 'ORD'),
      skuDescription,
      amount,
      normalizedEmail:
        typeof data.normalizedEmail === 'string' ? data.normalizedEmail : '',
      timestamp: toIsoDate(data.createdAt),
    };
  });
}

export async function getAdminClient(userId: string): Promise<AdminClientListItem | null> {
  const clients = await listAdminClients();
  return clients.find((client) => client.userId === userId) ?? null;
}

export async function getAdminAuditLead(
  auditLeadId: string
): Promise<AdminAuditLeadListItem | null> {
  const leads = await listAdminAuditLeads();
  return leads.find((lead) => lead.auditLeadId === auditLeadId) ?? null;
}

export async function getAdminOrder(orderId: string): Promise<AdminOrderListItem | null> {
  const orders = await listAdminOrders();
  return orders.find((order) => order.orderId === orderId) ?? null;
}
