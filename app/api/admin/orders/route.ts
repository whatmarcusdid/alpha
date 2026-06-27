import { NextResponse } from 'next/server';

import { listAdminOrders } from '@/lib/admin/linking-lists';
import { withAdmin } from '@/lib/middleware/apiHandler';

export const GET = withAdmin(async () => {
  const orders = await listAdminOrders();

  return NextResponse.json({
    success: true,
    data: orders,
  });
});
