import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildAfterAuditSnapshotFromPipeline,
  pillarSelectionFromEntitlements,
} from '@/lib/audit/buildAfterAuditSnapshot';
import { parseEntitlementsFromSiteFix } from '@/lib/fix-jobs/job-detail-utils';
import { runAuditPipeline } from '@/lib/audit/runAuditPipeline';
import { adminDb } from '@/lib/firebase/admin';
import { withAdmin } from '@/lib/middleware/apiHandler';
import {
  adminRerunChecksLimiter,
  applyRateLimit,
  getRateLimitHeaders,
} from '@/lib/middleware/rateLimiting';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { AfterAuditSnapshot, FixSessionDoc } from '@/lib/types/fix-session';

export const runtime = 'nodejs';
export const maxDuration = 60;

const rerunChecksSchema = z.object({
  uid: z.string().min(1),
});

export const POST = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const rateLimitResult = await applyRateLimit(
    adminRerunChecksLimiter,
    `admin-rerun-checks:${context.userId}`
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many re-run requests. Please try again shortly.' },
      { status: 429, headers: getRateLimitHeaders(rateLimitResult) }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = rerunChecksSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  if (!adminDb) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { uid } = parsed.data;
  const sessionId = params.fixJobId;

  const sessionRef = adminDb
    .collection('users')
    .doc(uid)
    .collection('fixSessions')
    .doc(sessionId);

  const [sessionSnap, userSnap] = await Promise.all([
    sessionRef.get(),
    adminDb.collection('users').doc(uid).get(),
  ]);

  if (!sessionSnap.exists) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  const session = sessionSnap.data() as FixSessionDoc;
  const auditLeadId = session.auditLeadId;

  if (!auditLeadId) {
    return NextResponse.json({ error: 'Audit lead not found' }, { status: 404 });
  }

  const auditSnap = await adminDb.collection('auditLeads').doc(auditLeadId).get();
  if (!auditSnap.exists) {
    return NextResponse.json({ error: 'Audit lead not found' }, { status: 404 });
  }

  const auditLead = auditSnap.data() as AuditLeadDoc;
  const websiteUrl = auditLead.websiteUrl;

  const siteFix =
    userSnap.exists && userSnap.data()?.siteFix && typeof userSnap.data()?.siteFix === 'object'
      ? (userSnap.data()?.siteFix as Record<string, unknown>)
      : undefined;

  const entitlements = parseEntitlementsFromSiteFix(siteFix);
  const pillarSelection = pillarSelectionFromEntitlements(entitlements);

  const pipeline = await runAuditPipeline(websiteUrl, pillarSelection);
  const afterAudit = buildAfterAuditSnapshotFromPipeline(pipeline, pillarSelection);

  await sessionRef.update({
    afterAudit,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const serializedAfterAudit: AfterAuditSnapshot = {
    capturedAt: afterAudit.capturedAt as AfterAuditSnapshot['capturedAt'],
    ...(afterAudit.speed ? { speed: afterAudit.speed } : {}),
    ...(afterAudit.security ? { security: afterAudit.security } : {}),
    ...(afterAudit.seo ? { seo: afterAudit.seo } : {}),
  };

  return NextResponse.json({
    success: true,
    data: {
      afterAudit: {
        capturedAt: new Date().toISOString(),
        ...(serializedAfterAudit.speed ? { speed: serializedAfterAudit.speed } : {}),
        ...(serializedAfterAudit.security
          ? { security: serializedAfterAudit.security }
          : {}),
        ...(serializedAfterAudit.seo ? { seo: serializedAfterAudit.seo } : {}),
      },
    },
  });
});
