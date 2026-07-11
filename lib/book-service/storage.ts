import type { AuditResult } from '@/lib/types/audit';

/** sessionStorage key for audit → checkout handoff (auditLeadId never in URL) */
export const AUDIT_LEAD_ID_STORAGE_KEY = 'book-service:auditLeadId';

/** sessionStorage key for restoring audit results when returning from book-service */
export const AUDIT_SESSION_STORAGE_KEY = 'book-service:auditSession';

export type StoredAuditSession = {
  result: AuditResult;
  firstName: string;
};

export function storeAuditLeadId(auditLeadId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AUDIT_LEAD_ID_STORAGE_KEY, auditLeadId);
}

export function readAuditLeadId(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(AUDIT_LEAD_ID_STORAGE_KEY);
}

export function clearAuditLeadId(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUDIT_LEAD_ID_STORAGE_KEY);
}

export function storeAuditSession(session: StoredAuditSession): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(AUDIT_SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function readAuditSession(): StoredAuditSession | null {
  if (typeof window === 'undefined') return null;

  const raw = sessionStorage.getItem(AUDIT_SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'result' in parsed &&
      'firstName' in parsed &&
      typeof parsed.firstName === 'string' &&
      typeof parsed.result === 'object' &&
      parsed.result !== null
    ) {
      return parsed as StoredAuditSession;
    }
  } catch {
    return null;
  }

  return null;
}

export function clearAuditSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(AUDIT_SESSION_STORAGE_KEY);
}
