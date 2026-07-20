'use client';

import { Inter } from 'next/font/google';
import Image from 'next/image';
import { useEffect, useState } from 'react';

import { AuditLoadingAnimation } from '@/components/audit/AuditLoadingAnimation';
import { AuditRateLimitOverlay } from '@/components/audit/AuditRateLimitOverlay';
import { AuditResults } from '@/components/audit/AuditResults';
import { Input } from '@/components/ui/input';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ratch } from '@/lib/fonts/ratch';
import {
  clearAuditLeadId,
  clearAuditSession,
  readAuditSession,
  storeAuditSession,
} from '@/lib/book-service/storage';
import type { AuditResult } from '@/lib/types/audit';

type AuditView = 'form' | 'loading' | 'results';

type FormValues = {
  firstName: string;
  businessName: string;
  email: string;
  websiteUrl: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseApiError(payload: unknown): string {
  if (isRecord(payload) && typeof payload.error === 'string') {
    return payload.error;
  }
  return 'Something went wrong. Please try again.';
}

function isAuditSuccessPayload(
  payload: unknown
): payload is { success: true; data: AuditResult } {
  if (!isRecord(payload) || payload.success !== true) {
    return false;
  }
  const data = payload.data;
  return data !== null && typeof data === 'object';
}

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  display: 'swap',
});

