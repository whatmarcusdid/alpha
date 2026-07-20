import type { User } from 'firebase/auth';

export function shouldSendSignupEmailVerification(
  user: Pick<User, 'emailVerified' | 'providerData'>
): boolean {
  if (user.emailVerified) {
    return false;
  }

  return user.providerData.some((provider) => provider.providerId === 'password');
}

export function getEmailVerificationActionCodeSettings(origin: string): {
  url: string;
  handleCodeInApp: boolean;
} {
  return {
    url: `${origin}/signin`,
    handleCodeInApp: false,
  };
}
