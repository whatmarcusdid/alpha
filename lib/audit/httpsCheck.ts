import type { SecurityFlag } from '@/lib/types/audit';
import {
  assertSafeUrl,
  isSafeFetchError,
  readSafeResponseText,
  safeFetch,
} from '@/lib/security/safe-fetch';

export async function checkHttpsSecurity(
  websiteUrl: string
): Promise<SecurityFlag[]> {
  const flags: SecurityFlag[] = [];

  try {
    await assertSafeUrl(websiteUrl);
  } catch (err) {
    if (isSafeFetchError(err)) {
      return [];
    }
    throw err;
  }

  try {
    const parsedUrl = new URL(websiteUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpUrl = websiteUrl.replace(/^https?:\/\//, 'http://');
    const httpsUrl = websiteUrl.replace(/^https?:\/\//, 'https://');

    if (!isHttps) {
      try {
        const res = await safeFetch(httpUrl, {
          method: 'HEAD',
          followRedirects: true,
          timeoutMs: 8_000,
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
        await safeFetch(httpsUrl, {
          method: 'HEAD',
          followRedirects: false,
          timeoutMs: 8_000,
        });
      } catch (err: unknown) {
        if (isSafeFetchError(err)) {
          // Blocked or invalid URLs should not produce SSL flags.
          return flags;
        }

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
        const res = await safeFetch(httpUrl, {
          method: 'HEAD',
          followRedirects: true,
          timeoutMs: 8_000,
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
        const res = await safeFetch(httpsUrl, {
          timeoutMs: 10_000,
          maxResponseBytes: 2_000_000,
        });
        const html = await readSafeResponseText(res, 2_000_000);
        const mixedContentPattern = /(?:src|href)=["']http:\/\/[^"']+["']/gi;
        if (mixedContentPattern.test(html)) {
          flags.push('mixed_content');
        }
      } catch {
        // If HTTPS fetch fails, skip mixed content check
      }
    }
  } catch (err) {
    if (isSafeFetchError(err)) {
      return flags;
    }

    console.error('[audit] checkHttpsSecurity failed:', err);
    return [];
  }

  return flags;
}
