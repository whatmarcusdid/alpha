import { AdminDashboardPreviewShell } from '@/components/preview/AdminDashboardPreviewShell';
import { requireAdminSession } from '@/lib/admin/require-admin-session';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPreviewPage() {
  await requireAdminSession();

  return <AdminDashboardPreviewShell />;
}
