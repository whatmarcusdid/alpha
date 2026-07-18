import { readSafeResponseText, safeFetch } from '@/lib/security/safe-fetch';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; TradeSiteGenieBot/1.0; +https://tradesitegenie.com)';

export async function crawlPage(url: string): Promise<string> {
  const response = await safeFetch(url, {
    headers: {
      'User-Agent': DEFAULT_USER_AGENT,
    },
    timeoutMs: 10_000,
    maxResponseBytes: 5_000_000,
  });

  if (!response.ok) {
    throw new Error(`crawlPage failed: ${response.status} ${url}`);
  }

  return readSafeResponseText(response, 5_000_000);
}
