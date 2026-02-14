/**
 * Mixpanel Analytics - TSG Dashboard
 *
 * CRITICAL: This file follows the browser-only initialization pattern.
 * - All Mixpanel imports wrapped in typeof window !== 'undefined' checks
 * - Uses require() pattern instead of ES6 imports
 * - Mixpanel only runs in the browser, never on the server
 *
 * Tracks user journeys for: Onboarding, Subscription Management, Support,
 * Feature Discovery, and Game Plan Call booking.
 *
 * SECURITY: Never include emails, passwords, card numbers, or other PII in events.
 */

// Base properties type for authenticated events
export interface AnalyticsBaseProperties {
  user_plan_tier?: string;
  [key: string]: string | number | boolean | undefined;
}

// Mixpanel instance (null on server)
let mixpanel: { init: (token: string) => void; track: (event: string, props?: Record<string, unknown>) => void; identify: (id: string) => void; people: { set: (props: Record<string, unknown>) => void } } | null = null;

// Initialize Mixpanel in browser only
if (typeof window !== 'undefined') {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (token) {
    try {
      const mixpanelModule = require('mixpanel-browser');
      // Access the default export first, then initialize
      mixpanel = mixpanelModule.default || mixpanelModule;

      mixpanel.init(token, {
        debug: process.env.NODE_ENV === 'development',
        track_pageview: false,
        persistence: 'localStorage',
        ignore_dnt: false,

        // Session Replay Configuration
        record_sessions_percent: 100, // Start at 100% for testing, reduce later
        record_mask_all_text: true, // Mask all text by default (privacy)
        record_mask_all_inputs: true, // Mask all inputs by default (privacy)
        record_block_selector: 'img, video', // Block images/videos from replay
        record_idle_timeout_ms: 1800000, // End replay after 30 min of inactivity
      });
    } catch (error) {
      console.error('⚠️ Mixpanel initialization error:', error);
    }
  } else {
    console.warn('⚠️ Mixpanel not initialized: NEXT_PUBLIC_MIXPANEL_TOKEN not set');
  }
}

/**
 * Helper to merge base properties with event-specific properties
 */
function withBaseProps(
  baseProps?: AnalyticsBaseProperties,
  eventProps?: Record<string, unknown>
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...eventProps };
  if (baseProps?.user_plan_tier) {
    merged.user_plan_tier = baseProps.user_plan_tier;
  }
  return merged;
}

/**
 * Identity Management - Call on user login/signup
 */
export function identifyUser(
  firebaseUID: string,
  userProperties?: { user_plan_tier?: string; [key: string]: string | number | boolean | undefined }
): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  try {
    mixpanel.identify(firebaseUID);
    if (userProperties && Object.keys(userProperties).length > 0) {
      setUserProperties(userProperties);
    }
  } catch (error) {
    console.warn('Mixpanel identify error:', error);
  }
}

/**
 * Update user properties (e.g. when subscription tier is loaded).
 * Call from pages that have subscription data to enrich Mixpanel profile.
 */
export function setUserProperties(
  userProperties: { user_plan_tier?: string; [key: string]: string | number | boolean | undefined }
): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  try {
    const safeProps: Record<string, unknown> = {};
    if (userProperties.user_plan_tier) safeProps.$plan_tier = userProperties.user_plan_tier;
    if (Object.keys(safeProps).length > 0) {
      mixpanel.people.set(safeProps);
    }
  } catch (error) {
    console.warn('Mixpanel setUserProperties error:', error);
  }
}

// =============================================================================
// ONBOARDING & ACTIVATION
// =============================================================================

