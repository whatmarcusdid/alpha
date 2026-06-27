'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

import {
  ActiveSiteFixesCard,
  type FixSession,
} from '@/components/dashboard/ActiveSiteFixesCard';
import { AccessRequestCard } from '@/components/dashboard/AccessRequestCard';
import { ClientUpdatesFeed } from '@/components/dashboard/ClientUpdatesFeed';
import { DeliverablesModule } from '@/components/dashboard/DeliverablesModule';
import {
  MilestoneTimeline,
  parseMilestoneTimelineProps,
} from '@/components/dashboard/MilestoneTimeline';
import { OnboardingChecklist } from '@/components/dashboard/OnboardingChecklist';
import { RightColumnSidebar } from '@/components/dashboard/RightColumnSidebar';
import { SupportContactModule } from '@/components/dashboard/SupportContactModule';
import { PreviewStateSelector } from '@/components/admin/PreviewStateSelector';
import {
  CLIENT_PREVIEW_STATE_OPTIONS,
  getClientDashboardFixture,
  type ClientDashboardPreviewFixture,
} from '@/lib/preview/fixtures';
import type { SiteFixEntitlement } from '@/lib/types/client-context';

const PREVIEW_BASE_PATH = '/admin/preview/client-dashboard';

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

function ClientDashboardPreviewContent({ fixture }: { fixture: ClientDashboardPreviewFixture }) {
  const { context, fixSession, siteFix, fixUpdates } = fixture;

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
    deliveryStatus: fixSession.deliveryStatus,
    allPillarsDone: areAllPurchasedPillarsDone(fixSession, context.entitlements),
  });

  return (
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
          {fixSession.onboarding != null && (
            <OnboardingChecklist onboarding={fixSession.onboarding} />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-gray-950 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]">
            Active site fixes
          </h2>

          <MilestoneTimeline {...milestoneTimelineProps} />

          {fixSession.accessStatus != null && (
            <AccessRequestCard
              accessStatus={fixSession.accessStatus}
              orderId={fixSession.orderId}
            />
          )}

          <ClientUpdatesFeed userId={context.userId} previewUpdates={fixUpdates} />

          <ActiveSiteFixesCard
            session={fixSession}
            businessName={context.businessName}
            packageLabel={context.packageLabel}
            entitlements={context.entitlements}
            showPackageFallback={false}
            onViewDetails={() => undefined}
          />

          <DeliverablesModule
            reportUrl={fixSession.reportUrl}
            loomUrl={fixSession.loomUrl}
            deliveryStatus={fixSession.deliveryStatus}
          />
        </div>

        <div>
          <RightColumnSidebar
            deliveryStatus={fixSession.deliveryStatus}
            googleReviewUrl={fixSession.googleReviewUrl}
            userId={context.userId}
          />
        </div>
      </div>
    </main>
  );
}

function ClientDashboardPreviewRouter() {
  const searchParams = useSearchParams();
  const stateKey = searchParams.get('state') ?? 'awaiting-setup';
  const fixture = getClientDashboardFixture(stateKey);

  return (
    <>
      <PreviewStateSelector
        states={CLIENT_PREVIEW_STATE_OPTIONS}
        currentState={stateKey}
        basePath={PREVIEW_BASE_PATH}
      />
      <ClientDashboardPreviewContent key={stateKey} fixture={fixture} />
    </>
  );
}

export function ClientDashboardPreviewShell() {
  return (
    <Suspense fallback={<div className="py-12 text-zinc-600">Loading preview…</div>}>
      <ClientDashboardPreviewRouter />
    </Suspense>
  );
}
