/**
 * Safely convert various timestamp formats to Unix seconds
 */
function toUnixSeconds(timestamp: unknown): number {
  if (typeof timestamp === 'number') {
    // If it's already a number, check if it's in milliseconds or seconds
    // Timestamps after year 2001 in seconds are > 1_000_000_000
    // Timestamps in milliseconds are > 1_000_000_000_000
    if (timestamp > 1_000_000_000_000) {
      return Math.floor(timestamp / 1000);
    }
    return Math.floor(timestamp);
  }

  if (typeof timestamp === 'string') {
    const parsed = Date.parse(timestamp);
    if (!isNaN(parsed)) {
      return Math.floor(parsed / 1000);
    }
  }

  // Handle Firestore Timestamp objects
  if (timestamp && typeof timestamp === 'object') {
    if ('seconds' in timestamp && typeof (timestamp as any).seconds === 'number') {
      return (timestamp as any).seconds;
    }
    if ('_seconds' in timestamp && typeof (timestamp as any)._seconds === 'number') {
      return (timestamp as any)._seconds;
    }
    if (timestamp instanceof Date) {
      return Math.floor(timestamp.getTime() / 1000);
    }
  }

  // Fallback to current time if invalid
  console.warn('Invalid timestamp received:', timestamp);
  return Math.floor(Date.now() / 1000);
}

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
 * Format timestamp to date string
 * @param timestamp - Unix timestamp in seconds, milliseconds, Date object, or Firestore Timestamp
 * @returns Formatted date (e.g., "January 15, 2026")
 */
export function formatDate(timestamp: unknown): string {
  const seconds = toUnixSeconds(timestamp);
  const date = new Date(seconds * 1000);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * Format timestamp to date and time string in ET
 * @param timestamp - Unix timestamp in seconds, milliseconds, Date object, or Firestore Timestamp
 * @returns Formatted datetime (e.g., "January 15, 2026 at 3:42 PM ET")
 */
export function formatDateTime(timestamp: unknown): string {
  const seconds = toUnixSeconds(timestamp);
  const date = new Date(seconds * 1000);
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
