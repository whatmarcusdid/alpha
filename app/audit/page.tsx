'use client';

import { Inter, Schibsted_Grotesk } from 'next/font/google';
import { AuditLoadingAnimation } from '@/components/audit/AuditLoadingAnimation';
import { AuditRateLimitOverlay } from '@/components/audit/AuditRateLimitOverlay';
import { AuditResults } from '@/components/audit/AuditResults';
import { Input } from '@/components/ui/input';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import type { AuditResult } from '@/lib/types/audit';
import { useState } from 'react';

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

const interKicker = Inter({
  subsets: ['latin'],
  weight: ['600'],
  display: 'swap',
});

const schibstedGroteskGrades = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['800'],
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

  if (view === 'results' && auditResult) {
    return (
      <AuditResults
        result={auditResult}
        firstName={formValues.firstName}
        onRunAnother={() => {
          setView('form');
          setAuditResult(null);
          setApiComplete(false);
          setError(null);
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {showRateLimitOverlay && (
        <>
          <div className="fixed inset-0 z-30 bg-white/60 backdrop-blur-sm backdrop-grayscale" />
          <AuditRateLimitOverlay
            firstName={formValues.firstName}
            websiteUrl={formValues.websiteUrl}
            pricingUrl={process.env.NEXT_PUBLIC_PRICING_URL ?? '#'}
            onViewPreviousResults={() => setShowRateLimitOverlay(false)}
          />
        </>
      )}
      <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b border-gray-100 bg-white px-6">
        <div className="flex items-center">
          <img
            src="/images/tsg-logo.svg"
            alt="TradeSiteGenie"
            width={204}
            height={31}
            className="h-8 w-auto shrink-0 object-contain object-left"
          />
        </div>
      </header>

      {view === 'form' && (
        <div className="flex h-[calc(100vh-3.5rem)] min-h-0 flex-1 flex-col overflow-hidden md:flex-row md:pr-[50vw]">
          <div className="w-full h-full min-h-0 overflow-y-auto px-8 py-12 md:px-16 flex flex-col items-center">
            <div className="w-full max-w-[520px]">
              <p
                className={`${interKicker.className} mb-4 bg-[linear-gradient(270deg,#0284C7_0%,#4F46E5_100%)] bg-clip-text text-[18px] font-semibold uppercase leading-[150%] text-transparent [-webkit-text-fill-color:transparent]`}
              >
                GENIE SITE AUDIT
              </p>
              <h1 className="mb-3 text-5xl font-extrabold leading-tight tracking-tight text-gray-900">
                Is your website helping or hurting your business?
              </h1>
              <p className="mb-8 text-lg leading-relaxed text-gray-500">
                Get your Speed, Security + UX grade in 60 seconds.
              </p>

              <div className="mb-10 flex items-center gap-3">
                {avatarFailed ? (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                    MW
                  </div>
                ) : (
                  <img
                    src="/images/marcus-avatar.svg"
                    alt=""
                    width={64}
                    height={64}
                    className="h-16 w-16 rounded-full object-cover"
                    onError={() => setAvatarFailed(true)}
                  />
                )}
                <div className="flex flex-col">
                  <span className="text-lg font-bold leading-relaxed text-gray-900">
                    Marcus White
                  </span>
                  <span className="text-base leading-relaxed text-gray-500">
                    Founder, TradeSiteGenie
                  </span>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex w-full max-w-[520px] flex-col gap-5"
            >
              <div>
                <label
                  htmlFor="audit-firstName"
                  className="mb-1 block text-sm font-semibold leading-relaxed tracking-tight text-gray-700"
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
                />
              </div>
              <div>
                <label
                  htmlFor="audit-businessName"
                  className="mb-1 block text-sm font-semibold leading-relaxed tracking-tight text-gray-700"
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
                />
              </div>
              <div>
                <label
                  htmlFor="audit-email"
                  className="mb-1 block text-sm font-semibold leading-relaxed tracking-tight text-gray-700"
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
                />
              </div>
              <div>
                <label
                  htmlFor="audit-websiteUrl"
                  className="mb-1 block text-sm font-semibold leading-relaxed tracking-tight text-gray-700"
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
                />
              </div>

              {error ? (
                <p className="mt-1 text-sm text-red-500" role="alert">
                  {error}
                </p>
              ) : null}

              <PrimaryButton
                type="submit"
                disabled={submitting}
                className="mt-6 w-full min-h-[40px] py-4 text-sm font-bold uppercase tracking-widest"
              >
                RUN MY FREE AUDIT
              </PrimaryButton>

              <p className="mx-auto mt-3 w-full max-w-[520px] text-center text-[15px] font-medium leading-relaxed text-gray-400">
                No login required. Results in under 60 seconds. Your PDF report will be
                emailed to you automatically.
              </p>
            </form>
          </div>

          <div
            className="hidden md:flex md:w-1/2 fixed top-[3.5rem] right-0 h-[calc(100vh-3.5rem)] overflow-hidden justify-start items-start"
            style={{ background: '#F5F0E4' }}
            aria-hidden
          >
            {/* Glow 1 - bottom left */}
            <div className="absolute pointer-events-none" style={{
              width: '32rem', height: '32rem',
              left: '-8rem', bottom: '-8rem',
              borderRadius: '999px',
              filter: 'blur(70px)',
              zIndex: 0,
              background: 'radial-gradient(circle, rgba(125, 117, 255, 0.28) 0%, rgba(125, 117, 255, 0) 70%)'
            }} />

            {/* Glow 2 - top right */}
            <div className="absolute pointer-events-none" style={{
              width: '24rem', height: '24rem',
              right: '2rem', top: '3rem',
              borderRadius: '999px',
              filter: 'blur(70px)',
              zIndex: 0,
              background: 'radial-gradient(circle, rgba(134, 200, 255, 0.22) 0%, rgba(134, 200, 255, 0) 72%)'
            }} />

            {/* 3D Object */}
            <img
              src="/images/3D_Object.svg"
              alt=""
              aria-hidden="true"
              className="absolute pointer-events-none"
              style={{
                width: '125%',
                maxWidth: 'none',
                left: '-10%',
                top: '50%',
                transform: 'translateY(-50%) rotate(-15deg)',
                zIndex: 1,
                opacity: 0.9,
                position: 'absolute'
              }}
            />

            {/* Veil - softens object behind card */}
            <div className="absolute inset-0 pointer-events-none" style={{
              zIndex: 2,
              background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.18), transparent 60%)'
            }} />

            {/* Glass card */}
            <div
              className="absolute flex flex-col items-center justify-center gap-6 rounded-2xl p-8"
              style={{
                top: '50%', left: '50%',
                transform: 'translate(-42%, -44%)',
                width: '100%',
                maxWidth: '520px',
                zIndex: 3,
                border: '1px solid rgba(255,255,255,0.50)',
                background: 'rgba(0,0,0,0)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                boxShadow: '0 8px 32px rgba(15,23,42,0.08)'
              }}
            >
              <div className="flex w-full items-start justify-between gap-4">
                <div className="flex min-w-0 flex-col gap-2">
                  <span className="text-2xl font-extrabold leading-tight tracking-tight text-gray-900">
                    Mike&apos;s Pressure Washing
                  </span>
                  <p className="text-lg leading-relaxed text-gray-600">
                    mikespressurewashing.com
                  </p>
                </div>
                <span className="shrink-0 text-sm text-gray-500">Apr 2</span>
              </div>

              <div className="grid w-full grid-cols-3 gap-4">
                <div className="rounded-lg bg-white/50 p-3 text-center shadow-sm ring-1 ring-white/60">
                  <div className={`${schibstedGroteskGrades.className} text-[80px] font-extrabold leading-none text-amber-500`}>C</div>
                  <div className="mt-1 text-left text-base leading-relaxed text-gray-500">SPEED</div>
                  <div className="mt-0.5 text-left text-xs text-gray-500">Score: 48/100</div>
                </div>
                <div className="rounded-lg bg-white/50 p-3 text-center shadow-sm ring-1 ring-white/60">
                  <div className={`${schibstedGroteskGrades.className} text-[80px] font-extrabold leading-none text-green-600`}>A</div>
                  <div className="mt-1 text-left text-base leading-relaxed text-gray-500">SECURITY</div>
                  <div className="mt-0.5 text-left text-xs text-gray-500">No flags</div>
                </div>
                <div className="rounded-lg bg-white/50 p-3 text-center shadow-sm ring-1 ring-white/60">
                  <div className={`${schibstedGroteskGrades.className} text-[80px] font-extrabold leading-none text-amber-500`}>C</div>
                  <div className="mt-1 text-left text-base leading-relaxed text-gray-500">USER EXPERIENCE</div>
                  <div className="mt-0.5 text-left text-xs text-gray-500">No flags</div>
                </div>
              </div>

              <div className="flex w-full flex-col gap-2">
                <p className="text-lg font-bold text-gray-800">Top issues found</p>
                <ul className="flex flex-col gap-1.5">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <span className="text-[15px] font-medium leading-tight tracking-tight text-gray-600">Images not compressed (LCP: 4.2s)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <span className="text-[15px] font-medium leading-tight tracking-tight text-gray-600">No caching policy on static assets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                    <span className="text-[15px] font-medium leading-tight tracking-tight text-gray-600">Render-blocking JavaScript detected</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'loading' && (
        <div className="flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col bg-white">
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
