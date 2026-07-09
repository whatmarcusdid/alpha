import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { decryptSecret } from '@/lib/book-service/encryption';
import { adminDb } from '@/lib/firebase/admin';
import {
  adminCredentialsLimiter,
  applyRateLimit,
  getRateLimitHeaders,
} from '@/lib/middleware/rateLimiting';
import { withAdmin } from '@/lib/middleware/apiHandler';
import type { RevealedSiteFixCredentials } from '@/lib/types/fix-session';

const credentialsBodySchema = z.object({
  uid: z.string().min(1),
});

export const POST = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = credentialsBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const rateLimitResult = await applyRateLimit(
    adminCredentialsLimiter,
    `admin-credentials:${context.userId}`
  );

  if (!rateLimitResult.success) {
    const headers = getRateLimitHeaders(rateLimitResult);
    return NextResponse.json(
      { error: 'Too many credential reveal requests. Please try again shortly.' },
      { status: 429, headers }
    );
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { uid } = parsed.data;
  const sessionId = params.fixJobId;

  const sessionSnap = await adminDb
    .collection('users')
    .doc(uid)
    .collection('fixSessions')
    .doc(sessionId)
    .get();

  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  const userSnap = await adminDb.collection('users').doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const siteFix = userSnap.data()?.siteFix as Record<string, unknown> | undefined;
  const accessRequest =
    siteFix?.access_request && typeof siteFix.access_request === 'object'
      ? (siteFix.access_request as Record<string, unknown>)
      : null;

  if (!accessRequest) {
    return NextResponse.json(
      { error: 'No credentials submitted for this job yet.' },
      { status: 404 }
    );
  }

  let password: string | null = null;
  const passwordEncrypted =
    typeof accessRequest.passwordEncrypted === 'string'
      ? accessRequest.passwordEncrypted
      : null;

  if (passwordEncrypted) {
    try {
      password = decryptSecret(passwordEncrypted);
    } catch {
      return NextResponse.json(
        { error: 'Unable to decrypt credentials. Contact engineering.' },
        { status: 500 }
      );
    }
  }

  const credentials: RevealedSiteFixCredentials = {
    method:
      typeof accessRequest.method === 'string' ? accessRequest.method : null,
    loginUrl:
      typeof accessRequest.loginUrl === 'string' ? accessRequest.loginUrl : null,
    username:
      typeof accessRequest.username === 'string' ? accessRequest.username : null,
    password,
    hostingProvider:
      typeof accessRequest.hostingProvider === 'string'
        ? accessRequest.hostingProvider
        : null,
    notes: typeof accessRequest.notes === 'string' ? accessRequest.notes : null,
  };

  void adminDb
    .collection('adminAuditLog')
    .add({
      adminUid: context.userId,
      sessionId,
      clientUid: uid,
      at: FieldValue.serverTimestamp(),
    })
    .catch((error) => {
      console.error('[credentials] failed to write adminAuditLog:', error);
    });

  return NextResponse.json({
    success: true,
    data: { credentials },
  });
});
