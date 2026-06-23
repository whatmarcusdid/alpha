export async function crawlPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; TradeSiteGenieBot/1.0; +https://tradesitegenie.com)',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`crawlPage failed: ${response.status} ${url}`);
  }

  return response.text();
}
