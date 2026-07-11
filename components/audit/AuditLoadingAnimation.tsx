'use client';

import { Inter } from 'next/font/google';
import { useEffect, useRef, useState } from 'react';

import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';
import { ratch } from '@/lib/fonts/ratch';

export interface AuditLoadingAnimationProps {
  websiteUrl: string;
  apiComplete: boolean;
  onAnimationComplete: () => void;
}

type ScanKind = 'speed' | 'security' | 'seo';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
});

function cardStateForStage(
  kind: ScanKind,
  stage: number
): 'spinner' | 'placeholder' | 'check' {
  if (kind === 'speed') {
    if (stage === 0) return 'spinner';
    return 'check';
  }
  if (kind === 'security') {
    if (stage === 0) return 'placeholder';
    if (stage === 1) return 'spinner';
    return 'check';
  }
  // seo
  if (stage <= 1) return 'placeholder';
  if (stage === 2) return 'spinner';
  return 'check';
}

function SpinnerBlock() {
  return (
    <div className="flex items-center gap-2">
      <div className="size-[18px] animate-spin">
        <img
          src="/images/audit/loading-spinner.svg"
          alt=""
          aria-hidden
          className="size-full"
        />
      </div>
      <span
        className={`${inter.className} text-[15px] font-medium tracking-[-0.15px] text-[#232521]`}
      >
        Scanning
      </span>
    </div>
  );
}

function CheckmarkIcon() {
  return (
    <img
      src="/images/audit/loading-checkmark.svg"
      alt=""
      aria-hidden
      className="size-10"
    />
  );
}

function PlaceholderBar() {
  return (
    <img
      src="/images/audit/loading-placeholder.svg"
      alt=""
      aria-hidden
      className="h-10 w-20"
    />
  );
}

const SCANS: { kind: ScanKind; label: string }[] = [
  { kind: 'speed', label: 'Speed' },
  { kind: 'security', label: 'Security' },
  { kind: 'seo', label: 'SEO & AI Visibility' },
];

export function AuditLoadingAnimation({
  websiteUrl,
  apiComplete,
  onAnimationComplete,
}: AuditLoadingAnimationProps) {
  const [stage, setStage] = useState(0);
  const [showWaitMessage, setShowWaitMessage] = useState(false);
  const timeoutIdsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 2500);
    const t2 = setTimeout(() => setStage(2), 5000);
    const t3 = setTimeout(() => setStage(3), 8000);
    timeoutIdsRef.current = [t1, t2, t3];
    return () => {
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (stage !== 3 || apiComplete) return;
    setShowWaitMessage(true);
  }, [stage, apiComplete]);

  useEffect(() => {
    if (stage !== 3 || hasCompletedRef.current) return;
    if (!apiComplete) return;
    hasCompletedRef.current = true;
    setShowWaitMessage(false);
    onAnimationComplete();
  }, [stage, apiComplete, onAnimationComplete]);

  const displayHost = websiteUrl
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  return (
    <div className={`${inter.className} flex min-h-screen w-full flex-col bg-white`}>
      <div className="mx-auto flex w-full flex-1 flex-col items-center gap-16 px-8 pb-[120px] pt-10 md:px-16 lg:px-[140px]">
        <BookServiceHeader variant="inline" />

        <div className="flex w-full flex-col gap-6 lg:w-[800px]">
          <div className="flex flex-col gap-3">
            <p className="text-base font-semibold leading-[1.5] text-[#2920a5]">
              Site Audit • {displayHost}
            </p>
            <h2
              className={`${ratch.className} text-[36px] font-bold leading-[1.2] tracking-[-0.36px] text-[#0c0a28] md:text-[44px] md:tracking-[-0.44px] lg:text-[52px] lg:tracking-[-0.52px]`}
            >
              Analyzing your site…
            </h2>
            <p className="text-lg leading-[1.5] text-[#030712]">
              Your grades will appear as each scan completes.
            </p>
          </div>

          <div className="flex flex-col gap-6 md:flex-row">
            {SCANS.map(({ kind, label }) => {
              const state = cardStateForStage(kind, stage);
              return (
                <div
                  key={kind}
                  className="flex h-[124px] w-full flex-col items-center justify-center gap-4 rounded-xl border-[3px] border-[#e5e7eb] bg-white p-5 md:flex-1"
                >
                  <span className="text-center text-base font-semibold leading-[1.5] text-[#52525b]">
                    {label}
                  </span>
                  <div className="flex min-h-10 items-center justify-center">
                    {state === 'spinner' ? (
                      <SpinnerBlock />
                    ) : state === 'check' ? (
                      <CheckmarkIcon />
                    ) : (
                      <PlaceholderBar />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div
            className={`text-center transition-opacity duration-500 ${
              showWaitMessage && !apiComplete ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <p className="text-sm text-gray-400">
              Still analyzing — this can take up to 60 seconds for some sites.
              Hang tight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
