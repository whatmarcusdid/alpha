import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteFixJob,
  getFixJob,
  updateFixJob,
  type UpdateFixJobInput,
} from '@/lib/fix-jobs/firestore';
import { serializeFixJob } from '@/lib/fix-jobs/serialize';
import { withAdmin } from '@/lib/middleware/apiHandler';
import type { FixJobQA, FixJobTriage } from '@/lib/types/fix-job';

function parseTriageUpdate(
  triage: z.infer<typeof triageSchema> | undefined
): FixJobTriage | null | undefined {
  if (triage === undefined) {
    return undefined;
  }

  if (triage === null) {
    return null;
  }

  return {
    clientGoal: triage.clientGoal,
    complexity: triage.complexity,
    expectedTurnaround: triage.expectedTurnaround,
    internalNotes: triage.internalNotes,
    overviewEmailSentAt: triage.overviewEmailSentAt
      ? new Date(triage.overviewEmailSentAt)
      : null,
  };
}

const entitlementsSchema = z.object({
  speed: z.boolean(),
  security: z.boolean(),
  seo: z.boolean(),
});

const triageSchema = z
  .object({
    clientGoal: z.string().nullable(),
    complexity: z.enum(['Low', 'Medium', 'High']).nullable(),
    expectedTurnaround: z.string().nullable(),
    internalNotes: z.string().nullable(),
    overviewEmailSentAt: z.string().nullable().optional(),
  })
  .nullable();

const qaSchema = z
  .object({
    overallStatus: z.enum(['not_started', 'in_progress', 'passed', 'failed']),
    qaCompletedAt: z.string().nullable().optional(),
  })
  .nullable();

const patchFixJobSchema = z
  .object({
    linkedUserId: z.string().nullable().optional(),
    linkedAuditLeadId: z.string().nullable().optional(),
    linkedOrderId: z.string().nullable().optional(),
    entitlements: entitlementsSchema.optional(),
    stage: z
      .enum([
        'New',
        'Linking',
        'Triage',
        'ReadyToStart',
        'InProgress',
        'QA',
        'ReportReady',
        'Delivered',
      ])
      .optional(),
    status: z.enum(['not_started', 'in_progress', 'done']).optional(),
    triage: triageSchema.optional(),
    qa: qaSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

export const GET = withAdmin(async (_req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const job = await getFixJob(params.fixJobId);

  if (!job) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeFixJob(job),
  });
});

export const PATCH = withAdmin(async (req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const { fixJobId } = params;
  const body = await req.json().catch(() => null);
  const parsed = patchFixJobSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const updates: UpdateFixJobInput = {};

  if ('linkedUserId' in parsed.data) updates.linkedUserId = parsed.data.linkedUserId ?? null;
  if ('linkedAuditLeadId' in parsed.data) {
    updates.linkedAuditLeadId = parsed.data.linkedAuditLeadId ?? null;
  }
  if ('linkedOrderId' in parsed.data) updates.linkedOrderId = parsed.data.linkedOrderId ?? null;
  if (parsed.data.entitlements) updates.entitlements = parsed.data.entitlements;
  if (parsed.data.stage) updates.stage = parsed.data.stage;
  if (parsed.data.status) updates.status = parsed.data.status;
  if ('triage' in parsed.data) {
    updates.triage = parseTriageUpdate(parsed.data.triage) ?? null;
  }
  if ('qa' in parsed.data) {
    const qa = parsed.data.qa;
    if (qa === null) {
      updates.qa = null;
    } else if (qa) {
      const parsedQa: FixJobQA = {
        overallStatus: qa.overallStatus,
        qaCompletedAt: qa.qaCompletedAt ? new Date(qa.qaCompletedAt) : null,
      };
      updates.qa = parsedQa;
    }
  }

  const job = await updateFixJob(fixJobId, updates);

  if (!job) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: serializeFixJob(job),
  });
});

export const DELETE = withAdmin(async (_req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const deleted = await deleteFixJob(params.fixJobId);

  if (!deleted) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
});
