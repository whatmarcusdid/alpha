import { NextRequest, NextResponse } from 'next/server';

import { listLoopDocs } from '@/lib/fix-jobs/loops-firestore';
import { serializeLoopDoc } from '@/lib/fix-jobs/serialize-loop';
import { withAdmin } from '@/lib/middleware/apiHandler';

export const GET = withAdmin(async (_req: NextRequest, context) => {
  const params = await context.params;
  if (!params?.fixJobId) {
    return NextResponse.json({ error: 'Missing route params' }, { status: 400 });
  }

  const loops = await listLoopDocs(params.fixJobId);

  return NextResponse.json({
    success: true,
    data: loops.map(serializeLoopDoc),
  });
});
