'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Inter, Schibsted_Grotesk } from 'next/font/google';

import { SiteFixBottomSheet } from '@/components/book-service/SiteFixBottomSheet';
import {
  derivePreSelectedSkus,
  hasAnyFailingGrade,
  isAllGradesHealthy,
} from '@/lib/book-service/derive-skus';
import { storeAuditLeadId } from '@/lib/book-service/storage';
import type { SiteFixSKU } from '@/lib/book-service/skus';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SPEED_ISSUE_DISPLAY_NAMES } from '@/lib/audit/speedTopIssues';
import type { AuditResult, ClientGrade, SecurityFlag } from '@/lib/types/audit';
import { getResultsHeadline } from '@/lib/types/audit';
import {
  SEO_SIGNAL_DISPLAY_NAMES,
  type SeoFailingSignalKey,
} from '@/lib/types/seoSignals';
import { stripMarkdown } from '@/lib/utils/stripMarkdown';

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['800'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
});

export interface AuditResultsProps {
  result: AuditResult;
  firstName: string;
  onRunAnother: () => void;
}

const SECURITY_FLAG_DISPLAY_NAMES: Record<SecurityFlag, string> = {
  malware_detected: 'Malware detected on your site',
  blacklisted: 'Site appears on a security blacklist',
  phishing_detected: 'Phishing content detected',
  unwanted_software_detected: 'Unwanted software detected',
  no_https: 'Site is not using HTTPS',
  invalid_ssl: 'SSL certificate is invalid or expired',
  missing_security_headers: 'Missing security headers (X-Frame-Options, CSP)',
  outdated_cms: 'Site running an outdated CMS version',
  http_redirect_missing: 'HTTP to HTTPS redirect is missing',
  mixed_content: 'Mixed HTTP and HTTPS content detected',
};

function gradeColor(grade: ClientGrade): string {
  switch (grade) {
    case 'A':
      return '#00A63E';
    case 'B':
      return '#65a30d';
    case 'C':
      return '#f0b100';
    case 'D':
    case 'F':
      return '#e7000b';
    default:
      return '#6b7280';
  }
}

function seoSignalLabel(key: string): string {
  return (
    SEO_SIGNAL_DISPLAY_NAMES[key as SeoFailingSignalKey] ??
    key.replace(/_/g, ' ')
  );
}

function IssueDot({ variant }: { variant: 'amber' | 'red' | 'green' }) {
  const color =
    variant === 'red'
      ? 'bg-[#e7000b]'
      : variant === 'green'
        ? 'bg-[#00A63E]'
        : 'bg-[#f0b100]';
  return <span className={`size-3 shrink-0 rounded-full ${color}`} />;
}

