import { NextRequest, NextResponse } from 'next/server';

import { completeFixJobDelivery } from '@/lib/fix-jobs/delivery-firestore';
import { getFixJob } from '@/lib/fix-jobs/firestore';
import { serializeFixJob } from '@/lib/fix-jobs/serialize';
import { withAdmin } from '@/lib/middleware/apiHandler';

export const POST = withAdmin(async (_req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  try {
    await completeFixJobDelivery(params.fixJobId);
    const updated = await getFixJob(params.fixJobId);

    return NextResponse.json({
      success: true,
      data: updated ? serializeFixJob(updated) : null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to complete fix job delivery';

    if (message.includes('All delivery steps')) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
});
