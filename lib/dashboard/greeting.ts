/** First token of contactName — same source as siteFix.contactName from audit/signup (#38). */
export function extractContactFirstName(
  contactName: string | null | undefined
): string {
  if (typeof contactName !== 'string') {
    return '';
  }

  const trimmed = contactName.trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.split(/\s+/)[0] ?? '';
}

export function getTimeOfDayGreeting(date: Date = new Date()): string {
  const hour = date.getHours();

  if (hour < 12) {
    return 'Good morning';
  }

  if (hour < 17) {
    return 'Good afternoon';
  }

  return 'Good evening';
}

/** "Good morning, Marcus" when contactName present; otherwise time-of-day only. */
export function formatDashboardGreeting(
  contactName: string | null | undefined,
  date: Date = new Date()
): string {
  const greeting = getTimeOfDayGreeting(date);
  const firstName = extractContactFirstName(contactName);

  if (!firstName) {
    return greeting;
  }

  return `${greeting}, ${firstName}`;
}
