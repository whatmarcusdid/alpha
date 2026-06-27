import { NextResponse } from 'next/server';

import { listAdminClients } from '@/lib/admin/linking-lists';
import { withAdmin } from '@/lib/middleware/apiHandler';

export const GET = withAdmin(async () => {
  const clients = await listAdminClients();

  return NextResponse.json({
    success: true,
    data: clients,
  });
});
