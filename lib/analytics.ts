/**
 * Analytics Helper Functions
 * 
 * Tracks key user events for analytics platforms (Google Analytics, etc.)
 * All events are safely wrapped to only execute in browser context.
 */

type AnalyticsEvent = 
  | 'password_reset_requested'
  | 'password_reset_email_sent'
  | 'password_reset_failed'
  | 'password_reset_completed'
  | 'password_changed'
  | 'password_change_failed'
  | 'password_change_initiated'
  | 'password_change_success';

interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Tracks an analytics event
 * @param eventName - Name of the event to track
 * @param params - Optional parameters to include with the event
 */
export function trackEvent(eventName: AnalyticsEvent, params?: EventParams): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // Google Analytics 4
    if ((window as any).gtag) {
      (window as any).gtag('event', eventName, params);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics Event:', eventName, params);
    }
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

/**
 * Track password reset request
 */
export function trackPasswordResetRequested(method: string = 'email'): void {
  trackEvent('password_reset_requested', { method });
}

/**
 * Track password reset email sent successfully
 */
export function trackPasswordResetEmailSent(): void {
  trackEvent('password_reset_email_sent');
}

/**
 * Track password reset failure
 */
export function trackPasswordResetFailed(errorMessage: string): void {
  trackEvent('password_reset_failed', { error_message: errorMessage });
}

/**
 * Track successful password reset completion
 */
export function trackPasswordResetCompleted(): void {
  trackEvent('password_reset_completed');
}

/**
 * Track password change in profile
 */
export function trackPasswordChanged(): void {
  trackEvent('password_changed');
}

/**
 * Track password change failure
 */
export function trackPasswordChangeFailed(errorMessage: string): void {
  trackEvent('password_change_failed', { error_message: errorMessage });
}
