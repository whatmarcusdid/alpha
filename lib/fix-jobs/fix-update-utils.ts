export const FIX_UPDATE_DENYLIST = [
  'WP Rocket',
  'Perfmatters',
  'ShortPixel',
  'Sucuri',
  'MalCare',
  'Yoast',
  'Rank Math',
  'AIOSEO',
  'Asset CleanUp',
  'GTmetrix',
  'Query Monitor',
] as const;

export function findDeniedToolName(message: string): string | null {
  const matched = FIX_UPDATE_DENYLIST.find((term) =>
    message.toLowerCase().includes(term.toLowerCase())
  );

  return matched ?? null;
}

export function isCharacterCounterWarning(length: number): boolean {
  return length > 260;
}

export function isPostUpdateDisabled(length: number): boolean {
  return length === 0 || length > 280;
}

export function formatComposerTimestamp(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfUpdateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfUpdateDay.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dayDiff === 0) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) {
      return 'just now';
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }

    const hours = Math.floor(minutes / 60);
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  if (dayDiff === 1) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    ...(date.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}),
  }).format(date);
}
