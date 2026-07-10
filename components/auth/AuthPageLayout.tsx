import type { ReactNode } from 'react';

import { AuthNavbar } from '@/components/auth/AuthNavbar';

type AuthPageLayoutProps = {
  children: ReactNode;
};

export function AuthPageLayout({ children }: AuthPageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="relative flex flex-1 flex-col items-center bg-[#f8fafc] px-6 pb-20 pt-8 md:px-10 lg:min-h-[800px] lg:px-[140px] lg:pb-[120px] lg:pt-8">
        <div className="w-full">
          <AuthNavbar />
        </div>

        <main className="flex w-full flex-1 flex-col items-center justify-center py-12 md:py-16 lg:py-20">
          {children}
        </main>
      </div>
    </div>
  );
}
