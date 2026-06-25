/** Frozen Site Fix onboarding status enum — safe for client and server. */

export const ONBOARDING_STATUS = {
  AWAITING_ACCESS: 'awaiting_access',
  DELIVERY_READY: 'delivery_ready',
} as const;

export type OnboardingStatus =
  (typeof ONBOARDING_STATUS)[keyof typeof ONBOARDING_STATUS];
