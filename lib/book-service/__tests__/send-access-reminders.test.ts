import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ACCESS_REMINDER_INTERVAL_MS,
  evaluateAccessReminderEligibility,
  MAX_ACCESS_REMINDERS,
} from '@/lib/book-service/send-access-reminders';

const HOUR_MS = 60 * 60 * 1000;
const BASE_MS = Date.parse('2026-07-01T12:00:00.000Z');

function baseInput(
  overrides: Partial<Parameters<typeof evaluateAccessReminderEligibility>[0]> = {}
) {
  return {
    nowMs: BASE_MS + 24 * HOUR_MS,
    orderCreatedAtMs: BASE_MS,
    lastAccessReminderSentAtMs: null,
    accessReminderCount: 0,
    onboardingStatus: 'awaiting_access',
    accessRequestStatus: null,
    accessSubmittedAt: false,
    sessionStage: 'awaiting_access' as const,
    orderStatus: 'paid' as const,
    ...overrides,
  };
}

describe('evaluateAccessReminderEligibility', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('sends the first reminder at 24h after order creation', () => {
    const result = evaluateAccessReminderEligibility(
      baseInput({ nowMs: BASE_MS + 24 * HOUR_MS })
    );

    expect(result).toEqual({ eligible: true });
  });

  it('does not send before 24h has elapsed', () => {
    const result = evaluateAccessReminderEligibility(
      baseInput({ nowMs: BASE_MS + 23 * HOUR_MS })
    );

    expect(result).toEqual({ eligible: false, reason: 'too_soon' });
  });

  it('sends the second reminder at 48h (24h after the first reminder)', () => {
    const result = evaluateAccessReminderEligibility(
      baseInput({
        nowMs: BASE_MS + 48 * HOUR_MS,
        accessReminderCount: 1,
        lastAccessReminderSentAtMs: BASE_MS + 24 * HOUR_MS,
      })
    );

    expect(result).toEqual({ eligible: true });
  });

  it('sends the third reminder at 72h (24h after the second reminder)', () => {
    const result = evaluateAccessReminderEligibility(
      baseInput({
        nowMs: BASE_MS + 72 * HOUR_MS,
        accessReminderCount: 2,
        lastAccessReminderSentAtMs: BASE_MS + 48 * HOUR_MS,
      })
    );

    expect(result).toEqual({ eligible: true });
  });

  it('never sends a fourth reminder', () => {
    const result = evaluateAccessReminderEligibility(
      baseInput({
        nowMs: BASE_MS + 96 * HOUR_MS,
        accessReminderCount: MAX_ACCESS_REMINDERS,
        lastAccessReminderSentAtMs: BASE_MS + 72 * HOUR_MS,
      })
    );

    expect(result).toEqual({ eligible: false, reason: 'max_reminders_reached' });
  });

  it('stops when access is submitted mid-sequence', () => {
    const result = evaluateAccessReminderEligibility(
      baseInput({
        accessRequestStatus: 'submitted',
        accessSubmittedAt: true,
      })
    );

    expect(result).toEqual({ eligible: false, reason: 'access_submitted' });
  });

  it('stops when onboarding leaves awaiting_access', () => {
    const result = evaluateAccessReminderEligibility(
      baseInput({ onboardingStatus: 'delivery_ready' })
    );

    expect(result).toEqual({ eligible: false, reason: 'not_awaiting_access' });
  });

  it('stops when fix session stage leaves awaiting_access', () => {
    const result = evaluateAccessReminderEligibility(
      baseInput({ sessionStage: 'ready' })
    );

    expect(result).toEqual({ eligible: false, reason: 'not_awaiting_access' });
  });

  it('stops when the order is cancelled', () => {
    const result = evaluateAccessReminderEligibility(
      baseInput({ orderStatus: 'cancelled' })
    );

    expect(result).toEqual({ eligible: false, reason: 'order_inactive' });
  });

  it('stops when the order is refunded', () => {
    const result = evaluateAccessReminderEligibility(
      baseInput({ orderStatus: 'refunded' })
    );

    expect(result).toEqual({ eligible: false, reason: 'order_inactive' });
  });

  it('prevents double-send within the same 24h window via lastAccessReminderSentAt', () => {
    const lastSent = BASE_MS + 24 * HOUR_MS;

    const result = evaluateAccessReminderEligibility(
      baseInput({
        nowMs: lastSent + ACCESS_REMINDER_INTERVAL_MS - 1,
        accessReminderCount: 1,
        lastAccessReminderSentAtMs: lastSent,
      })
    );

    expect(result).toEqual({ eligible: false, reason: 'too_soon' });
  });
});
