import { NextResponse } from 'next/server';

import { listAdminAuditLeads } from '@/lib/admin/linking-lists';
import { withAdmin } from '@/lib/middleware/apiHandler';

export const GET = withAdmin(async () => {
  const auditLeads = await listAdminAuditLeads();

  return NextResponse.json({
    success: true,
    data: auditLeads,
  });
});