/** Call when Stripe checkout completes. Use from success page redirect. For Stripe webhook (server-side), use Mixpanel HTTP API or mixpanel-node. */
export function trackCheckoutCompleted(props?: AnalyticsBaseProperties & { tier?: string; billing_cycle?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Checkout_Completed', withBaseProps(props, { tier: props?.tier, billing_cycle: props?.billing_cycle }));
}

/** Call when new user account is created */
export function trackAccountCreated(props?: AnalyticsBaseProperties & { tier?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Account_Created', withBaseProps(props, { tier: props?.tier }));
}

/** Call when user views dashboard home for the first time */
export function trackFirstDashboardViewed(props?: AnalyticsBaseProperties): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('First_Dashboard_Viewed', withBaseProps(props));
}

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

export function trackSubscriptionUpgraded(props?: AnalyticsBaseProperties & { previous_plan_tier?: string; new_plan_tier?: string; billing_period?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Subscription_Upgraded', withBaseProps(props, { previous_plan_tier: props?.previous_plan_tier, new_plan_tier: props?.new_plan_tier, billing_period: props?.billing_period }));
}

export function trackSubscriptionDowngraded(props?: AnalyticsBaseProperties & { previous_plan_tier?: string; new_plan_tier?: string; billing_period?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Subscription_Downgraded', withBaseProps(props, { previous_plan_tier: props?.previous_plan_tier, new_plan_tier: props?.new_plan_tier, billing_period: props?.billing_period }));
}

export function trackSubscriptionCancellationStarted(props?: AnalyticsBaseProperties & { previous_plan_tier?: string; cancellation_reason?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Subscription_Cancellation_Started', withBaseProps(props, { previous_plan_tier: props?.previous_plan_tier, cancellation_reason: props?.cancellation_reason }));
}

export function trackSubscriptionCanceled(props?: AnalyticsBaseProperties & { previous_plan_tier?: string; cancel_type?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Subscription_Canceled', withBaseProps(props, { previous_plan_tier: props?.previous_plan_tier, cancel_type: props?.cancel_type }));
}

export function trackSubscriptionReactivated(props?: AnalyticsBaseProperties & { new_plan_tier?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Subscription_Reactivated', withBaseProps(props, { new_plan_tier: props?.new_plan_tier }));
}

// =============================================================================
// SUPPORT & ENGAGEMENT
// =============================================================================

export function trackSupportTicketCreated(props?: AnalyticsBaseProperties & { ticket_priority?: string; ticket_category?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Support_Ticket_Created', withBaseProps(props, { ticket_priority: props?.ticket_priority, ticket_category: props?.ticket_category }));
}

export function trackSupportTicketResolved(props?: AnalyticsBaseProperties): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Support_Ticket_Resolved', withBaseProps(props));
}

export function trackSupportHoursViewed(props?: AnalyticsBaseProperties & { support_hours_remaining?: number }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Support_Hours_Viewed', withBaseProps(props, { support_hours_remaining: props?.support_hours_remaining }));
}

export function trackMonthlyReportViewed(props?: AnalyticsBaseProperties & { report_id?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Monthly_Report_Viewed', withBaseProps(props, { report_id: props?.report_id }));
}

// =============================================================================
// FEATURE DISCOVERY
// =============================================================================

export function trackDashboardViewed(props?: AnalyticsBaseProperties): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Dashboard_Viewed', withBaseProps(props));
}

export function trackFeatureTileClicked(props?: AnalyticsBaseProperties & { feature_name?: string; tile_id?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Feature_Tile_Clicked', withBaseProps(props, { feature_name: props?.feature_name, tile_id: props?.tile_id }));
}

export function trackBillingPageViewed(props?: AnalyticsBaseProperties): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Billing_Page_Viewed', withBaseProps(props));
}

export function trackSettingsPageViewed(props?: AnalyticsBaseProperties): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Settings_Page_Viewed', withBaseProps(props));
}

export function trackSiteMetricsViewed(props?: AnalyticsBaseProperties & { site_id?: string; feature_name?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Site_Metrics_Viewed', withBaseProps(props, { site_id: props?.site_id, feature_name: props?.feature_name }));
}

// =============================================================================
// GAME PLAN CALL
// =============================================================================

export function trackGamePlanCallLandingViewed(props?: AnalyticsBaseProperties & { lead_source?: string; booking_flow_type?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('GamePlanCall_Landing_Viewed', withBaseProps(props, { lead_source: props?.lead_source, booking_flow_type: props?.booking_flow_type }));
}

export function trackGamePlanCallScheduleSubmitted(props?: AnalyticsBaseProperties & { selected_datetime?: string; trade_type?: string; lead_source?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('GamePlanCall_Schedule_Submitted', withBaseProps(props, { selected_datetime: props?.selected_datetime, trade_type: props?.trade_type, lead_source: props?.lead_source }));
}

export function trackGamePlanCallConfirmationViewed(props?: AnalyticsBaseProperties & { booking_flow_type?: string }): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('GamePlanCall_Confirmation_Viewed', withBaseProps(props, { booking_flow_type: props?.booking_flow_type }));
}

// =============================================================================
// GENERIC & PASSWORD TRACKING
// =============================================================================

/** Generic track event function */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track(eventName, properties || {});
}

/** Password reset: user requested reset (email not included for privacy) */
export function trackPasswordResetRequested(_properties?: { email?: string } | string): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Password_Reset_Requested', {});
}

/** Password reset: email sent successfully */
export function trackPasswordResetEmailSent(properties?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  mixpanel.track('Password_Reset_Email_Sent', properties || {});
}

/** Password reset: request failed */
export function trackPasswordResetFailed(properties?: { error_type?: string } | string): void {
  if (typeof window === 'undefined' || !mixpanel) return;
  const props = typeof properties === 'string' ? { error_type: properties } : (properties || {});
  mixpanel.track('Password_Reset_Failed', props);
}
