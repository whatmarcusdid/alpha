/**
 * Sends the payment confirmation email via Loops for Book Service Site Fix orders.
 * Uses LOOPS_SITE_FIX_PAYMENT_CONFIRMED_TEMPLATE_ID env var.
 */

const LOOPS_API_URL = 'https://app.loops.so/api/v1/transactional';

export async function sendSiteFixPaymentConfirmedEmail(params: {
  normalizedEmail: string;
  firstName: string;
  packageName: string;
  orderId: string;
  amount: number;
  signupUrl: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  const templateId = process.env.LOOPS_SITE_FIX_PAYMENT_CONFIRMED_TEMPLATE_ID;

  if (!apiKey) {
    console.warn('[Loops] LOOPS_API_KEY not set — skipping Site Fix payment email');
    return;
  }

  if (!templateId || templateId === 'PLACEHOLDER') {
    console.warn(
      '[Loops] LOOPS_SITE_FIX_PAYMENT_CONFIRMED_TEMPLATE_ID not configured — skipping Site Fix payment email'
    );
    return;
  }

  const response = await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: templateId,
      email: params.normalizedEmail,
      dataVariables: {
        firstName: params.firstName || 'there',
        packageName: params.packageName,
        orderId: params.orderId,
        amount: String(params.amount),
        signupUrl: params.signupUrl,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Loops API error ${response.status}: ${errorText}`);
  }
}

export async function sendSiteFixAccountCreatedEmail(params: {
  email: string;
  firstName: string;
  orderId: string;
  packageNames: string;
  confirmDetailsUrl: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  const templateId = process.env.LOOPS_SITE_FIX_ORDER_CONFIRMED_TEMPLATE_ID;

  if (!apiKey) {
    console.warn('[Loops] LOOPS_API_KEY not set — skipping Site Fix account created email');
    return;
  }

  if (!templateId || templateId === 'PLACEHOLDER') {
    console.warn(
      '[Loops] LOOPS_SITE_FIX_ORDER_CONFIRMED_TEMPLATE_ID not configured — skipping Site Fix account created email'
    );
    return;
  }

  const response = await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: templateId,
      email: params.email,
      dataVariables: {
        firstName: params.firstName || 'there',
        orderId: params.orderId,
        packageNames: params.packageNames,
        signupUrl: params.confirmDetailsUrl,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Loops API error ${response.status}: ${errorText}`);
  }
}

/** Called by hourly cron — see app/api/cron/send-access-reminders. */
export async function sendSiteFixAccessReminderEmail(params: {
  email: string;
  firstName: string;
  orderId: string;
  accessUrl: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  const templateId = process.env.LOOPS_SITE_FIX_ACCESS_REMINDER_TEMPLATE_ID;

  if (!apiKey) {
    console.warn('[Loops] LOOPS_API_KEY not set — skipping Site Fix access reminder email');
    return;
  }

  if (!templateId || templateId === 'PLACEHOLDER') {
    console.warn(
      '[Loops] LOOPS_SITE_FIX_ACCESS_REMINDER_TEMPLATE_ID not configured — skipping Site Fix access reminder email'
    );
    return;
  }

  const response = await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: templateId,
      email: params.email,
      dataVariables: {
        firstName: params.firstName || 'there',
        orderId: params.orderId,
        accessUrl: params.accessUrl,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Loops API error ${response.status}: ${errorText}`);
  }
}

export async function sendSiteFixDeliveryReadyEmail(params: {
  email: string;
  firstName: string;
  orderId: string;
  packageNames: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;
  const templateId = process.env.LOOPS_SITE_FIX_DELIVERY_READY_TEMPLATE_ID;

  if (!apiKey) {
    console.warn('[Loops] LOOPS_API_KEY not set — skipping Site Fix delivery ready email');
    return;
  }

  if (!templateId || templateId === 'PLACEHOLDER') {
    console.warn(
      '[Loops] LOOPS_SITE_FIX_DELIVERY_READY_TEMPLATE_ID not configured — skipping Site Fix delivery ready email'
    );
    return;
  }

  const response = await fetch(LOOPS_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      transactionalId: templateId,
      email: params.email,
      dataVariables: {
        firstName: params.firstName || 'there',
        orderId: params.orderId,
        packageNames: params.packageNames,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Loops API error ${response.status}: ${errorText}`);
  }
}

export async function sendDashboardInviteEmail(params: {
  email: string;
  orderId: string;
  dashboardUrl: string;
}): Promise<void> {
  const apiKey = process.env.LOOPS_API_KEY;

  if (!apiKey) {
    console.warn('[Loops] LOOPS_API_KEY not set — skipping dashboard invite email');
    return;
  }

  const response = await fetch('https://app.loops.so/api/v1/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: params.email,
      eventName: 'dashboard_invite',
      eventProperties: {
        orderId: params.orderId,
        dashboardUrl: params.dashboardUrl,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Loops API error ${response.status}: ${errorText}`);
  }
}
