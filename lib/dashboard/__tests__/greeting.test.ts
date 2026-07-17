import { describe, expect, it } from 'vitest';

import {
  extractContactFirstName,
  formatDashboardGreeting,
  getTimeOfDayGreeting,
} from '@/lib/dashboard/greeting';

describe('getTimeOfDayGreeting', () => {
  it('returns Good morning before noon', () => {
    expect(getTimeOfDayGreeting(new Date('2026-07-17T09:00:00'))).toBe('Good morning');
  });

  it('returns Good afternoon before 5pm', () => {
    expect(getTimeOfDayGreeting(new Date('2026-07-17T14:00:00'))).toBe('Good afternoon');
  });

  it('returns Good evening after 5pm', () => {
    expect(getTimeOfDayGreeting(new Date('2026-07-17T18:00:00'))).toBe('Good evening');
  });
});

describe('extractContactFirstName', () => {
  it('returns the first token from contactName', () => {
    expect(extractContactFirstName('Marcus White')).toBe('Marcus');
  });

  it('returns empty string for blank values', () => {
    expect(extractContactFirstName('')).toBe('');
    expect(extractContactFirstName('   ')).toBe('');
    expect(extractContactFirstName(null)).toBe('');
  });
});

describe('formatDashboardGreeting', () => {
  const morning = new Date('2026-07-17T09:00:00');

  it('includes first name when contactName is present', () => {
    expect(formatDashboardGreeting('Mike', morning)).toBe('Good morning, Mike');
  });

  it('uses only the first token when contactName has multiple words', () => {
    expect(formatDashboardGreeting('Mike Johnson', morning)).toBe('Good morning, Mike');
  });

  it('falls back to generic greeting when contactName is missing', () => {
    expect(formatDashboardGreeting('', morning)).toBe('Good morning');
    expect(formatDashboardGreeting(undefined, morning)).toBe('Good morning');
  });
});
