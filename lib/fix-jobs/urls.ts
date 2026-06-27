export function normalizeWebsiteUrl(url: string): string {
  const trimmed = url.trim();

  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    const path = parsed.pathname.replace(/\/$/, '') || '';
    return `${host}${path}`;
  } catch {
    const withoutProtocol = trimmed.replace(/^https?:\/\//i, '');
    const host = withoutProtocol.split('/')[0]?.replace(/^www\./i, '').toLowerCase() ?? '';
    return host;
  }
}

export function isValidHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function toExternalHref(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}
