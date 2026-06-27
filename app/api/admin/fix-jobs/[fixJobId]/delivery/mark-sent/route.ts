import { NextRequest, NextResponse } from 'next/server';

import { markDeliveryEmailSent } from '@/lib/fix-jobs/delivery-firestore';
import { getFixJob } from '@/lib/fix-jobs/firestore';
import { serializeFixJob } from '@/lib/fix-jobs/serialize';
import { withAdmin } from '@/lib/middleware/apiHandler';

export const POST = withAdmin(async (_req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const fixJob = await getFixJob(params.fixJobId);
  if (!fixJob) {
    return NextResponse.json({ error: 'Fix job not found' }, { status: 404 });
  }

  try {
    const { sentAt } = await markDeliveryEmailSent(params.fixJobId);
    const updated = await getFixJob(params.fixJobId);

    return NextResponse.json({
      success: true,
      sentAt: sentAt.toISOString(),
      data: updated ? serializeFixJob(updated) : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to mark delivery email as sent';

    if (message.includes('Report must be generated')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
});
