'use client';

import { useMemo, useState } from 'react';

import {
  ActiveSiteFixesCard,
  type FixSession,
} from '@/components/dashboard/ActiveSiteFixesCard';
import { SiteFixDetailModal } from '@/components/dashboard/SiteFixDetailModal';
import { ClientUpdatesFeed } from '@/components/dashboard/ClientUpdatesFeed';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';
import { DeliverablesModule } from '@/components/dashboard/DeliverablesModule';
import {
  MilestoneTimeline,
  parseMilestoneTimelineProps,
} from '@/components/dashboard/MilestoneTimeline';
import { RightColumnSidebar } from '@/components/dashboard/RightColumnSidebar';
import { SupportContactModule } from '@/components/dashboard/SupportContactModule';
import WhileYouWaitCard from '@/components/dashboard/WhileYouWaitCard';
import { PreviewBanner } from '@/components/preview/PreviewBanner';
import {
  CLIENT_FIXTURE_ACTIVE,
  CLIENT_FIXTURE_DELIVERED,
  CLIENT_FIXTURE_EMPTY,
  getClientEmptyFixtureContext,
  toClientDashboardFixture,
} from '@/app/(admin)/preview/_fixtures/client';
import type { ClientDashboardPreviewFixture } from '@/lib/preview/fixtures';
import { SUPPORT_EMAIL } from '@/lib/config';
import type { SiteFixEntitlement } from '@/lib/types/client-context';

export type ClientHomePreviewState = 'active' | 'delivered' | 'empty';

type ClientHomePreviewShellProps = {
  state: ClientHomePreviewState;
  designQuestion?: string;
};

function areAllPurchasedPillarsDone(
  session: FixSession,
  entitlements: SiteFixEntitlement[]
): boolean {
  const pillarKeys: Array<'speed' | 'security' | 'seo'> =
    entitlements.length === 0
      ? ['speed', 'security', 'seo']
      : entitlements.map((entitlement) =>
          entitlement === 'speed'
            ? 'speed'
            : entitlement === 'security'
              ? 'security'
              : 'seo'
        );

  return pillarKeys.every((key) => session.fixProgress[key].status === 'done');
}

function resolveFixture(state: ClientHomePreviewState): ClientDashboardPreviewFixture | null {
  if (state === 'active') {
    return toClientDashboardFixture(CLIENT_FIXTURE_ACTIVE);
  }

  if (state === 'delivered') {
    return toClientDashboardFixture(CLIENT_FIXTURE_DELIVERED);
  }

  return null;
}

function ClientHomePreviewLayout({
  fixture,
  designQuestion,
  showWhileYouWait,
}: {
  fixture: ClientDashboardPreviewFixture | null;
  designQuestion?: string;
  showWhileYouWait: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  const emptyContext = getClientEmptyFixtureContext();
  const context = fixture?.context ?? emptyContext;
  const fixSession = fixture?.fixSession ?? null;
  const siteFix = fixture?.siteFix ?? null;
  const fixUpdates = fixture?.fixUpdates ?? [];

  const firstName = context.fullName.split(' ')[0] || 'there';
  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const milestoneTimelineProps = parseMilestoneTimelineProps({
    siteFix,
    deliveryStatus: fixSession?.deliveryStatus ?? null,
    allPillarsDone:
      fixSession != null ? areAllPurchasedPillarsDone(fixSession, context.entitlements) : false,
  });

  return (
    <>
      <PreviewBanner designQuestion={designQuestion} />
      <main className="min-h-[calc(100vh-120px)] rounded-t-2xl bg-white p-5 pb-24 md:p-6 lg:p-6 lg:pb-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[381px_1fr_381px]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-base leading-[1.5] text-zinc-600 lg:text-lg">{formattedDate}</p>
              <h1 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.28px] text-gray-950 md:text-[30px] md:tracking-[-0.3px] lg:text-[32px] lg:tracking-[-0.32px]">
                {greeting} {firstName}
              </h1>
            </div>
            <SupportContactModule />
          </div>

          <div className="flex flex-col gap-4">
            {fixSession == null ? (
              <DashboardEmptyState
                headline="We're getting your project set up"
                body="Your fix session will appear here shortly. If it's been more than 24 hours, reach out to us."
                cta={{ label: 'Contact support', href: `mailto:${SUPPORT_EMAIL}`, variant: 'secondary' }}
              />
            ) : (
              <>
                <h2 className="text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]">
                  Active site fixes
                </h2>

                <MilestoneTimeline {...milestoneTimelineProps} />

                <ClientUpdatesFeed userId={context.userId} previewUpdates={fixUpdates} />

                <ActiveSiteFixesCard
                  session={fixSession}
                  businessName={context.businessName}
                  packageLabel={context.packageLabel}
                  entitlements={context.entitlements}
                  showPackageFallback={false}
                  onViewDetails={() => setModalOpen(true)}
                />

                <DeliverablesModule
                  reportUrl={fixSession.reportUrl}
                  loomUrl={fixSession.loomUrl}
                  deliveryStatus={fixSession.deliveryStatus}
                />

                {showWhileYouWait && <WhileYouWaitCard />}
              </>
            )}
          </div>

          <div>
            <RightColumnSidebar
              deliveryStatus={fixSession?.deliveryStatus ?? null}
              googleReviewUrl={fixSession?.googleReviewUrl ?? null}
              userId={context.userId}
            />
          </div>
        </div>

        {fixSession != null && (
          <SiteFixDetailModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            session={fixSession}
            businessName={context.businessName}
            packageLabel={context.packageLabel}
            entitlements={context.entitlements}
          />
        )}
      </main>
    </>
  );
}

export function ClientHomePreviewShell({ state, designQuestion }: ClientHomePreviewShellProps) {
  const fixture = useMemo(() => resolveFixture(state), [state]);

  return (
    <ClientHomePreviewLayout
      fixture={fixture}
      designQuestion={designQuestion}
      showWhileYouWait={state === 'active'}
    />
  );
}
