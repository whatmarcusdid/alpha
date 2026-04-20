'use client';

import { Inter, Schibsted_Grotesk } from 'next/font/google';
import { PrimaryButton } from '@/components/ui/PrimaryButton';

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['800'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export interface AuditRateLimitOverlayProps {
  firstName: string;
  websiteUrl: string;
  pricingUrl: string;
  onViewPreviousResults: () => void;
}

export function AuditRateLimitOverlay({
  pricingUrl,
  onViewPreviousResults,
}: AuditRateLimitOverlayProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/80 p-6">
      <div className="flex w-full max-w-[580px] flex-col items-center gap-4 rounded-[20px] border-2 border-[#dddddd] bg-[#eeeeee] px-10 py-20 text-center">
        <img
          src="/images/audit/hourglass.svg"
          alt=""
          aria-hidden="true"
          className="h-20 w-[60px] shrink-0"
        />
        <h2
          className={`${schibstedGrotesk.className} text-[32px] font-extrabold leading-[1.2] tracking-[-0.4px] text-[#232521] sm:text-[40px]`}
        >
          You&apos;ve already run an audit today
        </h2>
        <p
          className={`${inter.className} text-lg font-normal leading-[1.5] text-[#545552]`}
        >
          Each email address can run one free audit every 24 hours. Check your
          inbox for your previous report, or view your results below.
        </p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={onViewPreviousResults}
            className={`${inter.className} inline-flex min-h-[44px] items-center justify-center rounded-full border-[2.5px] border-[#171544] bg-white px-5 py-2 text-sm font-semibold uppercase tracking-[-0.14px] text-[#171544] transition-colors hover:bg-gray-50`}
          >
            View my previous results
          </button>
          <PrimaryButton
            href={pricingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`${inter.className} min-h-[44px] whitespace-nowrap px-5 py-2 text-sm font-bold uppercase tracking-[-0.14px]`}
          >
            Start my site care plan
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
