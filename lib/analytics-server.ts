/**
 * Server-side Mixpanel analytics — non-blocking HTTP API sends.
 * Uses the same NEXT_PUBLIC_MIXPANEL_TOKEN as lib/analytics.ts (browser).
 */

export const MIXPANEL_SERVER_EVENTS = [
  'Checkout_Completed',
  'Account_Created',
] as const;

export type MixpanelServerEvent = (typeof MIXPANEL_SERVER_EVENTS)[number];

const MIXPANEL_TRACK_URL = 'https://api.mixpanel.com/track';

async function postMixpanelPayload(payload: Record<string, unknown>[]): Promise<void> {
  const response = await fetch(MIXPANEL_TRACK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/plain',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Mixpanel request failed with status ${response.status}`);
  }
}

async function sendMixpanelTrackEvent(
  event: MixpanelServerEvent,
  distinctId: string,
  token: string,
  properties?: Record<string, unknown>
): Promise<void> {
  const eventProperties: Record<string, unknown> = {
    token,
    distinct_id: distinctId,
    time: Math.floor(Date.now() / 1000),
    ...properties,
  };

  // Simplified ID Merge: Checkout_Completed keys the orderId cluster via $device_id.
  if (event === 'Checkout_Completed') {
    eventProperties.$device_id = distinctId;
  }

  const payload = [
    {
      event,
      properties: eventProperties,
    },
  ];

  await postMixpanelPayload(payload);
}

export function trackServerEvent(
  event: MixpanelServerEvent,
  distinctId: string,
  properties?: Record<string, unknown>
): void {
  const token = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
  if (!token || !distinctId) return;

  void sendMixpanelTrackEvent(event, distinctId, token, properties).catch((err) =>
    console.warn(`[analytics-server] ${event} failed (non-blocking):`, err)
  );
}
