import * as React from "react";
import { TSGLogo } from "@/components/ui/logo";

interface BookingLayoutProps {
  children: React.ReactNode;
}

export function BookingLayout({ children }: BookingLayoutProps) {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="border-b border-stone-200">
        <div className="px-10 py-4">
          <TSGLogo />
        </div>
      </header>

      {/* Body Container */}
      <main className="flex flex-col items-center gap-20 self-stretch px-[140px] pb-28 pt-20">
        {children}
      </main>
    </div>
  );
}
