import { Timestamp } from 'firebase-admin/firestore';

import { SITE_FIX_SKUS, type SiteFixSKU } from '@/lib/book-service/skus';
import { adminDb } from '@/lib/firebase/admin';
import type { UnlinkedAuditLeadRecord } from '@/lib/types/admin-linking';

function toIsoDate(value: unknown): string {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(0).toISOString();
}

function resolveSkuLabel(sku: unknown): string {
  if (typeof sku === 'string' && sku in SITE_FIX_SKUS) {
    return SITE_FIX_SKUS[sku as SiteFixSKU].displayName;
  }

  return 'Unknown';
}

export async function listUnlinkedAuditLeadRecords(): Promise<UnlinkedAuditLeadRecord[]> {
  if (!adminDb) {
    return [];
  }

  const [ordersSnap, usersSnap] = await Promise.all([
    adminDb.collection('orders').where('auditLeadLinked', '==', false).get(),
    adminDb.collection('users').where('auditLeadLinked', '==', false).get(),
  ]);

  const orderRows: UnlinkedAuditLeadRecord[] = ordersSnap.docs.map((doc) => {
    const data = doc.data();

    return {
      type: 'order',
      recordId: doc.id,
      customerEmail:
        typeof data.normalizedEmail === 'string' ? data.normalizedEmail : '',
      sku: resolveSkuLabel(data.sku),
      createdAt: toIsoDate(data.createdAt),
      auditLeadId: typeof data.auditLeadId === 'string' ? data.auditLeadId : '',
    };
  });

  const userRows: UnlinkedAuditLeadRecord[] = usersSnap.docs.map((doc) => {
    const data = doc.data();
    const siteFix =
      data.siteFix && typeof data.siteFix === 'object'
        ? (data.siteFix as Record<string, unknown>)
        : {};

    const contactEmail =
      typeof siteFix.contactEmail === 'string' ? siteFix.contactEmail : '';
    const accountEmail = typeof data.email === 'string' ? data.email : '';

    return {
      type: 'account',
      recordId: doc.id,
      customerEmail: contactEmail || accountEmail,
      sku: null,
      createdAt: toIsoDate(siteFix.accountCreatedAt ?? data.createdAt),
      auditLeadId:
        typeof siteFix.auditLeadId === 'string' ? siteFix.auditLeadId : '',
    };
  });

  return [...orderRows, ...userRows].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
