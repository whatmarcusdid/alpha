import type { SecurityFlag } from '@/lib/types/audit';

export async function checkHttpsSecurity(
  websiteUrl: string
): Promise<SecurityFlag[]> {
  const flags: SecurityFlag[] = [];

  try {
    const parsedUrl = new URL(websiteUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpUrl = websiteUrl.replace(/^https?:\/\//, 'http://');
    const httpsUrl = websiteUrl.replace(/^https?:\/\//, 'https://');

    if (!isHttps) {
      try {
        const res = await fetch(httpUrl, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
        });
        const finalUrl = res.url;
        if (!finalUrl.startsWith('https://')) {
          flags.push('no_https');
        }
      } catch {
        flags.push('no_https');
      }
    }

    if (!flags.includes('no_https')) {
      try {
        await fetch(httpsUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(8000),
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '';
        const sslErrors = [
          'CERT_HAS_EXPIRED',
          'ERR_CERT_AUTHORITY_INVALID',
          'SELF_SIGNED_CERT',
          'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
          'certificate',
        ];
        if (sslErrors.some((e) => msg.includes(e))) {
          flags.push('invalid_ssl');
        }
      }
    }

    if (!flags.includes('no_https')) {
      try {
        const res = await fetch(httpUrl, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
        });
        if (!res.url.startsWith('https://')) {
          flags.push('http_redirect_missing');
        }
      } catch {
        // If HTTP fetch fails, skip this check
      }
    }

    if (isHttps || !flags.includes('no_https')) {
      try {
        const res = await fetch(httpsUrl, {
          signal: AbortSignal.timeout(10000),
        });
        const html = await res.text();
        const mixedContentPattern = /(?:src|href)=["']http:\/\/[^"']+["']/gi;
        if (mixedContentPattern.test(html)) {
          flags.push('mixed_content');
        }
      } catch {
        // If HTTPS fetch fails, skip mixed content check
      }
    }
  } catch (err) {
    console.error('[audit] checkHttpsSecurity failed:', err);
    return [];
  }

  return flags;
}
