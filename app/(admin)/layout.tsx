import { AdminNav } from '@/components/admin/AdminNav';
import { requireAdminSession } from '@/lib/admin/require-admin-session';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminSession();

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav />
      <main className="rounded-t-2xl bg-white px-5 py-6 md:px-6 lg:min-h-[calc(100vh-120px)]">
        <div className="mx-auto max-w-[1408px]">{children}</div>
      </main>
    </div>
  );
}
