import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { trackSiteFixServerEvent } from '@/lib/book-service/analytics-server';
import {
  AuthError,
  ClaimError,
  createUserWithSiteFixOrder,
} from '@/lib/book-service/createUser';
import { sendSiteFixAccountCreatedEmail } from '@/lib/book-service/emails';
import { formatEntitlementLabels } from '@/lib/book-service/entitlement-labels';
import type { SiteFixPendingOrder } from '@/lib/book-service/types';
import { warnIfBaseUrlLooksWrong } from '@/lib/book-service/validate-base-url';
import { sendInternalOpsNotification } from '@/lib/internal-ops-notification';
import {
  findGrowthOpsProspectByEmail,
  upsertAccountCreation,
} from '@/lib/notion-growth-ops';
import { getAppBaseUrl as resolveAppBaseUrl } from '@/lib/base-url';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { withRateLimit } from '@/lib/middleware/apiHandler';
import { bookServiceCreateAccountLimiter } from '@/lib/middleware/rateLimiting';

const createAccountSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  orderId: z.string().min(1),
});

function getAppBaseUrl(): string {
  warnIfBaseUrlLooksWrong();
  return resolveAppBaseUrl();
}

async function runSiteFixAccountGrowthOpsSideEffects(params: {
  normalizedEmail: string;
  orderId: string;
  pending: SiteFixPendingOrder;
  packageNames: string;
}): Promise<void> {
  const existing = await findGrowthOpsProspectByEmail(params.normalizedEmail);
  let businessName = existing.businessName ?? 'Unknown Business';
  let websiteUrl: string | undefined;

  if (adminDb && params.pending.auditLeadId) {
    const auditSnap = await adminDb
      .collection('auditLeads')
      .doc(params.pending.auditLeadId)
      .get();
    if (auditSnap.exists) {
      const auditData = auditSnap.data() as { businessName?: string; websiteUrl?: string };
      businessName = auditData.businessName ?? businessName;
      websiteUrl = auditData.websiteUrl;
    }
  }

  const notionResult = await upsertAccountCreation({
    email: params.normalizedEmail,
    businessName,
    websiteUrl,
    accountType: 'site_fix',
    productLabel: params.packageNames,
  });

  if (notionResult.success) {
    console.log(`[create-account] Growth Ops account upserted orderId=${params.orderId}`);
  } else {
    console.warn(
      `[create-account] Growth Ops account upsert failed orderId=${params.orderId}:`,
      notionResult.error
    );
  }

  await sendInternalOpsNotification({
    eventType: 'account_created',
    prospectEmail: params.normalizedEmail,
    businessName: notionResult.businessName ?? businessName,
    websiteUrl,
    details: `Site Fix — ${params.packageNames} | Order: ${params.orderId}`,
    notionPageUrl: notionResult.pageUrl,
  });
}

export const POST = withRateLimit(async (req: NextRequest) => {
  try {
    if (!adminDb || !adminAuth) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = createAccountSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }

    const { email, password, orderId } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const pendingSnap = await adminDb
      .collection('pending_orders')
      .doc(orderId)
      .get();

    if (!pendingSnap.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const pending = pendingSnap.data() as SiteFixPendingOrder;

    if (pending.claimState !== 'unclaimed') {
      return NextResponse.json(
        { error: 'This order has already been claimed' },
        { status: 409 }
      );
    }

    if (pending.normalizedEmail !== normalizedEmail) {
      return NextResponse.json(
        { error: 'Email does not match the order' },
        { status: 403 }
      );
    }

    const { uid } = await createUserWithSiteFixOrder({
      email: normalizedEmail,
      password,
      orderId,
    });

    const customToken = await adminAuth.createCustomToken(uid);

    const userSnap = await adminDb.collection('users').doc(uid).get();
    const siteFix = userSnap.data()?.siteFix;
    const firstName =
      typeof siteFix?.contactName === 'string' ? siteFix.contactName : '';
    const packageNames = formatEntitlementLabels(
      Array.isArray(siteFix?.purchasedPackages)
        ? siteFix.purchasedPackages
        : pending.entitlements
    );
    const confirmDetailsUrl = `${getAppBaseUrl()}/book-service/confirm-details?orderId=${encodeURIComponent(orderId)}`;

    void sendSiteFixAccountCreatedEmail({
      email: normalizedEmail,
      firstName,
      orderId,
      packageNames,
      confirmDetailsUrl,
    }).catch((err) =>
      console.error('[create-account] account created email failed:', err)
    );

    trackSiteFixServerEvent('site_fix_account_created', { userId: uid, orderId });

    void runSiteFixAccountGrowthOpsSideEffects({
      normalizedEmail,
      orderId,
      pending,
      packageNames,
    }).catch((err) =>
      console.error('[create-account] Growth Ops sync failed (non-blocking):', err)
    );

    return NextResponse.json({
      success: true,
      data: { customToken, uid, orderId },
    });
  } catch (error) {
    if (error instanceof ClaimError) {
      if (error.code === 'ORDER_NOT_FOUND') {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      return NextResponse.json(
        { error: 'This order has already been claimed' },
        { status: 409 }
      );
    }

    if (error instanceof AuthError && error.code === 'auth/email-already-exists') {
      return NextResponse.json(
        {
          error:
            'An account with this email already exists. Try signing in.',
        },
        { status: 409 }
      );
    }

    console.error('[book-service/create-account] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create account. Please try again.' },
      { status: 500 }
    );
  }
}, bookServiceCreateAccountLimiter);
