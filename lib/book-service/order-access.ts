import { normalizeEmail } from '@/lib/stripe/authenticated-email';

type OrderEmailSource = {
  normalizedEmail?: unknown;
};

type AuditLeadEmailSource = {
  email?: unknown;
};

export function resolveOrderOwnerEmail(
  order: OrderEmailSource,
  auditLead?: AuditLeadEmailSource | null
): string | null {
  if (typeof order.normalizedEmail === 'string' && order.normalizedEmail.trim()) {
    return normalizeEmail(order.normalizedEmail);
  }

  if (typeof auditLead?.email === 'string' && auditLead.email.trim()) {
    return normalizeEmail(auditLead.email);
  }

  return null;
}
