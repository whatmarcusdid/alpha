'use client';

import { useEffect, useRef } from "react";
import { BookingLayout } from "@/components/layout/booking-layout";
import { BookingCard } from "@/components/ui/booking-card";
import { trackGamePlanCallConfirmationViewed } from "@/lib/analytics";
import { useAuth } from "@/contexts/AuthContext";

export default function ConfirmationPage() {
  const { user, loading: authLoading } = useAuth();

  // Mixpanel: track confirmation page view (once per page load, after auth settles)
  const hasTrackedRef = useRef(false);
  useEffect(() => {
    if (authLoading || hasTrackedRef.current) return;
    hasTrackedRef.current = true;
    trackGamePlanCallConfirmationViewed({
      booking_flow_type: user ? 'logged_in_dashboard' : 'anonymous_site',
    });
  }, [user, authLoading]);
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