function TopIssuesList({
  items,
  dotVariant,
}: {
  items: string[];
  dotVariant: 'amber' | 'red';
}) {
  if (items.length === 0) return null;
  return (
    <>
      <div className="border-t border-[#dddddd]" />
      <div className="flex flex-col gap-2">
        <p
          className={`${inter.className} text-lg font-semibold leading-[1.5] tracking-[-0.18px] text-[#232521] md:text-xl md:tracking-[-0.2px] lg:text-xl lg:tracking-[-0.2px]`}
        >
          Top issues found
        </p>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <IssueDot variant={dotVariant} />
              <span
                className={`${inter.className} flex-1 text-sm leading-[1.5] tracking-[-0.14px] text-[#232521]`}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

function GradeCard({
  grade,
  label,
  descriptor,
}: {
  grade: ClientGrade;
  label: string;
  descriptor: string;
}) {
  return (
    <div className="flex h-[124px] w-full items-center gap-4 rounded-xl border-2 border-[#e5e7eb] bg-white p-4 md:flex-1 lg:p-5">
      {grade === 'N/A' ? (
        <div className="flex w-[58px] shrink-0 items-center justify-center">
          <div className="h-1 w-8 rounded-full bg-gray-300" />
        </div>
      ) : (
        <p
          className={`${inter.className} w-[58px] shrink-0 text-center text-[56px] font-extrabold leading-[1.2] tracking-[-0.56px] md:text-[64px] md:tracking-[-0.64px] lg:text-[80px] lg:tracking-[-0.8px]`}
          style={{ color: gradeColor(grade) }}
        >
          {grade}
        </p>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2 leading-[1.5] text-[#545552]">
        <span
          className={`${inter.className} text-base font-semibold uppercase`}
        >
          {label}
        </span>
        <span
          className={`${inter.className} text-sm tracking-[-0.14px]`}
        >
          {descriptor}
        </span>
      </div>
    </div>
  );
}

function PillarSection({
  title,
  narrative,
  children,
}: {
  title: string;
  narrative: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3">
        <h2
          className={`${schibstedGrotesk.className} text-xl font-extrabold leading-[1.2] tracking-[-0.2px] text-[#232521] md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]`}
        >
          {title}
        </h2>
        <p
          className={`${inter.className} text-base leading-[1.5] text-[#52525b] lg:text-lg`}
        >
          {narrative}
        </p>
      </div>
      {children}
    </div>
  );
}

export function AuditResults({
  result,
  firstName,
  onRunAnother,
}: AuditResultsProps) {
  const auditLeadId = result.auditLeadId;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const gradeSnapshot = {
    speedGrade: result.speed.grade,
    securityGrade: result.security.grade,
    seoGrade: result.seo.grade,
  };

  const showSiteFixBar = hasAnyFailingGrade(gradeSnapshot);
  const allHealthy = isAllGradesHealthy(gradeSnapshot);

  /**
   * AUDIT → CHECKOUT HANDOFF CONTRACT
   *
   * auditLeadId: passed via sessionStorage (`book-service:auditLeadId` key)
   *   NOT in the URL — this is intentional. URL params are droppable and visible.
   *   The checkout API receives auditLeadId in the POST body from client state.
   *
   * skus: pre-selected SKU keys derived from failing grades, passed as CSV query param
   *   /book-service/select?skus=speed_fix,security_fix
   *
   * The select page reads `skus` from the URL and `auditLeadId` from sessionStorage.
   * If auditLeadId is missing on the select page, show an error state — do not proceed.
   */
  function handleViewSiteFixes() {
    if (!auditLeadId) return;

    storeAuditLeadId(auditLeadId);
    setSheetOpen(true);
  }

  async function handleConfirm(sku: SiteFixSKU) {
    setIsCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch('/api/book-service/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditLeadId,
          sku,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.data?.url) {
        setCheckoutError('Something went wrong. Please try again.');
        return;
      }
      window.location.href = data.data.url;
    } catch {
      setCheckoutError('Something went wrong. Please try again.');
    } finally {
      setIsCheckoutLoading(false);
    }
  }

  function handleCloseSheet() {
    setSheetOpen(false);
    setCheckoutError(null);
  }

  const displayHost = result.websiteUrl
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  const speedDescriptor =
    result.speed.grade === 'N/A'
      ? 'Score unavailable'
      : `Score: ${result.speed.score}/100`;
  const securityDescriptor =
    result.security.grade === 'N/A'
      ? 'Scan unavailable'
      : result.security.grade === 'F'
        ? 'Site is flagged as unsafe'
        : result.security.flags.length === 0
          ? '0 flags found'
          : `${result.security.flags.length} flag${result.security.flags.length === 1 ? '' : 's'} found`;
  const seoDescriptor =
    result.seo.grade === 'N/A'
      ? 'Score unavailable'
      : `${result.seo.score}/9 checks passed`;

  const speedNarrative = stripMarkdown(result.speed.narrative);
  const securityNarrative = stripMarkdown(result.security.narrative);
  const seoNarrative = stripMarkdown(result.seo.narrative);

  const speedIssues = result.speed.topIssues.map(
    (issue) => SPEED_ISSUE_DISPLAY_NAMES[issue] ?? issue
  );
  const securityIssues = result.security.flags.map(
    (flag) => SECURITY_FLAG_DISPLAY_NAMES[flag] ?? flag
  );
  const seoIssues = result.seo.failingSignals.map(seoSignalLabel);

  const stickyBarPadding = showSiteFixBar || allHealthy ? 'pb-40' : 'pb-[120px]';

  return (
    <>
    <div className={`${inter.className} flex min-h-screen flex-col bg-white`}>
      <div className={`mx-auto flex w-full flex-col items-center gap-16 px-8 ${stickyBarPadding} pt-10 md:px-16 lg:px-[140px]`}>
        <div className="flex w-full shrink-0 items-center gap-2">
          <ShieldCheck className="size-6 shrink-0 text-[#1d4ed8]" aria-hidden />
          <span className="text-[25px] font-normal uppercase leading-[1.5] text-[#030712]">
            Book Service
          </span>
        </div>

        <div className="flex w-full flex-col gap-10 lg:w-[800px]">
          <div className="flex flex-col gap-3">
            <p className="text-base font-semibold uppercase leading-[1.5] text-[#1d4ed8]">
              Site Audit • {displayHost}
            </p>
            <h1
              className={`${schibstedGrotesk.className} text-[36px] font-extrabold leading-[1.2] tracking-[-0.36px] text-[#171544] md:text-[44px] md:tracking-[-0.44px] lg:text-[52px] lg:tracking-[-0.52px]`}
            >
              {getResultsHeadline(firstName, {
                speedGrade: result.speed.grade,
                securityGrade: result.security.grade,
                seoGrade: result.seo.grade,
              })}
            </h1>
          </div>

          {[result.speed.grade, result.security.grade, result.seo.grade].some(
            (g) => g === 'F'
          ) &&
            result.security.grade === 'F' && (
              <Alert className="border-red-200 bg-red-50 text-red-900">
                <AlertTitle className="text-base font-bold text-red-900">
                  Your site is currently flagged as unsafe.
                </AlertTitle>
                <AlertDescription className="mt-1 text-base leading-relaxed text-red-800">
                  Google and other browsers may be showing a warning to anyone
                  who visits your site right now — before they ever see your
                  page. This isn&apos;t a design issue or a slow load. Your site
                  has been identified as potentially harmful and needs to be
                  addressed immediately.
                </AlertDescription>
              </Alert>
            )}

          <div className="flex flex-col gap-6 md:flex-row md:gap-9">
            <GradeCard
              grade={result.speed.grade}
              label="SPEED"
              descriptor={speedDescriptor}
            />
            <GradeCard
              grade={result.security.grade}
              label="SECURITY"
              descriptor={securityDescriptor}
            />
            <GradeCard
              grade={result.seo.grade}
              label="SEO & AI VISIBILITY"
              descriptor={seoDescriptor}
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-12 md:flex-row md:gap-6 lg:w-[800px] lg:gap-12">
          <PillarSection title="Speed" narrative={speedNarrative}>
            {result.speed.grade !== 'N/A' &&
              (speedIssues.length > 0 ? (
                <TopIssuesList items={speedIssues} dotVariant="amber" />
              ) : result.speed.score >= 90 ? (
                <>
                  <div className="border-t border-[#dddddd]" />
                  <div className="flex flex-col gap-2">
                    <p
                      className={`${inter.className} text-lg font-semibold leading-[1.5] tracking-[-0.18px] text-[#232521] md:text-xl md:tracking-[-0.2px]`}
                    >
                      All clear
                    </p>
                    <div className="flex items-center gap-2">
                      <IssueDot variant="green" />
                      <span
                        className={`${inter.className} text-sm leading-[1.5] tracking-[-0.14px] text-[#232521]`}
                      >
                        No major speed issues detected
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-t border-[#dddddd]" />
                  <p className="text-sm text-[#52525b]">
                    Check your PDF report for detailed recommendations.
                  </p>
                </>
              ))}
          </PillarSection>

          <PillarSection title="Security" narrative={securityNarrative}>
            {result.security.grade !== 'N/A' &&
              (securityIssues.length > 0 ? (
                <TopIssuesList items={securityIssues} dotVariant="red" />
              ) : (
                <>
                  <div className="border-t border-[#dddddd]" />
                  <div className="flex flex-col gap-2">
                    <p
                      className={`${inter.className} text-lg font-semibold leading-[1.5] tracking-[-0.18px] text-[#232521] md:text-xl md:tracking-[-0.2px]`}
                    >
                      All clear
                    </p>
                    <div className="flex items-center gap-2">
                      <IssueDot variant="green" />
                      <span
                        className={`${inter.className} text-sm leading-[1.5] tracking-[-0.14px] text-[#232521]`}
                      >
                        Your site passed our security checks
                      </span>
                    </div>
                  </div>
                </>
              ))}
          </PillarSection>

          <PillarSection
            title="SEO & AI Visibility"
            narrative={seoNarrative}
          >
            {result.seo.grade !== 'N/A' &&
              (seoIssues.length > 0 ? (
                <TopIssuesList items={seoIssues} dotVariant="amber" />
              ) : (
                <>
                  <div className="border-t border-[#dddddd]" />
                  <div className="flex flex-col gap-2">
                    <p
                      className={`${inter.className} text-lg font-semibold leading-[1.5] tracking-[-0.18px] text-[#232521] md:text-xl md:tracking-[-0.2px]`}
                    >
                      All clear
                    </p>
                    <div className="flex items-center gap-2">
                      <IssueDot variant="green" />
                      <span
                        className={`${inter.className} text-sm leading-[1.5] tracking-[-0.14px] text-[#232521]`}
                      >
                        No major SEO issues detected
                      </span>
                    </div>
                  </div>
                </>
              ))}
          </PillarSection>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onRunAnother}
            className="text-sm text-gray-400 underline transition-colors hover:text-gray-600"
          >
            Run another audit
          </button>
        </div>
      </div>

      {(showSiteFixBar || allHealthy) && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-900 px-6 py-5 shadow-[0px_-4px_24px_rgba(0,0,0,0.25)] md:px-10">
          <div className="mx-auto flex max-w-[1440px] flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
            <div className="flex flex-1 flex-col gap-2">
              {allHealthy && !showSiteFixBar ? (
                <p
                  className={`${schibstedGrotesk.className} text-xl font-extrabold leading-[1.2] text-white md:text-2xl`}
                >
                  Your site is in great shape.
                </p>
              ) : (
                <>
                  <p
                    className={`${schibstedGrotesk.className} text-xl font-extrabold leading-[1.2] text-white md:text-2xl`}
                  >
                    Don&apos;t leave these issues sitting
                  </p>
                  <p className={`${inter.className} text-base leading-[1.5] text-gray-300`}>
                    The Book Service Site Fix tackles these one by one, in
                    priority order.
                  </p>
                </>
              )}
            </div>
            {showSiteFixBar && (
              <button
                type="button"
                onClick={handleViewSiteFixes}
                disabled={!auditLeadId}
                className="min-h-[48px] shrink-0 rounded-full bg-[#2563EB] px-8 py-3 text-base font-semibold uppercase tracking-wide text-white transition-colors hover:bg-[#1D4ED8] disabled:cursor-not-allowed disabled:bg-gray-600 disabled:opacity-70 md:w-auto"
              >
                View my site fixes
              </button>
            )}
          </div>
        </div>
      )}
    </div>

    <SiteFixBottomSheet
      sku={null}
      skus={derivePreSelectedSkus(gradeSnapshot)}
      open={sheetOpen}
      onClose={handleCloseSheet}
      onConfirm={handleConfirm}
      isLoading={isCheckoutLoading}
      error={checkoutError}
    />
    </>
  );
}
