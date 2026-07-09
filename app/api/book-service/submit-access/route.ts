import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { z } from 'zod';

import { trackSiteFixServerEvent } from '@/lib/book-service/analytics-server';
import type { SiteFixUserNamespace } from '@/lib/book-service/createUser';
import { encryptSecret } from '@/lib/book-service/encryption';
import { sendSiteFixDeliveryReadyEmail } from '@/lib/book-service/emails';
import { formatEntitlementLabels } from '@/lib/book-service/entitlement-labels';
import { transitionToDeliveryReady } from '@/lib/book-service/onboarding';
import { transitionAwaitingAccessToReady } from '@/lib/fix-jobs/patch-fix-session-stage';
import { adminDb } from '@/lib/firebase/admin';
import { withAuth } from '@/lib/middleware/apiHandler';

const submitAccessSchema = z
  .object({
    orderId: z.string().min(1),
    partial: z.boolean().default(false),
    accessMethod: z.string().optional(),
    loginUrl: z.string().url().optional(),
    username: z.string().optional(),
    password: z.string().optional(),
    hostingProvider: z.string().optional(),
    notes: z.string().max(2000).optional(),
    confirmed: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.partial) return;

    if (!data.accessMethod?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Access method is required',
        path: ['accessMethod'],
      });
    }
    if (!data.loginUrl?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Login URL is required',
        path: ['loginUrl'],
      });
    }
    if (!data.username?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Username is required',
        path: ['username'],
      });
    }
    if (!data.password?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'Password is required',
        path: ['password'],
      });
    }
    if (!data.confirmed) {
      ctx.addIssue({
        code: 'custom',
        message: 'Confirmation is required',
        path: ['confirmed'],
      });
    }
  });

export const POST = withAuth(async (req: NextRequest, { userId }) => {
  try {
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const parsed = submitAccessSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }

    const {
      orderId,
      partial,
      accessMethod,
      loginUrl,
      username,
      password,
      hostingProvider,
      notes,
    } = parsed.data;

    const userRef = adminDb.collection('users').doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const siteFix = userSnap.data()?.siteFix as SiteFixUserNamespace | undefined;

    if (!siteFix || siteFix.orderId !== orderId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let passwordEncrypted: string | null = null;
    if (password?.trim()) {
      passwordEncrypted = encryptSecret(password);
    }

    const accessRequest: Record<string, unknown> = {
      method: accessMethod?.trim() ?? null,
      loginUrl: loginUrl?.trim() ?? null,
      username: username?.trim() ?? null,
      passwordEncrypted,
      hostingProvider: hostingProvider?.trim() ?? null,
      notes: notes?.trim() ?? null,
      status: partial ? 'partial' : 'submitted',
      submittedAt: partial ? null : FieldValue.serverTimestamp(),
    };

    await userRef.update({
      'siteFix.access_request': accessRequest,
    });

    if (!partial) {
      await transitionToDeliveryReady(userId);
      await transitionAwaitingAccessToReady({
        uid: userId,
        sessionId: orderId,
      });

      const packageNames = formatEntitlementLabels(
        siteFix.purchasedPackages ?? []
      );
      const contactEmail =
        typeof siteFix.contactEmail === 'string'
          ? siteFix.contactEmail
          : '';
      const firstName =
        typeof siteFix.contactName === 'string' ? siteFix.contactName : '';

      void sendSiteFixDeliveryReadyEmail({
        email: contactEmail,
        firstName,
        orderId,
        packageNames,
      }).catch((err) =>
        console.error('[submit-access] delivery ready email failed:', err)
      );

      trackSiteFixServerEvent('site_fix_delivery_ready', { userId, orderId });
    }

    trackSiteFixServerEvent('site_fix_access_submitted', { userId, orderId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[book-service/submit-access] Error:', error);
    return NextResponse.json(
      { error: 'Failed to submit access. Please try again.' },
      { status: 500 }
    );
  }
});
