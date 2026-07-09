import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  createFixJob,
  findActiveFixJobByWebsiteUrl,
} from '@/lib/fix-jobs/firestore';
import {
  assertFixJobListItemSanitized,
  listFixSessionsForAdmin,
} from '@/lib/fix-jobs/list-fix-sessions';
import { serializeFixJob } from '@/lib/fix-jobs/serialize';
import { isValidHttpUrl } from '@/lib/fix-jobs/urls';
import { withAdmin } from '@/lib/middleware/apiHandler';
import { FixJobsListQuerySchema } from '@/lib/validation/fix-session';

const createFixJobSchema = z.object({
  businessName: z.string().min(1).max(128),
  primaryWebsiteUrl: z
    .string()
    .min(1)
    .max(512)
    .refine((value) => isValidHttpUrl(value), {
      message: 'URL must start with http:// or https://',
    }),
});

export const GET = withAdmin(async (req: NextRequest) => {
  const parsed = FixJobsListQuerySchema.safeParse(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid query parameters' },
      { status: 400 }
    );
  }

  const { stage, limit, cursor } = parsed.data;

  const result = await listFixSessionsForAdmin({
    stage,
    limit,
    cursor,
  });

  const jobs = result.jobs.map((job) => assertFixJobListItemSanitized(job));

  return NextResponse.json({
    success: true,
    data: {
      jobs,
      ...(result.nextCursor ? { nextCursor: result.nextCursor } : {}),
    },
  });
});

export const POST = withAdmin(async (req: NextRequest) => {
  const body = await req.json().catch(() => null);
  const parsed = createFixJobSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
      { status: 400 }
    );
  }

  const duplicate = await findActiveFixJobByWebsiteUrl(parsed.data.primaryWebsiteUrl);
  const job = await createFixJob(parsed.data);

  return NextResponse.json({
    success: true,
    data: {
      fixJobId: job.id,
      displayId: job.displayId,
      job: serializeFixJob(job),
    },
    duplicateWarning: duplicate
      ? {
          displayId: duplicate.displayId,
          fixJobId: duplicate.id,
        }
      : null,
  });
});
