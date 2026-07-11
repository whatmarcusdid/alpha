'use client';

import { Inter } from 'next/font/google';
import { useRouter } from 'next/navigation';

import {
  derivePreSelectedSkus,
  hasAnyFailingGrade,
  isAllGradesHealthy,
} from '@/lib/book-service/derive-skus';
import { BookServiceHeader } from '@/lib/book-service/BookServiceHeader';
import { storeAuditLeadId } from '@/lib/book-service/storage';
import { ratch } from '@/lib/fonts/ratch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SPEED_ISSUE_DISPLAY_NAMES } from '@/lib/audit/speedTopIssues';
import type { AuditResult, ClientGrade, SecurityFlag } from '@/lib/types/audit';
import { getResultsHeadline } from '@/lib/types/audit';
import {
  SEO_SIGNAL_DISPLAY_NAMES,
  type SeoFailingSignalKey,
} from '@/lib/types/seoSignals';
import { stripMarkdown } from '@/lib/utils/stripMarkdown';

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

const PILLAR_INSIGHTS = {
  speed:
    'When page load time goes from 1s → 5s, bounce rates can jump by 90%—which means fewer people reach your quote/booking step.',
  security:
    'If Google blocklists a site for security issues, it can lose ~95% of organic search traffic—which means fewer "near me" calls until it\'s resolved.',
  seo: 'If Google (and AI assistants) can\'t quickly tell what you do and where you do it, you get skipped—even if you\'re great—because your site isn\'t legible to search and AI systems.',
} as const;

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

function PillarInsightCallout({ children }: { children: string }) {
  return (
    <div className="rounded-lg bg-[#e5e7eb] p-2.5">
      <p
        className={`${inter.className} text-sm font-semibold leading-[1.5] tracking-[-0.14px] text-[#030712]`}
      >
        {children}
      </p>
    </div>
  );
}

