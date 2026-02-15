/**
 * Format amount in cents to currency string
 * @param amountInCents - Amount in cents (e.g., 89900 for $899.00)
 * @returns Formatted string (e.g., "$899.00")
 */
export function formatCurrency(amountInCents: number): string {
  const dollars = amountInCents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Format Unix timestamp to date string
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted date (e.g., "January 15, 2026")
 */
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format Unix timestamp to date and time string in ET
 * @param timestamp - Unix timestamp in seconds
 * @returns Formatted datetime (e.g., "January 15, 2026 at 3:42 PM ET")
 */
export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const formatted = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }).format(date);
  return `${formatted} ET`;
}
