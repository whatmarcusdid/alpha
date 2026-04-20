'use client';

import { useState } from 'react';
import { Inter, Manrope, Schibsted_Grotesk } from 'next/font/google';
import type { AuditResult } from '@/lib/types/audit';
import { getResultsHeadline } from '@/lib/types/audit';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const schibstedGrotesk = Schibsted_Grotesk({
  subsets: ['latin'],
  weight: ['800'],
  display: 'swap',
});

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['800'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
});

export interface AuditResultsProps {
  result: AuditResult;
  firstName: string;
  onRunAnother: () => void;
}

function gradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return '#16a34a';
    case 'B':
      return '#65a30d';
    case 'C':
      return '#d97706';
    case 'D':
      return '#ea580c';
    case 'F':
      return '#dc2626';
    default:
      return '#6b7280';
  }
}

export function AuditResults({
  result,
  firstName,
  onRunAnother,
}: AuditResultsProps) {
  const displayHost = result.websiteUrl
    .replace(/^https?:\/\//i, '')
    .toUpperCase();

  const pricingUrl = process.env.NEXT_PUBLIC_PRICING_URL ?? '#';

  const speedDescriptor = `Score: ${result.speedScore}/100`;
  const securityDescriptor =
    result.securityGrade === 'F'
      ? 'Site is flagged as unsafe'
      : result.securityFlags.length === 0
      ? '0 flags found'
      : `${result.securityFlags.length} flag${result.securityFlags.length === 1 ? '' : 's'} found`;
  const uxDescriptor =
    result.uxGrade === 'N/A'
      ? 'Score unavailable'
      : `Score: ${result.uxScore}/9`;

  const [activeTab, setActiveTab] = useState<'speed' | 'security' | 'ux'>('speed');

  return (
    <div className="flex min-h-screen flex-col bg-white">
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

      <div className="mx-auto w-full max-w-4xl px-6 pb-32 pt-10">
        <p className="mb-2 text-lg font-semibold uppercase leading-relaxed tracking-widest bg-[linear-gradient(270deg,#0284C7_0%,#4F46E5_100%)] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]">
          GENIE SITE AUDIT • {displayHost}
        </p>

        <h1 className={`${schibstedGrotesk.className} mb-8 max-w-3xl text-5xl font-extrabold leading-[1.2] tracking-[-0.48px] text-[#171544]`}>
          {getResultsHeadline(firstName, {
            speedGrade: result.speedGrade,
            securityGrade: result.securityGrade,
            uxGrade: result.uxGrade,
          })}
        </h1>

        {[result.speedGrade, result.securityGrade, result.uxGrade].some(g => g === 'F') &&
          result.securityGrade === 'F' && (
          <Alert
            className="mb-8 border-red-200 bg-red-50 text-red-900"
          >
            <AlertTitle className="text-base font-bold text-red-900">
              Your site is currently flagged as unsafe.
            </AlertTitle>
            <AlertDescription className="mt-1 text-base leading-relaxed text-red-800">
              Google and other browsers may be showing a warning to anyone who visits
              your site right now — before they ever see your page. This isn&apos;t a
              design issue or a slow load. Your site has been identified as potentially
              harmful and needs to be addressed immediately.
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {/* Speed card/tab */}
          <button
            type="button"
            onClick={() => setActiveTab('speed')}
            className={`flex min-h-[80px] sm:min-h-[130px] w-full items-center gap-4 rounded-xl border-2 p-4 sm:p-5 text-left transition-colors ${
              activeTab === 'speed'
                ? 'border-[#171544] bg-white'
                : 'border-[#dadada] bg-white hover:border-gray-300'
            }`}
          >
            {result.speedGrade === 'N/A' ? (
              <div className="w-[48px] sm:w-[58px] shrink-0 flex items-center justify-center">
                <div className="h-1 w-8 rounded-full bg-gray-300" />
              </div>
            ) : (
              <div
                className={`${schibstedGrotesk.className} w-[48px] sm:w-[58px] shrink-0 text-[64px] sm:text-[80px] font-extrabold leading-[1.2] tracking-[-0.8px]`}
                style={{ color: gradeColor(result.speedGrade) }}
              >
                {result.speedGrade}
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={`${inter.className} text-sm sm:text-base font-semibold uppercase leading-[1.5] text-[#545552]`}>Speed</span>
              <span className={`${inter.className} text-[13px] sm:text-[14px] font-medium leading-[1.2] tracking-[-0.14px] text-[#545552]`}>{speedDescriptor}</span>
            </div>
          </button>

          {/* Security card/tab */}
          <button
            type="button"
            onClick={() => setActiveTab('security')}
            className={`flex min-h-[80px] sm:min-h-[130px] w-full items-center gap-4 rounded-xl border-2 p-4 sm:p-5 text-left transition-colors ${
              activeTab === 'security'
                ? 'border-[#171544] bg-white'
                : 'border-[#dadada] bg-white hover:border-gray-300'
            }`}
          >
            {result.securityGrade === 'N/A' ? (
              <div className="w-[48px] sm:w-[58px] shrink-0 flex items-center justify-center">
                <div className="h-1 w-8 rounded-full bg-gray-300" />
              </div>
            ) : (
              <div
                className={`${schibstedGrotesk.className} w-[48px] sm:w-[58px] shrink-0 text-[64px] sm:text-[80px] font-extrabold leading-[1.2] tracking-[-0.8px]`}
                style={{ color: gradeColor(result.securityGrade) }}
              >
                {result.securityGrade}
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={`${inter.className} text-sm sm:text-base font-semibold uppercase leading-[1.5] text-[#545552]`}>Security</span>
              <span className={`${inter.className} text-[13px] sm:text-[14px] font-medium leading-[1.2] tracking-[-0.14px] text-[#545552]`}>{securityDescriptor}</span>
            </div>
          </button>

          {/* UX card/tab */}
          <button
            type="button"
            onClick={() => setActiveTab('ux')}
            className={`flex min-h-[80px] sm:min-h-[130px] w-full items-center gap-4 rounded-xl border-2 p-4 sm:p-5 text-left transition-colors ${
              activeTab === 'ux'
                ? 'border-[#171544] bg-white'
                : 'border-[#dadada] bg-white hover:border-gray-300'
            }`}
          >
            {result.uxGrade === 'N/A' ? (
              <div className="w-[48px] sm:w-[58px] shrink-0 flex items-center justify-center">
                <div className="h-1 w-8 rounded-full bg-gray-300" />
              </div>
            ) : (
              <div
                className={`${schibstedGrotesk.className} w-[48px] sm:w-[58px] shrink-0 text-[64px] sm:text-[80px] font-extrabold leading-[1.2] tracking-[-0.8px]`}
                style={{ color: gradeColor(result.uxGrade) }}
              >
                {result.uxGrade}
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className={`${inter.className} text-sm sm:text-base font-semibold uppercase leading-[1.5] text-[#545552]`}>First-Impression UX</span>
              <span className={`${inter.className} text-[13px] sm:text-[14px] font-medium leading-[1.2] tracking-[-0.14px] text-[#545552]`}>{uxDescriptor}</span>
            </div>
          </button>
        </div>

        <div className="mb-16">
          {/* On md+ show all three columns. On mobile/tablet show only the active tab. */}
          <div className="hidden md:grid md:grid-cols-3 md:gap-8">
            {/* Speed column */}
            <div>
              <h2 className={`${manrope.className} mb-3 text-2xl font-extrabold leading-[1.2] tracking-[-0.24px] text-[#232521]`}>Speed</h2>
              <p className={`${inter.className} mb-4 text-lg font-normal leading-[1.5] text-[#232521]`}>{result.aiNarrative.speed}</p>
              {result.speedTopIssues.length > 0 ? (
                <>
                  <div className="mb-4 border-t border-gray-100" />
                  <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>Top issues found</p>
                  <ul className="flex flex-col gap-[6px]">
                    {result.speedTopIssues.map((issue, i) => (
                      <li key={`speed-top-${i}`} className="mt-1 flex items-start gap-2 first:mt-0">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                        <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>{issue}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : result.speedScore >= 90 ? (
                <>
                  <div className="mb-4 border-t border-gray-100" />
                  <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>All clear</p>
                  <ul className="flex flex-col gap-[6px]">
                    <li className="mt-1 flex items-start gap-2 first:mt-0">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                      <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>No major speed issues detected</span>
                    </li>
                  </ul>
                </>
              ) : (
                <>
                  <div className="mb-4 border-t border-gray-100" />
                  <p className="text-sm text-gray-500">Check your PDF report for detailed recommendations.</p>
                </>
              )}
            </div>
            {/* Security column */}
            <div>
              <h2 className={`${manrope.className} mb-3 text-2xl font-extrabold leading-[1.2] tracking-[-0.24px] text-[#232521]`}>Security</h2>
              <p className={`${inter.className} mb-4 text-lg font-normal leading-[1.5] text-[#232521]`}>{result.aiNarrative.security}</p>
              <div className="mb-4 border-t border-gray-100" />
              {result.securityFlags.length === 0 ? (
                <>
                  <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>All clear</p>
                  <ul className="flex flex-col gap-[6px]">
                    {['No malware detected', 'No blacklist hits', 'SSL valid'].map((line) => (
                      <li key={line} className="mt-1 flex items-start gap-2 first:mt-0">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                        <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>{line}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>Issues found</p>
                  <ul className="flex flex-col gap-[6px]">
                    {result.securityFlags.map((flag) => (
                      <li key={flag} className="mt-1 flex items-start gap-2 first:mt-0">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                        <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>{flag}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
            {/* UX column */}
            <div>
              <h2 className={`${manrope.className} mb-3 text-2xl font-extrabold leading-[1.2] tracking-[-0.24px] text-[#232521]`}>First-Impression UX</h2>
              <p className={`${inter.className} mb-4 text-lg font-normal leading-[1.5] text-[#232521]`}>{result.aiNarrative.ux}</p>
              {result.uxGrade !== 'N/A' && (
                <>
                  <div className="mb-4 border-t border-gray-100" />
                  {result.uxFailingSignals.length > 0 ? (
                    <>
                      <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>Top issues found</p>
                      <ul className="flex flex-col gap-[6px]">
                        {result.uxFailingSignals.map((signal) => (
                          <li key={signal} className="mt-1 flex items-start gap-2 first:mt-0">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${result.uxGrade === 'D' || result.uxGrade === 'F' ? 'bg-red-500' : 'bg-amber-400'}`} />
                            <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>{signal}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <>
                      <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>All clear</p>
                      <ul className="flex flex-col gap-[6px]">
                        <li className="mt-1 flex items-start gap-2 first:mt-0">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                          <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>First impression looks strong for a new visitor</span>
                        </li>
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile/tablet: single active tab content */}
          <div className="md:hidden">
            {activeTab === 'speed' && (
              <div>
                <h2 className={`${manrope.className} mb-3 text-2xl font-extrabold leading-[1.2] tracking-[-0.24px] text-[#232521]`}>Speed</h2>
                <p className={`${inter.className} mb-4 text-lg font-normal leading-[1.5] text-[#232521]`}>{result.aiNarrative.speed}</p>
                {result.speedTopIssues.length > 0 ? (
                  <>
                    <div className="mb-4 border-t border-gray-100" />
                    <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>Top issues found</p>
                    <ul className="flex flex-col gap-[6px]">
                      {result.speedTopIssues.map((issue, i) => (
                        <li key={`speed-mob-${i}`} className="mt-1 flex items-start gap-2 first:mt-0">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                          <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>{issue}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : result.speedScore >= 90 ? (
                  <>
                    <div className="mb-4 border-t border-gray-100" />
                    <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>All clear</p>
                    <ul className="flex flex-col gap-[6px]">
                      <li className="mt-1 flex items-start gap-2 first:mt-0">
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                        <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>No major speed issues detected</span>
                      </li>
                    </ul>
                  </>
                ) : (
                  <>
                    <div className="mb-4 border-t border-gray-100" />
                    <p className="text-sm text-gray-500">Check your PDF report for detailed recommendations.</p>
                  </>
                )}
              </div>
            )}
            {activeTab === 'security' && (
              <div>
                <h2 className={`${manrope.className} mb-3 text-2xl font-extrabold leading-[1.2] tracking-[-0.24px] text-[#232521]`}>Security</h2>
                <p className={`${inter.className} mb-4 text-lg font-normal leading-[1.5] text-[#232521]`}>{result.aiNarrative.security}</p>
                <div className="mb-4 border-t border-gray-100" />
                {result.securityFlags.length === 0 ? (
                  <>
                    <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>All clear</p>
                    <ul className="flex flex-col gap-[6px]">
                      {['No malware detected', 'No blacklist hits', 'SSL valid'].map((line) => (
                        <li key={line} className="mt-1 flex items-start gap-2 first:mt-0">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                          <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <>
                    <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>Issues found</p>
                    <ul className="flex flex-col gap-[6px]">
                      {result.securityFlags.map((flag) => (
                        <li key={flag} className="mt-1 flex items-start gap-2 first:mt-0">
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />
                          <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            )}
            {activeTab === 'ux' && (
              <div>
                <h2 className={`${manrope.className} mb-3 text-2xl font-extrabold leading-[1.2] tracking-[-0.24px] text-[#232521]`}>First-Impression UX</h2>
                <p className={`${inter.className} mb-4 text-lg font-normal leading-[1.5] text-[#232521]`}>{result.aiNarrative.ux}</p>
                {result.uxGrade !== 'N/A' && (
                  <>
                    <div className="mb-4 border-t border-gray-100" />
                    {result.uxFailingSignals.length > 0 ? (
                      <>
                        <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>Top issues found</p>
                        <ul className="flex flex-col gap-[6px]">
                          {result.uxFailingSignals.map((signal) => (
                            <li key={signal} className="mt-1 flex items-start gap-2 first:mt-0">
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${result.uxGrade === 'D' || result.uxGrade === 'F' ? 'bg-red-500' : 'bg-amber-400'}`} />
                              <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>{signal}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    ) : (
                      <>
                        <p className={`${inter.className} mb-2 text-lg font-bold leading-[1.5] text-[#232521]`}>All clear</p>
                        <ul className="flex flex-col gap-[6px]">
                          <li className="mt-1 flex items-start gap-2 first:mt-0">
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-green-500" />
                            <span className={`${inter.className} text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#232521]`}>First impression looks strong for a new visitor</span>
                          </li>
                        </ul>
                      </>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onRunAnother}
            className="mt-4 text-sm text-gray-400 underline transition-colors hover:text-gray-600"
          >
            Run another audit
          </button>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white px-6 py-4">
        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={`${schibstedGrotesk.className} text-2xl font-extrabold leading-[1.2] tracking-[-0.24px] text-[#171544]`}>
              {(() => {
                const grades = [result.speedGrade, result.securityGrade, result.uxGrade];
                const allA = grades.every(g => g === 'A');
                const anyF = grades.some(g => g === 'F');
                const anyD = grades.some(g => g === 'D');
                const goodCount = grades.filter(g => g === 'A' || g === 'B').length;
                const singleOutlier = anyD && goodCount === 2;
                if (allA) return 'Keep your site running this way.';
                if (anyF) return 'This is urgent';
                if (singleOutlier) return 'One issue is doing most of the damage.';
                return "Don't leave these issues sitting";
              })()}
            </p>
            <p className={`${inter.className} mt-0.5 text-[15px] font-medium leading-[1.2] tracking-[-0.15px] text-[#545552]`}>
              {(() => {
                const grades = [result.speedGrade, result.securityGrade, result.uxGrade];
                const allA = grades.every(g => g === 'A');
                const anyF = grades.some(g => g === 'F');
                const anyD = grades.some(g => g === 'D');
                const goodCount = grades.filter(g => g === 'A' || g === 'B').length;
                const singleOutlier = anyD && goodCount === 2;
                if (allA) return "The Genie Site Care Plan maintains what's working — so it stays that way.";
                if (anyF) return 'Every day this stays unfixed is another day your site is turning people away.';
                if (singleOutlier) return "The Genie Site Care Plan fixes what's hurting you — and protects what's working.";
                return 'The Genie Site Care Plan handles all of this — and keeps it fixed.';
              })()}
            </p>
          </div>
          <PrimaryButton
            href={pricingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[40px] whitespace-nowrap px-8 py-3 text-sm font-bold uppercase tracking-widest"
          >
            START YOUR SITE CARE PLAN
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