function TopIssuesList({
  items,
  dotVariant,
  insight,
}: {
  items: string[];
  dotVariant: 'amber' | 'red';
  insight: string;
}) {
  if (items.length === 0) return null;
  return (
    <>
      <div className="border-t border-[#e5e7eb]" />
      <div className="flex flex-col gap-2">
        <p
          className={`${inter.className} text-xl font-semibold leading-[1.5] tracking-[-0.2px] text-[#030712]`}
        >
          Top issues found
        </p>
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <IssueDot variant={dotVariant} />
              <span
                className={`${inter.className} flex-1 text-sm leading-[1.5] tracking-[-0.14px] text-[#030712]`}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <PillarInsightCallout>{insight}</PillarInsightCallout>
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
    <div className="flex h-[124px] w-full items-center gap-4 rounded-xl border-2 border-[#e5e7eb] bg-white p-5 md:flex-1">
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
      <div className="flex min-w-0 flex-1 flex-col gap-2 leading-[1.5] text-[#52525b]">
        <span className={`${inter.className} text-base font-semibold`}>
          {label}
        </span>
        <span className={`${inter.className} text-sm tracking-[-0.14px]`}>
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
          className={`${ratch.className} text-2xl font-bold leading-[1.2] tracking-[-0.24px] text-[#030712]`}
        >
          {title}
        </h2>
        <p className={`${inter.className} text-lg leading-[1.5] text-[#52525b]`}>
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
  const router = useRouter();
  const auditLeadId = result.auditLeadId;

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
    const skus = derivePreSelectedSkus(gradeSnapshot);
    router.push(`/book-service/select?skus=${skus.join(',')}`);
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
    <div className={`${inter.className} flex min-h-screen flex-col bg-white`}>
      <BookServiceHeader variant="bar" />

      <div
        className={`mx-auto flex w-full flex-1 flex-col items-center gap-16 px-8 ${stickyBarPadding} pt-10 md:px-16 lg:px-[140px]`}
      >
        <div className="flex w-full flex-col gap-10 lg:w-[800px]">
          <div className="flex flex-col gap-3">
            <p className="text-base font-semibold leading-[1.5] text-[#2920a5]">
              Site Audit • {displayHost}
            </p>
            <h1
              className={`${ratch.className} text-[36px] font-bold leading-[1.2] tracking-[-0.36px] text-[#0c0a28] md:text-[44px] md:tracking-[-0.44px] lg:text-[52px] lg:tracking-[-0.52px]`}
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
              label="Speed"
              descriptor={speedDescriptor}
            />
            <GradeCard
              grade={result.security.grade}
              label="Security"
              descriptor={securityDescriptor}
            />
            <GradeCard
              grade={result.seo.grade}
              label="SEO & AI Visibility"
              descriptor={seoDescriptor}
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-12 md:flex-row md:gap-6 lg:w-[800px] lg:gap-12">
          <PillarSection title="Speed" narrative={speedNarrative}>
            {result.speed.grade !== 'N/A' &&
              (speedIssues.length > 0 ? (
                <TopIssuesList
                  items={speedIssues}
                  dotVariant="amber"
                  insight={PILLAR_INSIGHTS.speed}
                />
              ) : result.speed.score >= 90 ? (
                <>
                  <div className="border-t border-[#e5e7eb]" />
                  <div className="flex flex-col gap-2">
                    <p
                      className={`${inter.className} text-xl font-semibold leading-[1.5] tracking-[-0.2px] text-[#030712]`}
                    >
                      All clear
                    </p>
                    <div className="flex items-center gap-2">
                      <IssueDot variant="green" />
                      <span
                        className={`${inter.className} text-sm leading-[1.5] tracking-[-0.14px] text-[#030712]`}
                      >
                        No major speed issues detected
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="border-t border-[#e5e7eb]" />
                  <p className="text-sm text-[#52525b]">
                    Check your PDF report for detailed recommendations.
                  </p>
                </>
              ))}
          </PillarSection>

          <PillarSection title="Security" narrative={securityNarrative}>
            {result.security.grade !== 'N/A' &&
              (securityIssues.length > 0 ? (
                <TopIssuesList
                  items={securityIssues}
                  dotVariant="red"
                  insight={PILLAR_INSIGHTS.security}
                />
              ) : (
                <>
                  <div className="border-t border-[#e5e7eb]" />
                  <div className="flex flex-col gap-2">
                    <p
                      className={`${inter.className} text-xl font-semibold leading-[1.5] tracking-[-0.2px] text-[#030712]`}
                    >
                      All clear
                    </p>
                    <div className="flex items-center gap-2">
                      <IssueDot variant="green" />
                      <span
                        className={`${inter.className} text-sm leading-[1.5] tracking-[-0.14px] text-[#030712]`}
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
                <TopIssuesList
                  items={seoIssues}
                  dotVariant="amber"
                  insight={PILLAR_INSIGHTS.seo}
                />
              ) : (
                <>
                  <div className="border-t border-[#e5e7eb]" />
                  <div className="flex flex-col gap-2">
                    <p
                      className={`${inter.className} text-xl font-semibold leading-[1.5] tracking-[-0.2px] text-[#030712]`}
                    >
                      All clear
                    </p>
                    <div className="flex items-center gap-2">
                      <IssueDot variant="green" />
                      <span
                        className={`${inter.className} text-sm leading-[1.5] tracking-[-0.14px] text-[#030712]`}
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
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#e5e7eb] bg-white px-6 py-5 shadow-[0px_-1px_20px_rgba(85,85,85,0.1)] md:px-10">
          <div className="mx-auto flex max-w-[1440px] flex-col items-stretch gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
            <div className="flex flex-1 flex-col gap-2">
              {allHealthy && !showSiteFixBar ? (
                <p
                  className={`${ratch.className} text-2xl font-bold leading-[1.2] tracking-[-0.24px] text-[#0c0a28]`}
                >
                  Your site is in great shape.
                </p>
              ) : (
                <>
                  <p
                    className={`${ratch.className} text-2xl font-bold leading-[1.2] tracking-[-0.24px] text-[#0c0a28]`}
                  >
                    Don&apos;t leave these issues sitting
                  </p>
                  <p
                    className={`${inter.className} text-lg leading-[1.5] text-[#52525b]`}
                  >
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
                className="min-h-[48px] shrink-0 rounded-lg bg-[#2920a5] px-6 py-2.5 text-base font-semibold leading-[1.5] text-white transition-colors hover:bg-[#211880] disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-70 md:w-auto"
              >
                View my site fixes
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
