import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { getPlaybookEntry } from '@/lib/audit/fixPlaybook';
import {
  PILLAR_DISPLAY_ORDER,
  buildFixJobDetailPayload,
  getSignalKeysForPillar,
  shouldShowAwaitingAccessBanner,
  shouldShowCredentialReveal,
  shouldUnmountCredentials,
} from '@/lib/fix-jobs/job-detail-utils';
import type { AuditLeadDoc } from '@/lib/types/audit';
import type { FixJobDetailPayload, FixSessionDoc } from '@/lib/types/fix-session';

function makeAuditLead(): AuditLeadDoc {
  return {
    auditLeadId: 'audit_1',
    firstName: 'Jane',
    businessName: 'Jane Co',
    email: 'jane@example.com',
    websiteUrl: 'https://example.com',
    source: 'public_audit',
    schemaVersion: 'v2',
    timestamp: { toDate: () => new Date() } as never,
    auditStatus: 'completed',
    speedGrade: 'C',
    speedScore: 70,
    speedTopIssues: ['render_blocking_resources'],
    speedNarrative: 'hidden',
    speedStatus: 'completed',
    securityGrade: 'D',
    securityFlags: ['no_https'],
    securityFlagTier: 'tier1',
    securityNarrative: 'hidden',
    securityStatus: 'completed',
    seoGrade: 'B',
    seoScore: 80,
    seoFailingSignals: [],
    seoNarrative: 'hidden',
    seoStatus: 'completed',
  };
}

function makeLegacyDetail(): FixJobDetailPayload {
  const session: FixSessionDoc = {
    orderId: 'order_1',
    auditLeadId: 'audit_1',
  };

  return buildFixJobDetailPayload({
    sessionId: 'order_1',
    uid: 'user_1',
    session,
    userData: {
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      company: {
        legalName: 'Jane Co',
        websiteUrl: 'https://example.com',
      },
      siteFix: {
        entitlements: ['security', 'speed'],
      },
    },
    auditLead: makeAuditLead(),
  });
}

function JobDetailView({ detail }: { detail: FixJobDetailPayload }) {
  const muted = detail.stage === 'awaiting_access';
  const purchasedPillars = PILLAR_DISPLAY_ORDER.filter((pillar) =>
    detail.entitlements.includes(pillar)
  );

  return (
    <div>
      {shouldShowAwaitingAccessBanner(detail.stage) && (
        <div data-testid="awaiting-banner">
          Waiting on customer site access — work is blocked.
        </div>
      )}
      {shouldShowCredentialReveal(detail.stage) && (
        <button type="button">Reveal credentials</button>
      )}
      {purchasedPillars.map((pillar) => {
        const signalKeys = getSignalKeysForPillar(detail.fixProgress, pillar);
        if (signalKeys.length === 0) {
          return (
            <div key={pillar} data-testid={`zero-${pillar}`}>
              ✓ No issues found in this pillar
            </div>
          );
        }

        return (
          <section key={pillar} data-testid={`pillar-${pillar}`} className={muted ? 'opacity-50' : ''}>
            {signalKeys.map((signalKey) => {
              const entry = getPlaybookEntry(signalKey);
              return (
                <article key={signalKey} data-testid={`card-${signalKey}`}>
                  <h3>{entry.title}</h3>
                  <p>{entry.sopReference}</p>
                  <span>{entry.severity}</span>
                  <span>{entry.estimatedMinutes}</span>
                  {entry.steps.map((step) => (
                    <p key={step.id}>{step.instruction}</p>
                  ))}
                  <p>{entry.verification}</p>
                </article>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

describe('Job detail UI helpers', () => {
  it('renders awaiting_access banner when stage is awaiting_access', () => {
    const detail = { ...makeLegacyDetail(), stage: 'awaiting_access' as const };
    const html = renderToStaticMarkup(<JobDetailView detail={detail} />);
    expect(html).toContain('Waiting on customer site access');
  });

  it('renders no credential reveal button in awaiting_access stage', () => {
    const detail = { ...makeLegacyDetail(), stage: 'awaiting_access' as const };
    const html = renderToStaticMarkup(<JobDetailView detail={detail} />);
    expect(html).not.toContain('Reveal credentials');
  });

  it('renders muted cards in awaiting_access stage', () => {
    const detail = {
      ...makeLegacyDetail(),
      stage: 'awaiting_access' as const,
      fixProgress: {
        no_https: {
          status: 'pending' as const,
          completedStepIds: [],
          planSource: 'generic' as const,
        },
      },
    };
    const html = renderToStaticMarkup(<JobDetailView detail={detail} />);
    expect(html).toContain('opacity-50');
  });

  it('renders green zero-signals card for purchased pillar with no fixProgress entries', () => {
    const detail = makeLegacyDetail();
    const html = renderToStaticMarkup(<JobDetailView detail={detail} />);
    expect(html).toContain('✓ No issues found in this pillar');
  });

  it('renders no section for unpurchased pillar', () => {
    const detail = makeLegacyDetail();
    const html = renderToStaticMarkup(<JobDetailView detail={detail} />);
    expect(html).not.toContain('data-testid="pillar-seo_ai_visibility"');
  });

  it('renders all PlaybookEntry fields on a fix card', () => {
    const detail = {
      ...makeLegacyDetail(),
      stage: 'ready' as const,
      fixProgress: {
        no_https: {
          status: 'pending' as const,
          completedStepIds: [],
          planSource: 'generic' as const,
        },
      },
    };
    const entry = getPlaybookEntry('no_https');
    const html = renderToStaticMarkup(<JobDetailView detail={detail} />);
    expect(html).toContain(entry.title);
    expect(html).toContain(entry.sopReference);
    expect(html).toContain(entry.severity);
    expect(html).toContain(String(entry.estimatedMinutes));
    expect(html).toContain(entry.verification);
    for (const step of entry.steps) {
      expect(html).toContain(step.instruction.slice(0, 24));
    }
  });

  it('credential reveal: credentials removed from DOM after 60s (fake timers)', () => {
    vi.useFakeTimers();
    let seconds = 0;
    let visible = true;

    const interval = setInterval(() => {
      seconds += 1;
      if (shouldUnmountCredentials(seconds)) {
        visible = false;
        clearInterval(interval);
      }
    }, 1000);

    vi.advanceTimersByTime(59_000);
    expect(visible).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(visible).toBe(false);
    vi.useRealTimers();
  });

  it('legacy doc without MVP-03 fields renders without crashing', () => {
    expect(() => renderToStaticMarkup(<JobDetailView detail={makeLegacyDetail()} />)).not.toThrow();
  });
});