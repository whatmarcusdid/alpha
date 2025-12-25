'use client';

import { BookingLayout } from "@/components/layouts/booking-layout";
import { BookingCard } from "@/components/ui/booking-card";

export default function ConfirmationPage() {
  return (
    <BookingLayout>
      <BookingCard>
        <div className="mx-auto flex max-w-[600px] flex-col items-center gap-8 py-12">
          {/* Success Icon - Teal checkmark in circle */}
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#1B4A41]">
            <svg
              className="h-8 w-8 text-[#1B4A41]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-center text-3xl font-bold text-gray-900">
            You're booked for our TradeSiteGenie Website Game Plan Call!
          </h1>

          {/* Subheading */}
          <p className="text-center text-base text-gray-600">
            A meeting invite has been sent to your email.
          </p>
        </div>
      </BookingCard>
    </BookingLayout>
  );
}
