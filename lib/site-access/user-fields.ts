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

export function resolveSiteUrl(userData: Record<string, unknown>): string {
  const company =
    userData.company && typeof userData.company === 'object'
      ? (userData.company as Record<string, unknown>)
      : undefined;
  const siteFix =
    userData.siteFix && typeof userData.siteFix === 'object'
      ? (userData.siteFix as Record<string, unknown>)
      : undefined;

  if (typeof company?.websiteUrl === 'string' && company.websiteUrl.trim().length > 0) {
    return company.websiteUrl.trim();
  }

  if (typeof siteFix?.websiteUrl === 'string' && siteFix.websiteUrl.trim().length > 0) {
    return siteFix.websiteUrl.trim();
  }

  return '';
}

export function resolveFirstName(userData: Record<string, unknown>): string {
  const fullName = resolveCustomerName(userData);
  const first = fullName.trim().split(/\s+/)[0];
  return first || 'there';
}
