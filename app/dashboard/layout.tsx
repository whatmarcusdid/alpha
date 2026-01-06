import { DashboardNav } from '@/components/layout/DashboardNav';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#F7F6F1]">
      <DashboardNav />
      <div className="px-4 sm:px-6 lg:px-8 bg-[#F7F6F1]">
        {children}
      </div>
    </div>
  );
}
