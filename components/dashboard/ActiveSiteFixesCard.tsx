'use client';

import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ClockIcon } from '@heroicons/react/24/outline';
import { SUPPORT_EMAIL } from '@/lib/config';
import type { SiteFixEntitlement } from '@/lib/types/client-context';
import type { OnboardingData } from '@/lib/types/onboarding';

export type PillarStatus = 'queued' | 'in_progress' | 'done' | 'awaiting_access';

export type PillarProgress = {
  status: PillarStatus;
  description: string | null;
  updatedAt: Date | null;
  completedAt: Date | null;
};

export type FixSession = {
  orderId: string | null;
  accessStatus: 'needed' | 'received' | null;
  deliveryStatus: 'in_progress' | 'delivered' | null;
  estimatedCompletionAt: Date | null;
  reportUrl: string | null;
  loomUrl: string | null;
  googleReviewUrl: string | null;
  onboarding: OnboardingData | null;
  fixProgress: {
    speed: PillarProgress;
    security: PillarProgress;
    seo: PillarProgress;
  };
};

type Props = {
  session: FixSession;
  businessName: string;
  packageLabel: string | null;
  entitlements: SiteFixEntitlement[];
  showPackageFallback?: boolean;
  onViewDetails: () => void;
};

const PILLAR_ORDER = [
  { key: 'speed' as const, label: 'Speed', entitlement: 'speed' as const },
  { key: 'security' as const, label: 'Security', entitlement: 'security' as const },
  { key: 'seo' as const, label: 'SEO and AI visibility', entitlement: 'seo_ai_visibility' as const },
];

const BADGE_STYLES: Record<PillarStatus, { className: string; label: string }> = {
  done: { className: 'text-[#00a63e]', label: 'Done' },
  in_progress: { className: 'text-[#f0b100]', label: 'In Progress' },
  queued: { className: 'text-gray-400', label: 'Queued' },
  awaiting_access: { className: 'text-gray-400', label: 'Awaiting Access' },
};

function getMostRecentUpdatedAt(session: FixSession): Date | null {
  const dates = PILLAR_ORDER.map(({ key }) => session.fixProgress[key].updatedAt).filter(
    (date): date is Date => date != null
  );

  if (dates.length === 0) return null;

  return dates.reduce((latest, current) => (current > latest ? current : latest));
}

function formatHoursAgo(date: Date): string {
  const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));

  if (hours <= 0) return 'Last updated just now';
  if (hours === 1) return 'Last updated 1 hour ago';
  return `Last updated ${hours} hours ago`;
}

function formatEstimatedCompletion(date: Date): string {
  const timeStr = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow =
    date.getDate() === tomorrow.getDate() &&
    date.getMonth() === tomorrow.getMonth() &&
    date.getFullYear() === tomorrow.getFullYear();

  if (isTomorrow) {
    return ` tomorrow by ${timeStr}`;
  }

  const dateStr = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  }).format(date);

  return ` ${dateStr} by ${timeStr}`;
}

function PillarIcon({ status }: { status: PillarStatus }) {
  if (status === 'done') {
    return <CheckCircleIcon className="h-6 w-6 shrink-0 text-[#00a63e]" aria-hidden="true" />;
  }

  if (status === 'in_progress') {
    return (
      <ClockIcon
        className="h-6 w-6 shrink-0 text-[#f0b100] animate-spin"
        aria-hidden="true"
      />
    );
  }

  return <ClockIcon className="h-6 w-6 shrink-0 text-gray-400" aria-hidden="true" />;
}

function getVisiblePillars(entitlements: SiteFixEntitlement[]) {
  if (entitlements.length === 0) {
    return PILLAR_ORDER;
  }

  return PILLAR_ORDER.filter(({ entitlement }) => entitlements.includes(entitlement));
}

