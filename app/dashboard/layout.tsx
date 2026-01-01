import { DashboardNav } from '@/components/layout/DashboardNav';
import { BottomNav } from '@/components/dashboard/BottomNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F7F6F1]">
      <aside className="hidden lg:block w-64 bg-white fixed top-0 left-0 h-full border-r border-gray-200">
        <DashboardNav />
      </aside>
      <main className="lg:ml-64">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
