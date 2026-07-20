/**
 * Internal ops email notifications to support@bookservice.tech
 * for prospect lifecycle events (audit, purchase, account creation).
 */

import type { LoopsEmailResult } from '@/lib/loops';

const INTERNAL_OPS_EMAIL = 'support@bookservice.tech';
const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';

export type InternalOpsEventType =
  | 'audit_completed'
  | 'purchase_completed'
  | 'account_created';

const EVENT_LABELS: Record<InternalOpsEventType, string> = {
  audit_completed: 'Audit Completed',
  purchase_completed: 'Purchase Completed',
  account_created: 'Account Created',
};

export interface InternalOpsNotificationParams {
  eventType: InternalOpsEventType;
  prospectEmail: string;
  businessName?: string;
  websiteUrl?: string;
  details?: string;
  notionPageUrl?: string;
}

export async function sendInternalOpsNotification(
  params: InternalOpsNotificationParams
): Promise<LoopsEmailResult> {
  const apiKey = process.env.LOOPS_API_KEY;
  const templateId = process.env.LOOPS_INTERNAL_OPS_NOTIFICATION_TEMPLATE_ID;

  if (!apiKey) {
    console.warn('[Internal Ops] LOOPS_API_KEY not set — skipping email');
    return { success: false, error: 'LOOPS_API_KEY not configured' };
  }

  if (!templateId || templateId === 'PLACEHOLDER') {
    console.warn(
      '[Internal Ops] LOOPS_INTERNAL_OPS_NOTIFICATION_TEMPLATE_ID not set — skipping email'
    );
    return {
      success: false,
      error: 'LOOPS_INTERNAL_OPS_NOTIFICATION_TEMPLATE_ID not configured',
    };
  }

  const eventLabel = EVENT_LABELS[params.eventType];

  try {
    const response = await fetch(LOOPS_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionalId: templateId,
        email: INTERNAL_OPS_EMAIL,
        dataVariables: {
          eventType: eventLabel,
          prospectEmail: params.prospectEmail,
          businessName: params.businessName ?? 'Unknown Business',
          websiteUrl: params.websiteUrl ?? '',
          details: params.details ?? '',
          notionPageUrl: params.notionPageUrl ?? '',
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Internal Ops] Loops API error:', response.status, errorText);
      return { success: false, error: errorText };
    }

    console.log('[Internal Ops] Notification sent:', eventLabel, params.prospectEmail);
    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Internal Ops] Email failed:', message);
    return { success: false, error: message };
  }
}
