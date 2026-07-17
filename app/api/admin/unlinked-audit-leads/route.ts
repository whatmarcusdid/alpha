import { NextResponse } from 'next/server';

import { listUnlinkedAuditLeadRecords } from '@/lib/admin/list-unlinked-audit-leads';
import { withAdmin } from '@/lib/middleware/apiHandler';

export const GET = withAdmin(async () => {
  const records = await listUnlinkedAuditLeadRecords();

  return NextResponse.json({
    success: true,
    data: records,
  });
});