export function ActiveSiteFixesCard({
  session,
  businessName,
  packageLabel,
  entitlements,
  showPackageFallback = false,
  onViewDetails,
}: Props) {
  const deliveryStatus = session.deliveryStatus ?? 'in_progress';
  const visiblePillars = getVisiblePillars(entitlements);
  const pillarCount = visiblePillars.length;

  const doneCount = visiblePillars.filter(
    ({ key }) => session.fixProgress[key].status === 'done'
  ).length;

  const lastUpdated = getMostRecentUpdatedAt(session);

  const nonDonePillarLabels = visiblePillars
    .filter(({ key }) => session.fixProgress[key].status !== 'done')
    .map(({ label }) => label.toLowerCase());

  const showFooterInProgress = deliveryStatus === 'in_progress';
  const showFooterDelivered =
    deliveryStatus === 'delivered' && session.reportUrl != null;

  return (
    <div className="rounded-lg border-2 border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-[3px]">
        <h3 className="text-lg font-semibold leading-[1.2] tracking-[-0.18px] text-gray-950 lg:text-xl lg:tracking-[-0.2px]">
          {businessName.trim() || 'Your business'}
        </h3>
        {packageLabel != null && (
          <p className="text-sm tracking-[-0.14px] leading-[1.5] text-zinc-600">{packageLabel}</p>
        )}
        {showPackageFallback && (
          <div className="flex flex-col gap-1">
            <p className="text-sm text-gray-500">Package details pending</p>
            <p className="text-sm text-gray-500">
              Questions?{' '}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-blue-600 hover:text-blue-700">
                Contact us
              </a>
            </p>
          </div>
        )}
        {session.orderId != null && (
          <p className="text-sm tracking-[-0.14px] leading-[1.5] text-zinc-600">
            Site Fix order — #{session.orderId}
          </p>
        )}
        {lastUpdated != null && (
          <p className="text-sm tracking-[-0.14px] leading-[1.5] text-zinc-600">
            {formatHoursAgo(lastUpdated)}
          </p>
        )}
      </div>

      {deliveryStatus === 'in_progress' ? (
        <div className="mt-4 rounded-lg bg-[#dbeafe] p-4">
          <p className="text-sm font-semibold tracking-[-0.14px] leading-[1.5] text-gray-950">
            We&apos;re fixing your website&apos;s {nonDonePillarLabels.join(', ')}
          </p>
          <p className="mt-1 text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-[#1e3a8a] md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]">
            {doneCount} of {pillarCount} fixes done — on track
          </p>
          {session.estimatedCompletionAt != null && (
            <p className="mt-1 text-sm tracking-[-0.14px] leading-[1.5] text-gray-950">
              <span>Estimated finish:</span>
              {formatEstimatedCompletion(session.estimatedCompletionAt)}
            </p>
          )}
        </div>
      ) : (
        <div className="mt-4 rounded-lg bg-green-50 p-4">
          <p className="text-sm font-semibold tracking-[-0.14px] leading-[1.5] text-gray-950">
            Your website&apos;s Speed, Security, and SEO &amp; AI Visibility have been fixed
          </p>
          <p className="mt-1 text-xl font-semibold leading-[1.2] tracking-[-0.2px] text-green-800 md:text-[22px] md:tracking-[-0.22px] lg:text-2xl lg:tracking-[-0.24px]">
            {pillarCount} of {pillarCount} fixes complete
          </p>
        </div>
      )}

      <ul className="mt-4 space-y-0">
        {visiblePillars.map(({ key, label }) => {
          const pillar = session.fixProgress[key];
          const badge = BADGE_STYLES[pillar.status];

          return (
            <li key={key} className="flex items-center gap-3 py-3">
              <PillarIcon status={pillar.status} />
              <span className="flex-1 text-sm tracking-[-0.14px] leading-[1.5] text-gray-950">
                {label}
              </span>
              <span className={`text-sm font-semibold tracking-[-0.14px] leading-[1.5] ${badge.className}`}>
                {badge.label}
              </span>
            </li>
          );
        })}
      </ul>

      {(showFooterInProgress || showFooterDelivered) && (
        <div className="mt-2">
          <button
            type="button"
            onClick={onViewDetails}
            className="text-base font-bold leading-[1.5] text-blue-700 transition-colors hover:text-blue-800"
          >
            {showFooterDelivered ? 'View full report' : 'View details'}
          </button>
        </div>
      )}
    </div>
  );
}
