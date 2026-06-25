/** sessionStorage key for audit → checkout handoff (auditLeadId never in URL) */
export const AUDIT_LEAD_ID_STORAGE_KEY = 'book-service:auditLeadId';

export function storeAuditLeadId(auditLeadId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AUDIT_LEAD_ID_STORAGE_KEY, auditLeadId);
}

export function readAuditLeadId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(AUDIT_LEAD_ID_STORAGE_KEY);
}
