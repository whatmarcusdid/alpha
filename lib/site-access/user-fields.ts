import 'server-only';

export function resolveCustomerName(userData: Record<string, unknown>): string {
  const company =
    userData.company && typeof userData.company === 'object'
      ? (userData.company as Record<string, unknown>)
      : undefined;

  if (typeof userData.fullName === 'string' && userData.fullName.trim().length > 0) {
    return userData.fullName.trim();
  }

  if (typeof company?.legalName === 'string' && company.legalName.trim().length > 0) {
    return company.legalName.trim();
  }

  return 'Unknown customer';
}

export function resolveBusinessName(userData: Record<string, unknown>): string {
  const company =
    userData.company && typeof userData.company === 'object'
      ? (userData.company as Record<string, unknown>)
      : undefined;

  if (typeof company?.legalName === 'string' && company.legalName.trim().length > 0) {
    return company.legalName.trim();
  }

  return resolveCustomerName(userData);
}

export function resolveCustomerEmail(userData: Record<string, unknown>): string {
  return typeof userData.email === 'string' ? userData.email.trim() : '';
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000'
  );
}