export default function AuditPage() {
  const [view, setView] = useState<AuditView>('form');
  const [formValues, setFormValues] = useState<FormValues>({
    firstName: '',
    businessName: '',
    email: '',
    websiteUrl: '',
  });
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [apiComplete, setApiComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [showRateLimitOverlay, setShowRateLimitOverlay] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);

  useEffect(() => {
    const session = readAuditSession();
    if (session) {
      setAuditResult(session.result);
      setFormValues((values) => ({
        ...values,
        firstName: session.firstName,
        websiteUrl: session.result.websiteUrl,
      }));
      setView('results');
    }
    setHasCheckedSession(true);
  }, []);

  useEffect(() => {
    if (view === 'results' && auditResult) {
      storeAuditSession({
        result: auditResult,
        firstName: formValues.firstName || auditResult.firstName,
      });
    }
  }, [view, auditResult, formValues.firstName]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const firstName = formValues.firstName.trim();
    const businessName = formValues.businessName.trim();
    const email = formValues.email.trim();
    const websiteUrl = formValues.websiteUrl.trim();

    if (!firstName || !businessName || !email || !websiteUrl) {
      setError('Please fill in all fields.');
      return;
    }

    if (!websiteUrl.startsWith('http://') && !websiteUrl.startsWith('https://')) {
      setError('Website URL must start with http:// or https://');
      return;
    }

    setError(null);
    clearAuditSession();
    clearAuditLeadId();
    setSubmitting(true);
    setView('loading');
    setApiComplete(false);

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          businessName,
          email,
          websiteUrl,
          isClient: false,
        }),
      });

      const payload: unknown = await res.json();

      if (res.status === 429) {
        setShowRateLimitOverlay(true);
        setView('form');
        setSubmitting(false);
        return;
      }

      if (!res.ok) {
        setView('form');
        setError(parseApiError(payload));
        setSubmitting(false);
        return;
      }

      if (!isAuditSuccessPayload(payload)) {
        setView('form');
        setError('Invalid response from server.');
        setSubmitting(false);
        return;
      }

      setAuditResult(payload.data);
      setApiComplete(true);
      setSubmitting(false);
    } catch {
      setView('form');
      setError('Network error. Please try again.');
      setSubmitting(false);
    }
  }

  if (!hasCheckedSession) {
    return <div className="min-h-screen bg-white" aria-hidden="true" />;
  }

  if (view === 'results' && auditResult) {
    return (
      <AuditResults
        result={auditResult}
        firstName={formValues.firstName}
        onRunAnother={() => {
          clearAuditSession();
          clearAuditLeadId();
          setView('form');
          setAuditResult(null);
          setApiComplete(false);
          setError(null);
        }}
      />
    );
  }

  return (
    <div className={`flex min-h-screen flex-col ${view === 'form' ? '' : 'bg-white'}`}>
      {showRateLimitOverlay && (
        <>
          <div className="fixed inset-0 z-30 bg-[#0c0a28]/60 backdrop-blur-sm backdrop-grayscale" />
          <AuditRateLimitOverlay
            firstName={formValues.firstName}
            websiteUrl={formValues.websiteUrl}
            pricingUrl={process.env.NEXT_PUBLIC_PRICING_URL ?? '#'}
            onViewPreviousResults={() => setShowRateLimitOverlay(false)}
          />
        </>
      )}

      {view === 'form' && (
        <div
          className={`${inter.className} relative flex min-h-screen flex-1 flex-col items-center justify-center overflow-hidden bg-[#0c0a28] px-8 pb-[120px] pt-40 md:px-16 md:pt-24 lg:px-[140px]`}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            aria-hidden="true"
          >
            <source src="/videos/audit-hero-bg.mp4" type="video/mp4" />
          </video>

          <nav
            aria-label="Book Service"
            className="absolute left-8 top-10 z-10 md:left-16 lg:left-[140px]"
          >
            <Image
              src="/brand/book-service-audit-logo.png"
              alt="Book Service"
              width={194}
              height={25}
              priority
              className="h-[25px] w-auto"
            />
          </nav>

          <div className="relative z-10 mx-auto flex w-full max-w-[1160px] flex-col justify-start gap-16 lg:flex-row lg:items-start">
            <div className="flex w-full flex-col gap-10 lg:flex-1">
              <div className="flex flex-col gap-3">
                <p className="text-base font-semibold leading-[1.5] text-white">
                  Site Audit
                </p>
                <h1
                  className={`${ratch.className} text-[40px] font-bold leading-[1.2] tracking-[-0.4px] text-white md:text-[48px] md:tracking-[-0.48px] lg:text-[52px] lg:tracking-[-0.52px]`}
                >
                  Is your website helping or hurting your business?
                </h1>
                <p className="text-base leading-[1.5] text-white lg:text-lg">
                  Get your speed, security, and SEO grade in seconds
                </p>
              </div>

              <div className="flex items-center gap-4">
                {avatarFailed ? (
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-full border-[3px] border-white bg-gray-200 text-sm font-semibold text-gray-600 shadow-[6px_6px_16px_rgba(85,85,85,0.1)]">
                    MW
                  </div>
                ) : (
                  <img
                    src="/images/marcus-avatar.svg"
                    alt=""
                    width={64}
                    height={64}
                    className="size-16 shrink-0 rounded-full border-[3px] border-white object-cover shadow-[6px_6px_16px_rgba(85,85,85,0.1)]"
                    onError={() => setAvatarFailed(true)}
                  />
                )}
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="text-lg font-semibold leading-[1.5] tracking-[-0.18px] text-white md:text-xl md:tracking-[-0.2px]">
                    Marcus White
                  </span>
                  <span className="text-base leading-[1.5] text-[rgba(248,250,252,0.65)] lg:text-lg">
                    Founder, Book Service
                  </span>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex w-full shrink-0 flex-col gap-5 lg:w-[480px]"
            >
              <div>
                <label
                  htmlFor="audit-firstName"
                  className="mb-2.5 block text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-white"
                >
                  First name
                </label>
                <Input
                  id="audit-firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="e.g. Mike"
                  value={formValues.firstName}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, firstName: e.target.value }))
                  }
                  className="min-h-[40px] rounded-md border-[rgba(111,121,122,0.4)] px-5 py-3 text-sm placeholder:text-[#52525b]"
                />
              </div>
              <div>
                <label
                  htmlFor="audit-businessName"
                  className="mb-2.5 block text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-white"
                >
                  Business name
                </label>
                <Input
                  id="audit-businessName"
                  type="text"
                  autoComplete="organization"
                  placeholder="e.g. Mike's Pressure Washing"
                  value={formValues.businessName}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, businessName: e.target.value }))
                  }
                  className="min-h-[40px] rounded-md border-[rgba(111,121,122,0.4)] px-5 py-3 text-sm placeholder:text-[#52525b]"
                />
              </div>
              <div>
                <label
                  htmlFor="audit-email"
                  className="mb-2.5 block text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-white"
                >
                  Email address
                </label>
                <Input
                  id="audit-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@yourcompany.com"
                  value={formValues.email}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, email: e.target.value }))
                  }
                  className="min-h-[40px] rounded-md border-[rgba(111,121,122,0.4)] px-5 py-3 text-sm placeholder:text-[#52525b]"
                />
              </div>
              <div>
                <label
                  htmlFor="audit-websiteUrl"
                  className="mb-2.5 block text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-white"
                >
                  Website URL
                </label>
                <Input
                  id="audit-websiteUrl"
                  type="url"
                  autoComplete="url"
                  placeholder="https://yoursite.com"
                  value={formValues.websiteUrl}
                  onChange={(e) =>
                    setFormValues((v) => ({ ...v, websiteUrl: e.target.value }))
                  }
                  className="min-h-[40px] rounded-md border-[rgba(111,121,122,0.4)] px-5 py-3 text-sm placeholder:text-[#52525b]"
                />
              </div>

              {error ? (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              ) : null}

              <PrimaryButton
                type="submit"
                disabled={submitting}
                className="min-h-[40px] w-full rounded-lg !bg-[#34d399] px-6 py-2 !text-base !font-bold !text-[#0c0a28] shadow-[4px_8px_12px_rgba(0,0,0,0.08)] hover:!bg-[#2fc48d]"
              >
                Run My Free Audit
              </PrimaryButton>

              <p className="text-center text-sm leading-[1.5] tracking-[-0.14px] text-white">
                No login required. Results in under 60 seconds. Your PDF report
                will be emailed to you automatically.
              </p>
            </form>
          </div>
        </div>
      )}

      {view === 'loading' && (
        <div className="flex min-h-screen flex-1 flex-col bg-white">
          <AuditLoadingAnimation
            websiteUrl={formValues.websiteUrl}
            apiComplete={apiComplete}
            onAnimationComplete={() => setView('results')}
          />
        </div>
      )}
    </div>
  );
}
