import { ClientDashboardPreviewShell } from '@/components/preview/ClientDashboardPreviewShell';
import { requireAdminSession } from '@/lib/admin/require-admin-session';

export const dynamic = 'force-dynamic';

export default async function ClientDashboardPreviewPage() {
  await requireAdminSession();

  return <ClientDashboardPreviewShell />;
}
