export type AdminClientListItem = {
  userId: string;
  businessName: string;
  contactName: string;
  websiteUrl: string | null;
  industry: string | null;
  email: string;
};

export type AdminAuditLeadListItem = {
  auditLeadId: string;
  displayId: string;
  websiteUrl: string;
  email: string;
  businessName: string;
  timestamp: string;
};

export type AdminOrderListItem = {
  orderId: string;
  displayId: string;
  skuDescription: string;
  amount: number | null;
  normalizedEmail: string;
  timestamp: string;
};

export type UnlinkedAuditLeadRecordType = 'order' | 'account';

export type UnlinkedAuditLeadRecord = {
  type: UnlinkedAuditLeadRecordType;
  /** orderId for order rows; userId for account rows */
  recordId: string;
  customerEmail: string;
  /** Human-readable SKU name for orders; null for account-only rows */
  sku: string | null;
  createdAt: string;
  auditLeadId: string;
};
