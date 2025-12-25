import * as React from "react";

interface BookingCardProps {
  children: React.ReactNode;
}

export function BookingCard({ children }: BookingCardProps) {
  return (
    <div className="flex w-full max-w-[1160px] flex-col items-center gap-6 rounded-lg bg-white p-6 shadow-[0_8px_20px_0_rgba(85,85,85,0.10)]">
      {children}
    </div>
  );
}
