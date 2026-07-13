'use client';

import { Inter } from 'next/font/google';
import { useEffect, useRef } from 'react';

import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';
import { ratch } from '@/lib/fonts/ratch';
import { trackGamePlanCallConfirmationViewed } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export default function ConfirmationPage() {
  const { user, loading: authLoading } = useAuth();

  const hasTrackedRef = useRef(false);
  useEffect(() => {
    if (authLoading || hasTrackedRef.current) return;
    hasTrackedRef.current = true;
    trackGamePlanCallConfirmationViewed({
      booking_flow_type: user ? 'logged_in_dashboard' : 'anonymous_site',
    });
  }, [user, authLoading]);

  return (
    <div className={`${inter.className} flex min-h-screen flex-col bg-[#f3f4f6]`}>
      <BookServiceHeader variant="transparent" />

      <main className="flex flex-1 flex-col items-center px-4 pt-8 pb-8">
        <div className="flex w-full max-w-[700px] flex-col items-center justify-center rounded-2xl bg-white p-6">
          <div className="flex w-full max-w-[600px] flex-col items-center gap-2">
            <img
              src="/brand/check-circle.png"
              alt=""
              className="size-10 shrink-0"
              aria-hidden
            />

            <h1
              className={`${ratch.className} text-center text-2xl font-bold leading-[1.2] tracking-[-0.24px] text-[#030712]`}
            >
              You&apos;re booked for our TradeSiteGenie Website Game Plan Call!
            </h1>

            <p className="w-full text-center text-base leading-[1.35] text-[#030712]">
              A meeting invite has been sent to your email.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
