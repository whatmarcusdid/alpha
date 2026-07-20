import { describe, expect, it } from 'vitest';
import type { User } from 'firebase/auth';

import {
  getEmailVerificationActionCodeSettings,
  shouldSendSignupEmailVerification,
} from '@/lib/auth/email-verification';

describe('shouldSendSignupEmailVerification', () => {
  it('returns true for new email/password users', () => {
    const user = {
      emailVerified: false,
      providerData: [{ providerId: 'password' }],
    } as User;

    expect(shouldSendSignupEmailVerification(user)).toBe(true);
  });

  it('returns false when email is already verified', () => {
    const user = {
      emailVerified: true,
      providerData: [{ providerId: 'password' }],
    } as User;

    expect(shouldSendSignupEmailVerification(user)).toBe(false);
  });

  it('returns false for OAuth-only users (e.g. Google)', () => {
    const user = {
      emailVerified: true,
      providerData: [{ providerId: 'google.com' }],
    } as User;

    expect(shouldSendSignupEmailVerification(user)).toBe(false);
  });
});

describe('getEmailVerificationActionCodeSettings', () => {
  it('redirects verified users back to sign-in', () => {
    expect(getEmailVerificationActionCodeSettings('https://app.example.com')).toEqual({
      url: 'https://app.example.com/signin',
      handleCodeInApp: false,
    });
  });
});
