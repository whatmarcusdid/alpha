'use client';

import { useEffect, useRef, useState } from 'react';

export interface AuditLoadingAnimationProps {
  websiteUrl: string;
  apiComplete: boolean;
  onAnimationComplete: () => void;
}

type ScanKind = 'speed' | 'security' | 'ux';

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
  // ux
  if (stage <= 1) return 'placeholder';
  if (stage === 2) return 'spinner';
  return 'check';
}

function SpinnerBlock() {
  return (
    <div className="flex items-center gap-2">
      <div className="size-[18px] animate-spin">
        <svg
          viewBox="0 0 21 21"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="size-full"
          aria-hidden
        >
          {/* Track ring */}
          <circle cx="10.5" cy="10.5" r="9" stroke="#EDECFC" strokeWidth="3" />
          {/* Gradient arc */}
          <circle
            cx="10.5"
            cy="10.5"
            r="9"
            stroke="url(#spinnerGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="28 56"
          />
          <defs>
            <linearGradient
              id="spinnerGrad"
              x1="0"
              y1="0"
              x2="21"
              y2="0"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#EDECFC" />
              <stop offset="1" stopColor="#171544" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <span className="text-[15px] font-medium tracking-[-0.15px] text-[#232521]">
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
  { kind: 'ux', label: 'User Experience' },
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

  const displayHost = websiteUrl.replace(/^https?:\/\//i, '').toUpperCase();

  return (
    <div className="flex w-full flex-1 flex-col bg-white">
      <div className="mx-auto w-full max-w-3xl px-6 pt-16">
        <p className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-widest text-blue-600">
          <span>GENIE SITE AUDIT</span>
          <span aria-hidden>•</span>
          <span>{displayHost}</span>
        </p>
        <h2 className="mb-2 text-4xl font-extrabold text-[#1a1f5e]">
          Analyzing your site...
        </h2>
        <p className="mb-10 text-base text-gray-500">
          Your grades will appear as each scan completes.
        </p>

        <div className="grid grid-cols-3 gap-4">
          {SCANS.map(({ kind, label }) => {
            const state = cardStateForStage(kind, stage);
            return (
              <div
                key={kind}
                className="flex h-[124px] flex-col items-center justify-center gap-4 rounded-xl bg-gray-100 p-5"
              >
                <span className="text-base font-semibold uppercase text-[#545552]">
                  {label}
                </span>
                <div className="flex items-center justify-center">
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
          className={`mt-8 text-center transition-opacity duration-500 ${
            showWaitMessage && !apiComplete ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <p className="text-sm text-gray-400">
            Still analyzing — this can take up to 60 seconds for some sites. Hang tight.
          </p>
        </div>
      </div>
    </div>
  );
}
